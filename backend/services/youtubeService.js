import { google } from 'googleapis'
import axios from 'axios'
import fs from 'fs'
import mongoose from 'mongoose'
import YouTubeToken from '../models/YouTubeToken.js'
import { getProviderKey } from './aiService.js'
import { alertOwner } from './ownerBot.js'

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
export const QUOTA_COSTS = { upload: 1600, delete: 50, list: 1 }

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

    const refreshRes = await axios.post(GOOGLE_TOKEN_URL, {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: yt.refreshToken,
        grant_type: 'refresh_token'
    }, { timeout: 30000 })

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

export async function uploadVideoForUser(userId, filePath, { title, description = '', tags = [], privacyStatus = 'private' } = {}) {
    if (!fs.existsSync(filePath)) throw new Error('video_file_not_found')
    // public запрещён до аудита Google
    const safePrivacy = ['private', 'unlisted'].includes(privacyStatus) ? privacyStatus : 'private'

    await checkQuota(QUOTA_COSTS.upload)
    const accessToken = await getAccessTokenForUser(userId)

    const sessionRes = await axios.post(`${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
        snippet: {
            title: title || 'Без названия',
            description,
            tags: Array.isArray(tags) ? tags : [],
            categoryId: '22'
        },
        status: { privacyStatus: safePrivacy }
    }, {
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

export async function publishScheduledYouTubePost(post) {
    const userId = post.userId
    if (!post.youtubeVideoPath) throw new Error('youtube_video_path_missing')
    const tags = Array.isArray(post.youtubeTags)
        ? post.youtubeTags
        : String(post.youtubeTags || '').split(',').map(t => t.trim()).filter(Boolean)
    const { videoId } = await uploadVideoForUser(userId, post.youtubeVideoPath, {
        title: post.youtubeTitle || post.title,
        description: post.youtubeDescription || post.content || '',
        tags,
        privacyStatus: post.youtubePrivacyStatus || 'private'
    })
    return { success: true, postUrl: 'https://youtu.be/' + videoId, videoId }
}
