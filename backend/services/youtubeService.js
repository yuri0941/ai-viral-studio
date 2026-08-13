import { google } from 'googleapis'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import YouTubeToken from '../models/YouTubeToken.js'
import UploadSession from '../models/UploadSession.js'
import User from '../models/User.js'
import { getProviderKey, generateContent } from './aiService.js'
import { alertOwner } from './ownerBot.js'
import { sendClientMessage } from './omegaBot.js'

const YOUTUBE_API_KEY = 'AIzaSyD1SH9WizR4zgi7JUshXfTuzHsJagmu4zU'
const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY })

// Поиск видео по ключевым словам
export const searchVideos = async (query, maxResults = 10) => {
    try {
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            order: 'viewCount', // по просмотрам
            maxResults,
            publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // за 30 дней
        })
        return {
            success: true,
            videos: response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.high?.url,
                publishedAt: item.snippet.publishedAt,
                channelTitle: item.snippet.channelTitle
            }))
        }
    } catch (error) {
        console.error('YouTube Search Error:', error.message)
        return { success: false, error: error.message }
    }
}

// Получить статистику видео
export const getVideoStats = async (videoId) => {
    try {
        const response = await youtube.videos.list({
            part: 'statistics,snippet,contentDetails',
            id: videoId
        })
        const video = response.data.items[0]
        return {
            success: true,
            stats: {
                title: video.snippet.title,
                views: video.statistics.viewCount,
                likes: video.statistics.likeCount,
                comments: video.statistics.commentCount,
                tags: video.snippet.tags || [],
                duration: video.contentDetails.duration,
                thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url
            }
        }
    } catch (error) {
        console.error('YouTube Stats Error:', error.message)
        return { success: false, error: error.message }
    }
}

// Получить тренды по региону
export const getTrending = async (regionCode = 'RU', categoryId = undefined) => {
    try {
        const params = {
            part: 'snippet,statistics',
            chart: 'mostPopular',
            regionCode,
            maxResults: 10
        }
        if (categoryId) params.videoCategoryId = categoryId

        const response = await youtube.videos.list(params)
        return {
            success: true,
            videos: response.data.items.map(item => ({
                id: item.id,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: item.statistics.viewCount,
                likes: item.statistics.likeCount,
                thumbnail: item.snippet.thumbnails.high?.url
            }))
        }
    } catch (error) {
        console.error('YouTube Trends Error:', error.message)
        return { success: false, error: error.message }
    }
}

// Анализировать топовые видео по ниши и дать рекомендации
export const analyzeNiche = async (query) => {
    const searchResult = await searchVideos(query, 5)
    if (!searchResult.success) return searchResult

    const statsPromises = searchResult.videos.map(v => getVideoStats(v.id))
    const statsResults = await Promise.all(statsPromises)

    const validStats = statsResults.filter(r => r.success).map(r => r.stats)

    // Собираем аналитику
    const analysis = {
        totalViews: validStats.reduce((sum, v) => sum + parseInt(v.views || 0), 0),
        avgViews: Math.round(validStats.reduce((sum, v) => sum + parseInt(v.views || 0), 0) / validStats.length),
        topTags: [...new Set(validStats.flatMap(v => v.tags))].slice(0, 20),
        topTitle: validStats.sort((a, b) => parseInt(b.views) - parseInt(a.views))[0]?.title,
        videoCount: validStats.length
    }

    return {
        success: true,
        analysis,
        videos: validStats
    }
}

// ============================================================
// [19.17.5-UPLOAD-SCHEDULER] OAuth upload/manage section
// Uses per-user YouTubeToken (encrypted) + Google OAuth refresh.
// ============================================================

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const YT_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const YT_API_URL = 'https://www.googleapis.com/youtube/v3'
const YT_THUMBNAIL_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set'

// YouTube Data API quota costs (units per day, default limit 10000)
const QUOTA_DAILY_LIMIT = 10000
export const QUOTA_COSTS = { upload: 1600, delete: 50, list: 1, playlistInsert: 50 }

// [19.17.9-DIRECT-UPLOAD] public/publishAt only after Google audit
export const isYoutubePublicEnabled = () => process.env.ENABLE_YOUTUBE_PUBLIC === 'true'
export const YT_MAX_FILE_SIZE = 20 * 1024 * 1024 * 1024 // 20 GB
const RESUMABLE_CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB (multiple of 256 KB, required by Google)
const RESUMABLE_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // session URI lives ~1 week

function quotaCollection() {
    return mongoose.connection.collection('youtube_quota')
}

function quotaDayKey() {
    return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export async function checkQuota(cost) {
    const day = quotaDayKey()
    const doc = await quotaCollection().findOne({ _id: day })
    const used = doc?.used || 0
    if (used + cost > QUOTA_DAILY_LIMIT) {
        const err = new Error('Квота YouTube API на сегодня исчерпана — повтори после 10:00 МСК')
        err.code = 'quota_exceeded'
        throw err
    }
    return { used, remaining: QUOTA_DAILY_LIMIT - used }
}

export async function trackQuota(cost) {
    const day = quotaDayKey()
    await quotaCollection().updateOne({ _id: day }, { $inc: { used: cost }, $setOnInsert: { alerted80: false } }, { upsert: true })
    const doc = await quotaCollection().findOne({ _id: day })
    const used = doc?.used || cost
    if (used >= QUOTA_DAILY_LIMIT * 0.8 && !doc?.alerted80) {
        await quotaCollection().updateOne({ _id: day }, { $set: { alerted80: true } })
        try {
            alertOwner?.(`⚠️ YouTube API квота: использовано ${used}/${QUOTA_DAILY_LIMIT} единиц (80%+). Лимит сбросится после 10:00 МСК.`)
        } catch { /* алерт не критичен */ }
    }
    return used
}

export async function getAccessTokenForUser(userId) {
    const yt = await YouTubeToken.getTokens(userId)
    if (!yt) {
        const err = new Error('YouTube не подключён: авторизуйся через /api/youtube/auth-url')
        err.code = 'youtube_not_connected'
        throw err
    }

    // Токен ещё валиден (с запасом 60 сек)
    if (yt.accessToken && yt.expiresAt && new Date(yt.expiresAt).getTime() > Date.now() + 60000) {
        return yt.accessToken
    }

    if (!yt.refreshToken) {
        const err = new Error('no_refresh_token')
        err.code = 'youtube_not_connected'
        throw err
    }

    const clientId = await getProviderKey('youtube_oauth', userId)
    const clientSecret = await getProviderKey('youtube_secret', userId)
    if (!clientId || !clientSecret) {
        const err = new Error('oauth_credentials_not_configured')
        err.code = 'oauth_credentials_not_configured'
        throw err
    }

    let refreshRes
    try {
        refreshRes = await axios.post(GOOGLE_TOKEN_URL, {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: yt.refreshToken,
            grant_type: 'refresh_token'
        }, { timeout: 30000 })
    } catch (refreshErr) {
        const googleError = refreshErr.response?.data?.error || ''
        const googleDescription = refreshErr.response?.data?.error_description || refreshErr.message
        // [19.17.8-NOTIFY-RESILIENCE] invalid_grant means the grant was revoked or expired
        if (googleError === 'invalid_grant') {
            await YouTubeToken.markStatus(userId, 'revoked', 'invalid_grant')
            const err = new Error('invalid_grant')
            err.code = 'invalid_grant'
            err.userMessage = 'Токен YouTube устарел или отозван — переподключи канал в настройках'
            throw err
        }
        const err = new Error(`refresh_failed: ${googleDescription}`)
        err.code = 'refresh_failed'
        throw err
    }

    const accessToken = refreshRes.data?.access_token
    if (!accessToken) throw new Error('no_access_token_in_refresh_response')

    await YouTubeToken.setTokens(userId, {
        accessToken,
        refreshToken: yt.refreshToken, // Google не возвращает новый refresh token
        scope: yt.scope,
        channelId: yt.channelId,
        channelTitle: yt.channelTitle,
        expiresAt: refreshRes.data?.expires_in ? new Date(Date.now() + refreshRes.data.expires_in * 1000) : null,
        connectedAt: yt.connectedAt,
    })

    return accessToken
}

// [19.17.8-NOTIFY-RESILIENCE] lightweight token health check: channels.list costs 1 quota unit
export async function checkTokenAlive(userId) {
    try {
        const accessToken = await getAccessTokenForUser(userId)
        await axios.get(`${YT_API_URL}/channels`, {
            params: { part: 'id', mine: true, maxResults: 1 },
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 30000
        })
        await YouTubeToken.markStatus(userId, 'active', '')
        return { alive: true, status: 'active' }
    } catch (err) {
        const status = err.code === 'invalid_grant' ? 'revoked' : 'expired'
        await YouTubeToken.markStatus(userId, status, err.code || err.message)
        return { alive: false, status, reason: err.code || err.message }
    }
}

// [19.17.8-NOTIFY-RESILIENCE] client-facing Telegram notifications
async function getClientTelegramChatId(userId) {
    try {
        const user = await User.findById(userId).select('telegramChatId name').lean()
        return user?.telegramChatId || null
    } catch {
        return null
    }
}

export async function notifyClientYoutubePublished(userId, title, url) {
    const chatId = await getClientTelegramChatId(userId)
    if (!chatId) return
    const message = `✅ Видео «${title}» опубликовано на YouTube:\n${url}\n\nЕсли HD ещё обрабатывается — YouTube докрутит сам.`
    await sendClientMessage(chatId, message)
}

export async function notifyClientYoutubeError(userId, title, errorCode, errorMessage) {
    const chatId = await getClientTelegramChatId(userId)
    if (!chatId) return
    let humanReason = errorMessage || errorCode
    let actionHint = ''
    if (errorCode === 'quota_exceeded') {
        humanReason = 'Превышена дневная квота YouTube API'
        actionHint = 'Повтори после 10:00 МСК.'
    } else if (errorCode === 'invalid_grant' || errorCode === 'youtube_not_connected') {
        humanReason = 'Токен YouTube устарел или отозван'
        actionHint = 'Переподключи канал в настройках.'
    } else if (errorCode === 'file_too_large' || errorCode === 'directBadType') {
        humanReason = 'Неподдерживаемый формат или размер файла'
        actionHint = 'Используй MP4, MOV или WebM до 20 ГБ.'
    }
    const message = `❌ Не удалось опубликовать видео «${title}»\nПричина: ${humanReason}\n\n${actionHint}`
    const options = {}
    if (errorCode === 'invalid_grant' || errorCode === 'youtube_not_connected') {
        options.reply_markup = {
            inline_keyboard: [[{ text: 'Переподключить канал', url: `${process.env.FRONTEND_URL || 'https://aiviral-studio.ru'}/settings?tab=youtube` }]]
        }
    }
    await sendClientMessage(chatId, message, options)
}

export async function notifyClientYoutubeReminder(userId, title, scheduledAt) {
    const chatId = await getClientTelegramChatId(userId)
    if (!chatId) return
    const timeStr = scheduledAt ? new Date(scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''
    const message = `⏰ Пост «${title}» запланирован на ${timeStr}, но YouTube-канал отключён или токен устарел.\n\nПереподключи канал, иначе пост не выйдет.`
    await sendClientMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [[{ text: 'Переподключить YouTube', url: `${process.env.FRONTEND_URL || 'https://aiviral-studio.ru'}/settings?tab=youtube` }]]
        }
    })
}

// [19.17.9] builds the videos.insert resource body shared by all upload paths.
// publishAt is honoured only behind ENABLE_YOUTUBE_PUBLIC (unverified app stays private).
function buildVideoResource({ title, description = '', tags = [], privacyStatus = 'private', categoryId = '22', madeForKids = false, language = '', publishAt = '' } = {}) {
    const safePrivacy = ['private', 'unlisted', 'public'].includes(privacyStatus) ? privacyStatus : 'private'
    const effectivePrivacy = safePrivacy === 'public' && !isYoutubePublicEnabled() ? 'private' : safePrivacy
    const snippet = {
        title: title || 'Без названия',
        description,
        tags: Array.isArray(tags) ? tags : [],
        categoryId: categoryId || '22'
    }
    if (language) snippet.defaultLanguage = language
    const status = { privacyStatus: effectivePrivacy, madeForKids: !!madeForKids }
    // YouTube-native scheduled publish: requires privacyStatus=private + RFC 3339 future time
    if (publishAt && isYoutubePublicEnabled()) {
        const ts = new Date(publishAt)
        if (!isNaN(ts) && ts.getTime() > Date.now()) {
            status.publishAt = ts.toISOString()
            status.privacyStatus = 'private'
        }
    }
    return { snippet, status }
}

export async function uploadVideoForUser(userId, filePath, meta = {}) {
    if (!fs.existsSync(filePath)) throw new Error('video_file_not_found')

    await checkQuota(QUOTA_COSTS.upload)
    const accessToken = await getAccessTokenForUser(userId)

    const sessionRes = await axios.post(`${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, buildVideoResource(meta), {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    })
    const uploadUrl = sessionRes.headers?.location
    if (!uploadUrl) throw new Error('no_upload_location')

    const videoBuffer = fs.readFileSync(filePath)
    const uploadRes = await axios.put(uploadUrl, videoBuffer, {
        headers: {
            'Content-Type': 'video/*',
            'Content-Length': videoBuffer.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 300000
    })
    const videoId = uploadRes.data?.id
    if (!videoId) throw new Error('no_video_id_in_upload_response')

    await trackQuota(QUOTA_COSTS.upload)
    return { videoId }
}

export async function setThumbnailForUser(userId, videoId, thumbnailPath) {
    if (!fs.existsSync(thumbnailPath)) throw new Error('thumbnail_file_not_found')
    const accessToken = await getAccessTokenForUser(userId)
    const imageBuffer = fs.readFileSync(thumbnailPath)
    await axios.post(`${YT_THUMBNAIL_UPLOAD_URL}?videoId=${encodeURIComponent(videoId)}&uploadType=media`, imageBuffer, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg',
            'Content-Length': imageBuffer.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000
    })
    return { success: true }
}

export async function listVideosForUser(userId) {
    await checkQuota(QUOTA_COSTS.list)
    const accessToken = await getAccessTokenForUser(userId)
    const headers = { Authorization: `Bearer ${accessToken}` }

    const channelRes = await axios.get(`${YT_API_URL}/channels`, {
        params: { part: 'contentDetails', mine: true },
        headers,
        timeout: 30000
    })
    const uploadsPlaylistId = channelRes.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) return []

    const playlistRes = await axios.get(`${YT_API_URL}/playlistItems`, {
        params: { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: 50 },
        headers,
        timeout: 30000
    })
    const videoIds = (playlistRes.data?.items || []).map(i => i.contentDetails?.videoId).filter(Boolean)
    if (videoIds.length === 0) {
        await trackQuota(QUOTA_COSTS.list)
        return []
    }

    const videosRes = await axios.get(`${YT_API_URL}/videos`, {
        params: { part: 'snippet,statistics,status', id: videoIds.join(',') },
        headers,
        timeout: 30000
    })
    await trackQuota(QUOTA_COSTS.list)
    return videosRes.data?.items || []
}

export async function deleteVideoForUser(userId, videoId) {
    await checkQuota(QUOTA_COSTS.delete)
    const accessToken = await getAccessTokenForUser(userId)
    const headers = { Authorization: `Bearer ${accessToken}` }

    // Проверка владения: видео должно принадлежать каналу пользователя
    const yt = await YouTubeToken.getTokens(userId)
    const videoRes = await axios.get(`${YT_API_URL}/videos`, {
        params: { part: 'snippet', id: videoId },
        headers,
        timeout: 30000
    })
    const video = videoRes.data?.items?.[0]
    if (!video) {
        const err = new Error('video_not_found')
        err.code = 'video_not_found'
        throw err
    }
    if (!yt?.channelId || video.snippet?.channelId !== yt.channelId) {
        const err = new Error('not_video_owner')
        err.code = 'not_video_owner'
        throw err
    }

    await axios.delete(`${YT_API_URL}/videos`, {
        params: { id: videoId },
        headers,
        timeout: 30000
    })
    await trackQuota(QUOTA_COSTS.delete)
    return { success: true, deleted: true }
}

// [19.17.9-DIRECT-UPLOAD] scheduled posts upload via the resumable chunked path:
// backend streams the file from disk in 8 MB chunks straight to Google (no 20 GB buffer in RAM).
// [19.17.8-NOTIFY-RESILIENCE] wrapped with client + owner notifications.
export async function publishScheduledYouTubePost(post) {
    const userId = post.userId
    const title = post.youtubeTitle || post.title || 'Без названия'
    if (!post.youtubeVideoPath) throw new Error('youtube_video_path_missing')

    // Idempotency guard: already uploaded in a previous run — do not upload twice
    if (post.youtubeVideoId) {
        return { success: true, postUrl: 'https://youtu.be/' + post.youtubeVideoId, videoId: post.youtubeVideoId, alreadyUploaded: true }
    }

    const tags = Array.isArray(post.youtubeTags)
        ? post.youtubeTags
        : String(post.youtubeTags || '').split(',').map(t => t.trim()).filter(Boolean)

    try {
        const { videoId } = await uploadVideoChunkedForUser(userId, post.youtubeVideoPath, {
            title,
            description: post.youtubeDescription || post.content || '',
            tags,
            privacyStatus: post.youtubePrivacyStatus || 'private'
        })

        // Persist immediately so a retried run skips the upload
        if (post._id) {
            await mongoose.model('ScheduledPost').updateOne(
                { _id: post._id },
                { $set: { youtubeVideoId: videoId, youtubeVideoUrl: 'https://youtu.be/' + videoId } }
            ).catch(() => {})
        }

        // Thumbnail for cron uploads: explicit path or an image with the same base name in the media queue
        const thumbnailPath = post.youtubeThumbnailPath && fs.existsSync(post.youtubeThumbnailPath)
            ? post.youtubeThumbnailPath
            : findThumbnailForVideo(post.youtubeVideoPath)
        if (thumbnailPath) {
            try {
                await setThumbnailForUser(userId, videoId, thumbnailPath)
            } catch (thumbErr) {
                console.warn('[yt:schedule] thumbnail failed:', thumbErr.message)
            }
        }

        const url = 'https://youtu.be/' + videoId
        await notifyClientYoutubePublished(userId, title, url).catch(() => {})
        return { success: true, postUrl: url, videoId }
    } catch (err) {
        const code = err.code || 'unknown_error'
        await notifyClientYoutubeError(userId, title, code, err.userMessage || err.message).catch(() => {})
        alertOwner?.(`❌ YouTube publish failed\nClient: ${userId}\nPost: ${title}\nReason: ${code} — ${err.message}`).catch(() => {})
        throw err
    }
}

// ============================================================
// [19.17.9-DIRECT-UPLOAD] resumable direct upload (browser → YouTube)
// ============================================================

function normalizeUploadMeta(meta = {}) {
    return {
        title: String(meta.title || '').slice(0, 100),
        description: String(meta.description || '').slice(0, 5000),
        tags: Array.isArray(meta.tags)
            ? meta.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 30)
            : String(meta.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 30),
        categoryId: String(meta.categoryId || '22'),
        privacyStatus: ['private', 'unlisted', 'public'].includes(meta.privacyStatus) ? meta.privacyStatus : 'private',
        madeForKids: meta.madeForKids === true || meta.madeForKids === 'true',
        publishAt: meta.publishAt ? String(meta.publishAt) : '',
        playlistId: String(meta.playlistId || ''),
        language: String(meta.language || ''),
    }
}

// Creates a resumable session at Google + persists it. Idempotent: an active
// session for the same file (userId+fileHash+fileSize) is returned, not duplicated.
export async function createResumableSessionForUser(userId, { fileSize, fileName = '', fileHash = '', meta = {}, allowDuplicate = false } = {}) {
    if (!fileSize || fileSize <= 0) {
        const err = new Error('file_size_required')
        err.code = 'file_size_required'
        throw err
    }
    if (fileSize > YT_MAX_FILE_SIZE) {
        const err = new Error('file_too_large')
        err.code = 'file_too_large'
        throw err
    }

    // Resume of an existing active session for the same file — no new videos.insert, no extra quota
    if (fileHash) {
        const active = await UploadSession.findOne({
            userId, fileHash, fileSize, status: 'active', expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 })
        if (active) {
            return { session: active, resumed: true, duplicate: null }
        }
    }

    // Duplicate guard: same file already fully uploaded before
    if (fileHash && !allowDuplicate) {
        const dup = await UploadSession.findOne({ userId, fileHash, status: 'completed' }).sort({ createdAt: -1 }).lean()
        if (dup) {
            const err = new Error('duplicate_file')
            err.code = 'duplicate_file'
            err.duplicate = { videoId: dup.videoId, uploadedAt: dup.updatedAt || dup.createdAt, fileName: dup.fileName }
            throw err
        }
    }

    // Pre-flight checks: quota first, then a live token — no 500 halfway through
    await checkQuota(QUOTA_COSTS.upload)
    const accessToken = await getAccessTokenForUser(userId)

    const videoMeta = normalizeUploadMeta(meta)
    const sessionRes = await axios.post(`${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, buildVideoResource(videoMeta), {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': fileSize,
        },
        timeout: 30000
    })
    const uploadUrl = sessionRes.headers?.location
    if (!uploadUrl) throw new Error('no_upload_location')

    await trackQuota(QUOTA_COSTS.upload) // videos.insert is charged at session initiation

    const session = await UploadSession.create({
        userId,
        uploadUrl,
        videoMeta,
        fileSize,
        fileName: String(fileName || '').slice(0, 255),
        fileHash: String(fileHash || ''),
        bytesUploaded: 0,
        status: 'active',
        expiresAt: new Date(Date.now() + RESUMABLE_SESSION_TTL_MS),
    })
    return { session, resumed: false, duplicate: null }
}

export async function getUploadSessionForUser(userId, sessionId) {
    const session = await UploadSession.findOne({ _id: sessionId, userId })
    if (!session) {
        const err = new Error('upload_session_not_found')
        err.code = 'upload_session_not_found'
        throw err
    }
    if (session.status === 'active' && session.expiresAt && session.expiresAt.getTime() < Date.now()) {
        session.status = 'expired'
        await session.save().catch(() => {})
    }
    return session
}

export async function addToPlaylistForUser(userId, playlistId, videoId) {
    await checkQuota(QUOTA_COSTS.playlistInsert)
    const accessToken = await getAccessTokenForUser(userId)
    await axios.post(`${YT_API_URL}/playlistItems?part=snippet`, {
        snippet: {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId }
        }
    }, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 30000
    })
    await trackQuota(QUOTA_COSTS.playlistInsert)
    return { success: true }
}

// Post-upload finalization: thumbnail, playlist, session bookkeeping
export async function completeUploadForUser(userId, sessionId, { videoId, thumbnailPath = '', bytesUploaded = 0 } = {}) {
    if (!videoId) {
        const err = new Error('video_id_required')
        err.code = 'video_id_required'
        throw err
    }
    const session = await getUploadSessionForUser(userId, sessionId)

    let thumbnailSet = false
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        try {
            await setThumbnailForUser(userId, videoId, thumbnailPath)
            thumbnailSet = true
        } catch (thumbErr) {
            console.warn('[yt:complete] thumbnail failed:', thumbErr.message)
        }
    }

    let playlistAdded = false
    if (session.videoMeta?.playlistId) {
        try {
            await addToPlaylistForUser(userId, session.videoMeta.playlistId, videoId)
            playlistAdded = true
        } catch (plErr) {
            console.warn('[yt:complete] playlist insert failed:', plErr.message)
        }
    }

    session.status = 'completed'
    session.videoId = videoId
    session.bytesUploaded = bytesUploaded || session.fileSize
    await session.save()

    return { success: true, videoId, url: `https://studio.youtube.com/video/${videoId}`, thumbnailSet, playlistAdded }
}

export async function getProcessingStatusForUser(userId, videoId) {
    await checkQuota(QUOTA_COSTS.list)
    const accessToken = await getAccessTokenForUser(userId)
    const res = await axios.get(`${YT_API_URL}/videos`, {
        params: { part: 'processingDetails', id: videoId },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
    })
    await trackQuota(QUOTA_COSTS.list)
    const item = res.data?.items?.[0]
    if (!item) {
        const err = new Error('video_not_found')
        err.code = 'video_not_found'
        throw err
    }
    const details = item.processingDetails || {}
    let status = details.processingStatus || 'processing'
    if (status === 'terminated') status = 'failed'
    const partsTotal = Number(details.processingProgress?.partsTotal || 0)
    const partsProcessed = Number(details.processingProgress?.partsProcessed || 0)
    const progress = partsTotal > 0 ? Math.round((partsProcessed / partsTotal) * 100) : null
    return { status, progress, timeLeftMs: Number(details.processingProgress?.timeLeftMs || 0) || null }
}

export async function listPlaylistsForUser(userId) {
    await checkQuota(QUOTA_COSTS.list)
    const accessToken = await getAccessTokenForUser(userId)
    const res = await axios.get(`${YT_API_URL}/playlists`, {
        params: { part: 'snippet', mine: true, maxResults: 50 },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
    })
    await trackQuota(QUOTA_COSTS.list)
    return (res.data?.items || []).map(p => ({ id: p.id, title: p.snippet?.title || '' }))
}

// AI tags/description via the existing aiService (generateContent), internals untouched
export async function generateVideoMetaForUser(userId, { title = '', fileName = '' } = {}) {
    const topic = title || fileName || 'video'
    const [tagsRes, descRes] = await Promise.all([
        generateContent('tags', { topic, platform: 'YouTube', ownerId: userId }),
        generateContent('description', { title: topic, platform: 'YouTube', ownerId: userId }),
    ])
    const tags = String(tagsRes?.content || '')
        .replace(/#/g, '')
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 15)
    return {
        success: !!(tagsRes?.success || descRes?.success),
        tags,
        description: String(descRes?.content || '').trim(),
    }
}

// [19.17.9] chunked resumable upload from a server-side file (scheduler / cron path)
async function readChunk(filePath, start, length) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { start, end: start + length - 1 })
        const parts = []
        stream.on('data', d => parts.push(d))
        stream.on('end', () => resolve(Buffer.concat(parts)))
        stream.on('error', reject)
    })
}

export async function uploadVideoChunkedForUser(userId, filePath, meta = {}) {
    if (!fs.existsSync(filePath)) throw new Error('video_file_not_found')
    const fileSize = fs.statSync(filePath).size

    await checkQuota(QUOTA_COSTS.upload)
    const accessToken = await getAccessTokenForUser(userId)

    const sessionRes = await axios.post(`${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, buildVideoResource(normalizeUploadMeta(meta)), {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': fileSize,
        },
        timeout: 30000
    })
    const uploadUrl = sessionRes.headers?.location
    if (!uploadUrl) throw new Error('no_upload_location')

    let start = 0
    let videoId = null
    while (start < fileSize) {
        const end = Math.min(start + RESUMABLE_CHUNK_SIZE, fileSize) - 1
        const chunk = await readChunk(filePath, start, end - start + 1)
        const resp = await axios.put(uploadUrl, chunk, {
            headers: {
                'Content-Type': 'video/*',
                'Content-Length': chunk.length,
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            validateStatus: s => s === 200 || s === 201 || s === 308,
            timeout: 120000
        })
        if (resp.status === 308) {
            // Resume Incomplete — server confirms bytes via Range: bytes=0-N
            const range = resp.headers?.range
            const match = range ? /bytes=0-(\d+)/.exec(range) : null
            start = match ? Number(match[1]) + 1 : end + 1
            continue
        }
        videoId = resp.data?.id
        break
    }
    if (!videoId) throw new Error('no_video_id_in_upload_response')

    await trackQuota(QUOTA_COSTS.upload)
    return { videoId }
}

// Thumbnail lookup for cron uploads: image with the same base name next to the video
function findThumbnailForVideo(videoPath) {
    try {
        const dir = path.dirname(videoPath)
        const base = path.basename(videoPath, path.extname(videoPath))
        for (const ext of ['.jpg', '.jpeg', '.png']) {
            const candidate = path.join(dir, base + ext)
            if (fs.existsSync(candidate)) return candidate
        }
    } catch { /* optional thumbnail */ }
    return ''
}

// [19.17.8-NOTIFY-RESILIENCE] daily YouTube stats for the owner morning report
export async function getYoutubeDailyStats() {
    const today = new Date().toISOString().slice(0, 10)
    const quotaDoc = await quotaCollection().findOne({ _id: today })
    const quotaUsed = quotaDoc?.used || 0
    const quotaPercent = Math.round((quotaUsed / QUOTA_DAILY_LIMIT) * 100)

    const startOfDay = new Date(today + 'T00:00:00.000Z')
    const endOfDay = new Date(today + 'T23:59:59.999Z')
    const [published, errors] = await Promise.all([
        mongoose.model('ScheduledPost').countDocuments({
            platforms: 'youtube',
            status: 'published',
            publishedAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        mongoose.model('ScheduledPost').countDocuments({
            platforms: 'youtube',
            status: 'failed',
            updatedAt: { $gte: startOfDay, $lte: endOfDay }
        })
    ])

    return { published, errors, quotaUsed, quotaPercent }
}
