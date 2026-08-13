import express from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import User from '../models/User.js'
import YouTubeToken from '../models/YouTubeToken.js'
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

function sanitizeRedirect(value) {
  const raw = typeof value === 'string' ? value : ''
  if (!raw.startsWith('/') || raw.length > 200) return '/owner?tab=apiKeys'
  return raw
}

function redirectUrl(status, extra = {}, redirect = '/owner?tab=apiKeys') {
  const params = new URLSearchParams({ youtube: status, ...extra })
  if (!redirect.includes('tab=')) params.set('tab', redirect.startsWith('/settings') ? 'youtube' : 'apiKeys')
  return `${FRONTEND_URL}${redirect}${redirect.includes('?') ? '&' : '?'}${params.toString()}`
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
  let redirect = '/owner?tab=apiKeys'
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET)
    userId = decoded.userId
    redirect = sanitizeRedirect(decoded.redirect || redirect)
  } catch (err) {
    return res.redirect(redirectUrl('error', { message: `invalid_state: ${err.message}` }, redirect))
  }

  if (!userId) {
    return res.redirect(redirectUrl('error', { message: 'missing_user_id_in_state' }, redirect))
  }

  try {
    const clientId = await getProviderKey('youtube_oauth', userId)
    const clientSecret = await getProviderKey('youtube_secret', userId)
    if (!clientId || !clientSecret) {
      return res.redirect(redirectUrl('error', { message: 'oauth_credentials_not_configured' }, redirect))
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
      return res.redirect(redirectUrl('error', { message: 'no_access_token_from_google' }, redirect))
    }

    let email = ''
    let channelId = ''
    let channelTitle = ''
    try {
      const userInfoRes = await axios.get(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
      })
      email = userInfoRes.data?.email || ''
    } catch (err) {
      log('callback_userinfo_warn', googleErrorPayload(err))
    }

    try {
      const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'snippet', mine: true },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
      })
      const item = channelRes.data?.items?.[0]
      channelId = item?.id || ''
      channelTitle = item?.snippet?.title || ''
    } catch (err) {
      log('callback_channel_warn', googleErrorPayload(err))
    }

    await YouTubeToken.setTokens(userId, {
      accessToken,
      refreshToken,
      scope: tokenRes.data?.scope ? String(tokenRes.data.scope).split(' ') : ['https://www.googleapis.com/auth/youtube'],
      channelId,
      channelTitle,
      expiresAt: tokenRes.data?.expires_in ? new Date(Date.now() + tokenRes.data.expires_in * 1000) : null,
    })

    // [v9.9.19.17.4] tokens live in YouTubeToken (encrypted); clear legacy plaintext fields
    await User.findByIdAndUpdate(userId, { ytRefreshToken: '', ytEmail: '' }).catch(() => {})

    log('callback_ok', { userId, email, channelId, has_refresh: !!refreshToken })
    return res.redirect(redirectUrl('success', { email, channel: channelTitle, has_refresh: String(!!refreshToken) }, redirect))
  } catch (err) {
    const payload = googleErrorPayload(err)
    log('callback_fail', { userId, code: payload.code, msg: payload.message })
    return res.redirect(redirectUrl('error', { message: payload.message, code: payload.code || '' }, redirect))
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

// [v9.9.19.17.4] YouTube OAuth connect for owner/admin/creator (per-user tokens)
router.get('/auth-url', requireRole('owner', 'admin', 'creator'), async (req, res) => {
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

    const redirect = sanitizeRedirect(req.query.redirect)
    const state = jwt.sign({ userId, redirect }, process.env.JWT_SECRET, { expiresIn: '10m' })
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
    return res.json({ success: true, url: authUrl, authUrl })
  } catch (err) {
    log('auth_url_fail', { msg: err.message })
    return res.status(500).json({ success: false, error: 'auth_url_generation_failed' })
  }
})

router.get('/status', requireRole('owner', 'admin', 'creator'), async (req, res) => {
  try {
    const yt = await YouTubeToken.getTokens(req.user.id)
    if (!yt) return res.json({ success: true, connected: false })
    return res.json({
      success: true,
      connected: true,
      channelId: yt.channelId,
      channelTitle: yt.channelTitle,
      connectedAt: yt.connectedAt,
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'youtube_status_failed' })
  }
})

router.post('/disconnect', requireRole('owner', 'admin', 'creator'), async (req, res) => {
  try {
    const yt = await YouTubeToken.getTokens(req.user.id)
    if (!yt) return res.json({ success: true, disconnected: true })

    // [v9.9.19.17.4] revoke grant at Google, then remove stored tokens
    try {
      const revokeToken = yt.refreshToken || yt.accessToken
      if (revokeToken) {
        await axios.post('https://oauth2.googleapis.com/revoke', null, {
          params: { token: revokeToken },
          timeout: 15000,
        })
      }
    } catch (err) {
      log('disconnect_revoke_warn', googleErrorPayload(err))
    }

    await YouTubeToken.deleteForUser(req.user.id)
    await User.findByIdAndUpdate(req.user.id, { ytRefreshToken: '', ytEmail: '' }).catch(() => {})
    return res.json({ success: true, disconnected: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'youtube_disconnect_failed' })
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

    let refreshToken = ''
    const yt = await YouTubeToken.getTokens(userId)
    if (yt?.refreshToken) {
      refreshToken = yt.refreshToken
    } else {
      const user = await User.findById(userId).select('+ytRefreshToken').lean()
      refreshToken = user?.ytRefreshToken
    }
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

// ============================================================
// [19.17.5-UPLOAD-SCHEDULER] upload / list / delete routes
// Upload/publish/delete only by explicit user action; ownership
// is validated inside the service before any destructive call.
// ============================================================

const ytUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, `yt-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname || '')}`)
})

const YT_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const ytUpload = multer({
  storage: ytUploadStorage,
  limits: { fileSize: 256 * 1024 * 1024 }, // 256MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      const ok = ['image/jpeg', 'image/png'].includes((file.mimetype || '').toLowerCase())
      return cb(ok ? null : new Error('thumbnail_must_be_jpeg_or_png'), ok)
    }
    const ok = YT_VIDEO_MIMES.has((file.mimetype || '').toLowerCase())
    cb(ok ? null : new Error('only_mp4_mov_webm_allowed'), ok)
  }
})

function handleYoutubeRouteError(res, err, context) {
  const payload = googleErrorPayload(err)
  log(`${context}_fail`, { code: err.code || payload.code, msg: err.message })
  if (err.code === 'quota_exceeded') {
    return res.status(429).json({ success: false, error: 'quota_exceeded', message: err.message })
  }
  if (err.code === 'youtube_not_connected') {
    return res.status(400).json({ success: false, error: 'youtube_not_connected', message: err.message })
  }
  if (err.code === 'not_video_owner') {
    return res.status(403).json({ success: false, error: 'not_video_owner', message: 'Видео не принадлежит вашему каналу' })
  }
  if (err.code === 'video_not_found') {
    return res.status(404).json({ success: false, error: 'video_not_found' })
  }
  return res.status(500).json({ success: false, error: payload.message || err.message, code: payload.code || '' })
}

router.post('/upload', requireRole('owner', 'admin', 'creator'), ytUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  const userId = req.user.id
  const videoFile = req.files?.video?.[0]
  const thumbnailFile = req.files?.thumbnail?.[0]

  try {
    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'video_file_required' })
    }

    const { title, description = '', tags = '', privacyStatus = 'private' } = req.body || {}
    // public запрещён до аудита Google
    if (!['private', 'unlisted'].includes(privacyStatus)) {
      return res.status(400).json({ success: false, error: 'invalid_privacy_status', message: 'Разрешены только private или unlisted' })
    }

    const { uploadVideoForUser, setThumbnailForUser } = await import('../services/youtubeService.js')
    const parsedTags = String(tags).split(',').map(t => t.trim()).filter(Boolean)
    const { videoId } = await uploadVideoForUser(userId, videoFile.path, { title, description, tags: parsedTags, privacyStatus })

    let thumbnailSet = false
    if (thumbnailFile) {
      try {
        await setThumbnailForUser(userId, videoId, thumbnailFile.path)
        thumbnailSet = true
      } catch (thumbErr) {
        log('upload_thumbnail_warn', googleErrorPayload(thumbErr))
      }
    }

    log('upload_ok', { userId, videoId, privacyStatus, thumbnailSet })
    return res.json({ success: true, videoId, url: `https://youtu.be/${videoId}`, thumbnailSet })
  } catch (err) {
    return handleYoutubeRouteError(res, err, 'upload')
  } finally {
    for (const f of [videoFile, thumbnailFile]) {
      if (f?.path && fs.existsSync(f.path)) {
        try { fs.unlinkSync(f.path) } catch {}
      }
    }
  }
})

router.get('/videos', requireRole('owner', 'admin', 'creator'), async (req, res) => {
  try {
    const { listVideosForUser } = await import('../services/youtubeService.js')
    const videos = await listVideosForUser(req.user.id)
    return res.json({ success: true, videos })
  } catch (err) {
    return handleYoutubeRouteError(res, err, 'videos')
  }
})

router.delete('/videos/:id', requireRole('owner', 'admin', 'creator'), async (req, res) => {
  try {
    const { deleteVideoForUser } = await import('../services/youtubeService.js')
    const result = await deleteVideoForUser(req.user.id, req.params.id)
    log('delete_ok', { userId: req.user.id, videoId: req.params.id })
    return res.json(result)
  } catch (err) {
    return handleYoutubeRouteError(res, err, 'delete')
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
