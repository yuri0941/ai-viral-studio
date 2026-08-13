import express from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import User from '../models/User.js'
import { protect, requireRole } from '../middleware/auth.js'
import { getProviderKey } from '../services/aiService.js'

const router = express.Router()

const BACKEND_URL = (process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:10000').replace(/\/$/, '')
const YOUTUBE_REDIRECT_URI = `${BACKEND_URL}/api/youtube/callback`
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://aiviral-studio.ru').replace(/\/$/, '')
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const YOUTUBE_UPLOAD_SESSION_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const YOUTUBE_DELETE_URL = 'https://www.googleapis.com/youtube/v3/videos'

function redirectUrl(status, extra = {}) {
  const params = new URLSearchParams({ tab: 'apiKeys', youtube: status, ...extra })
  return `${FRONTEND_URL}/owner?${params.toString()}`
}

function log(step, meta = '') {
  const metaStr = meta && typeof meta === 'object'
    ? Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(' ')
    : String(meta)
  console.log(`[yt:spike] step=${step}${metaStr ? ` ${metaStr}` : ''}`)
}

function googleErrorPayload(err) {
  const status = err.response?.status
  const data = err.response?.data
  const message = data?.error_description || data?.error?.message || data?.error || err.message
  return { code: status || null, message }
}

// Public callback from Google OAuth
router.get('/callback', async (req, res) => {
  const googleError = req.query.error
  if (googleError) {
    log('callback_denied', { error: String(googleError) })
    return res.redirect(redirectUrl('error', { message: `google_oauth_denied: ${String(googleError)}` }))
  }

  const { code, state } = req.query
  if (!code || !state) {
    return res.redirect(redirectUrl('error', { message: 'missing_code_or_state' }))
  }

  let userId
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET)
    userId = decoded.userId
  } catch (err) {
    return res.redirect(redirectUrl('error', { message: `invalid_state: ${err.message}` }))
  }

  if (!userId) {
    return res.redirect(redirectUrl('error', { message: 'missing_user_id_in_state' }))
  }

  try {
    const clientId = await getProviderKey('youtube_oauth', userId)
    const clientSecret = await getProviderKey('youtube_secret', userId)
    if (!clientId || !clientSecret) {
      return res.redirect(redirectUrl('error', { message: 'oauth_credentials_not_configured' }))
    }

    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: YOUTUBE_REDIRECT_URI,
      grant_type: 'authorization_code'
    }, { timeout: 30000 })

    const accessToken = tokenRes.data?.access_token
    const refreshToken = tokenRes.data?.refresh_token

    if (!accessToken) {
      return res.redirect(redirectUrl('error', { message: 'no_access_token_from_google' }))
    }

    let email = ''
    try {
      const userInfoRes = await axios.get(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
      })
      email = userInfoRes.data?.email || ''
    } catch (err) {
      log('callback_userinfo_warn', googleErrorPayload(err))
    }

    await User.findByIdAndUpdate(userId, {
      ytRefreshToken: refreshToken || '',
      ytEmail: email
    })

    log('callback_ok', { userId, email, has_refresh: !!refreshToken })
    return res.redirect(redirectUrl('success', { email, has_refresh: String(!!refreshToken) }))
  } catch (err) {
    const payload = googleErrorPayload(err)
    log('callback_fail', { userId, code: payload.code, msg: payload.message })
    return res.redirect(redirectUrl('error', { message: payload.message, code: payload.code || '' }))
  }
})

// All routes below require authentication
router.use(protect)

// Legacy YouTube Data API routes (unchanged)
router.get('/search', async (req, res) => {
  try {
    const { q, maxResults } = req.query
    if (!q) {
      return res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' })
    }
    const { searchVideos } = await import('../services/youtubeService.js')
    const result = await searchVideos(q, parseInt(maxResults) || 10)
    res.json(result)
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

router.get('/stats/:videoId', async (req, res) => {
  try {
    const { getVideoStats } = await import('../services/youtubeService.js')
    const result = await getVideoStats(req.params.videoId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

router.get('/trending', async (req, res) => {
  try {
    const { region, category } = req.query
    const { getTrending } = await import('../services/youtubeService.js')
    const result = await getTrending(region || 'RU', category)
    res.json(result)
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

router.get('/analyze', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) {
      return res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' })
    }
    const { analyzeNiche } = await import('../services/youtubeService.js')
    const result = await analyzeNiche(q)
    res.json(result)
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

// [v9.9.19.17.1] YouTube OAuth upload spike
router.get('/auth-url', requireRole('owner'), async (req, res) => {
  try {
    const userId = req.user.id
    const clientId = await getProviderKey('youtube_oauth', userId)
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'client_id_not_configured',
        hint: 'Save youtube_oauth in ApiKeysTab'
      })
    }

    const state = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' })
    const authUrl = GOOGLE_AUTH_URL + '?' + new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: YOUTUBE_REDIRECT_URI,
      scope: 'https://www.googleapis.com/auth/youtube',
      access_type: 'offline',
      prompt: 'consent',
      state
    }).toString()

    log('auth_url', { userId })
    return res.json({ success: true, authUrl })
  } catch (err) {
    log('auth_url_fail', { msg: err.message })
    return res.status(500).json({ success: false, error: 'auth_url_generation_failed' })
  }
})

router.post('/spike', requireRole('owner'), async (req, res) => {
  const userId = req.user.id
  let tmpFile = null
  let currentStep = 'start'

  try {
    const clientId = await getProviderKey('youtube_oauth', userId)
    const clientSecret = await getProviderKey('youtube_secret', userId)
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'oauth_credentials_not_configured',
        hint: 'Save youtube_oauth and youtube_secret in ApiKeysTab'
      })
    }

    const user = await User.findById(userId).select('+ytRefreshToken').lean()
    const refreshToken = user?.ytRefreshToken
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'no_refresh_token',
        hint: 'Authorize via /api/youtube/auth-url first'
      })
    }

    log('spike_start', { userId })

    currentStep = 'refresh_token'
    const refreshRes = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }, { timeout: 30000 })
    const accessToken = refreshRes.data?.access_token
    if (!accessToken) {
      throw new Error('no_access_token_in_refresh_response')
    }
    log('spike_token_refreshed')

    currentStep = 'generate_video'
    const ffmpegPath = await import('ffmpeg-static').then(m => m.default || m.path).catch(() => null)
    if (!ffmpegPath) {
      throw new Error('ffmpeg_static_not_found')
    }
    tmpFile = path.join(os.tmpdir(), `yt-spike-${Date.now()}.mp4`)
    await generateTestMp4(ffmpegPath, tmpFile)
    const stats = fs.statSync(tmpFile)
    log('spike_video_generated', { size: stats.size })

    currentStep = 'upload_session'
    const uploadUrl = await createUploadSession(accessToken)
    let host = ''
    try { host = new URL(uploadUrl).hostname } catch {}
    log('spike_upload_session', { host })

    currentStep = 'upload_video'
    const videoBuffer = fs.readFileSync(tmpFile)
    const uploadRes = await axios.put(uploadUrl, videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stats.size
      },
      timeout: 60000
    })
    const videoId = uploadRes.data?.id
    if (!videoId) {
      throw new Error('no_video_id_in_upload_response')
    }
    log('spike_uploaded', { videoId, status: 'uploaded' })

    currentStep = 'delete_video'
    try {
      await axios.delete(YOUTUBE_DELETE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { id: videoId },
        timeout: 30000
      })
      log('spike_deleted', { videoId, deleted: true })
      return res.json({ success: true, videoId, deleted: true })
    } catch (deleteErr) {
      log('spike_delete_skipped', { videoId, reason: deleteErr.message })
      return res.json({
        success: true,
        videoId,
        deleted: false,
        warning: 'удали видео вручную в студии'
      })
    }
  } catch (err) {
    const payload = googleErrorPayload(err)
    log('spike_fail', { step: currentStep, code: payload.code, msg: payload.message })
    return res.status(400).json({
      success: false,
      step: currentStep,
      googleError: payload
    })
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile) } catch {}
    }
  }
})

function generateTestMp4(ffmpegPath, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30:duration=5',
      '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=5',
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', outputPath
    ], { stdio: 'ignore' })
    proc.on('close', code => {
      if (code === 0) return resolve()
      reject(new Error(`ffmpeg_exit_${code}`))
    })
    proc.on('error', reject)
  })
}

async function createUploadSession(accessToken) {
  const res = await axios.post(`${YOUTUBE_UPLOAD_SESSION_URL}?uploadType=resumable&part=snippet,status`, {
    snippet: {
      title: 'AIVIRAL SPIKE TEST',
      description: 'Spike test video',
      categoryId: '22'
    },
    status: { privacyStatus: 'private' }
  }, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })
  const location = res.headers?.location
  if (!location) {
    throw new Error('no_upload_location')
  }
  return location
}

export default router
