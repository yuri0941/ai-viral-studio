import axios from 'axios'
import { getProviderKey } from './aiService.js'
import { getJSON, setJSON } from '../config/redis.js'

/**
 * [YT-DATA-REAL-STATS] Единая точка доступа к YouTube Data API v3 по API-ключу владельца.
 *
 * Ключ: MongoDB ApiKey provider='youtube' через getProviderKey (кабинет — главный источник,
 * env — только запасной вариант, см. aiService.getProviderKey).
 *
 * Кэш квоты (лимит 10 000 ед/день у Google):
 *   видео  (videos.list,   1 ед)   — 1 час
 *   канал  (channels.list, 1 ед)   — 6 часов
 *   поиск  (search.list, 100 ед)   — 6 часов
 *   тренды (mostPopular,   1 ед)   — 6 часов
 * Повторные запросы попадают в кэш и НЕ сжигают квоту.
 * quotaExceeded → graceful fallback (available:false + reason) и лог, без падения.
 */
const TTL = {
    video: 3600,        // 1 ч
    channel: 21600,     // 6 ч
    search: 21600,      // 6 ч (search.list = 100 ед квоты!)
    trending: 21600,    // 6 ч
}

const YT_API_URL = 'https://www.googleapis.com/youtube/v3'

export async function getYoutubeApiKey(ownerId = null) {
    const key = await getProviderKey('youtube', ownerId)
    return key || process.env.YOUTUBE_API_KEY || null
}

// Человеческие причины ошибок Google (переиспользуется в модалке/тостах/чате)
export function mapYoutubeError(err) {
    const apiErr = err?.response?.data?.error
    const reasons = Array.isArray(apiErr?.errors) ? apiErr.errors.map(e => e?.reason).filter(Boolean) : []
    const reason = reasons[0] || ''
    const rawMessage = apiErr?.message || err?.message || 'unknown'
    const status = err?.response?.status || null
    let message = rawMessage
    if (reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(rawMessage)) {
        message = 'YouTube Data API v3 не включён — включите его: https://console.cloud.google.com/apis/library/youtube.googleapis.com'
    } else if (reason === 'keyInvalid' || status === 400) {
        message = 'Ключ YouTube Data API недействителен — проверьте его в Google Cloud → Credentials'
    } else if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        message = 'Дневная квота YouTube API исчерпана — сброс после 10:00 МСК'
    } else if (reason === 'ipRefererBlocked' || reason === 'forbidden' || status === 403) {
        message = 'Ключ заблокирован ограничениями — снимите их в Google Cloud → Credentials (Application restrictions → None)'
    }
    return { code: reason || 'unknown_error', reason, message, status }
}

function unavailable(code, message) {
    return { success: false, available: false, error: { code, message } }
}

function bestThumbnail(thumbnails = {}) {
    return (
        thumbnails.maxres?.url ||
        thumbnails.standard?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        ''
    )
}

// ISO 8601 duration (PT1H2M3S) → секунды
function parseDuration(iso = '') {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso)
    if (!m) return null
    return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0)
}

/**
 * Реальная статистика видео: videos.list?part=snippet,statistics,contentDetails (1 ед квоты, кэш 1 ч).
 * Нет ключа / ошибка → available:false с человеческой причиной. Выдуманных цифр нет.
 */
export async function fetchVideoStats(videoId, { ownerId = null } = {}) {
    if (!videoId) return unavailable('no_video_id', 'Не удалось извлечь ID видео из ссылки')
    const cacheId = `yt:video:${videoId}`
    const cached = await getJSON(cacheId).catch(() => null)
    if (cached) return { ...cached, cached: true }

    const key = await getYoutubeApiKey(ownerId)
    if (!key) return unavailable('no_api_key', 'YouTube Data API ключ не подключён — статистика недоступна')

    try {
        const res = await axios.get(`${YT_API_URL}/videos`, {
            params: { part: 'snippet,statistics,contentDetails', id: videoId, key },
            timeout: 15000,
        })
        const item = res.data?.items?.[0]
        if (!item) return unavailable('video_not_found', 'Видео не найдено или удалено')

        const snippet = item.snippet || {}
        const stats = item.statistics || {}
        const result = {
            success: true,
            available: true,
            videoId,
            title: snippet.title || '',
            description: snippet.description || '',
            channelId: snippet.channelId || '',
            channelTitle: snippet.channelTitle || '',
            publishedAt: snippet.publishedAt || null,
            thumbnail: bestThumbnail(snippet.thumbnails),
            tags: Array.isArray(snippet.tags) ? snippet.tags : [],
            durationSeconds: parseDuration(item.contentDetails?.duration),
            views: Number(stats.viewCount || 0),
            likes: stats.likeCount !== undefined ? Number(stats.likeCount) : null, // лайки могут быть скрыты автором
            comments: stats.commentCount !== undefined ? Number(stats.commentCount) : null,
        }
        await setJSON(cacheId, result, TTL.video).catch(() => {})
        return result
    } catch (err) {
        const mapped = mapYoutubeError(err)
        console.warn(`[youtubeData] fetchVideoStats ${videoId} failed: ${mapped.code} — ${mapped.message}`)
        return unavailable(mapped.code, mapped.message)
    }
}

/**
 * Статистика канала: channels.list?part=snippet,statistics (1 ед квоты, кэш 6 ч).
 */
export async function fetchChannelStats(channelId, { ownerId = null } = {}) {
    if (!channelId) return unavailable('no_channel_id', 'Канал не определён')
    const cacheId = `yt:channel:${channelId}`
    const cached = await getJSON(cacheId).catch(() => null)
    if (cached) return { ...cached, cached: true }

    const key = await getYoutubeApiKey(ownerId)
    if (!key) return unavailable('no_api_key', 'YouTube Data API ключ не подключён — статистика недоступна')

    try {
        const res = await axios.get(`${YT_API_URL}/channels`, {
            params: { part: 'snippet,statistics', id: channelId, key },
            timeout: 15000,
        })
        const item = res.data?.items?.[0]
        if (!item) return unavailable('channel_not_found', 'Канал не найден')

        const snippet = item.snippet || {}
        const stats = item.statistics || {}
        const result = {
            success: true,
            available: true,
            channelId,
            title: snippet.title || '',
            thumbnail: bestThumbnail(snippet.thumbnails),
            subscribers: stats.hiddenSubscriberCount ? null : Number(stats.subscriberCount || 0),
            totalViews: Number(stats.viewCount || 0),
            videoCount: Number(stats.videoCount || 0),
        }
        await setJSON(cacheId, result, TTL.channel).catch(() => {})
        return result
    } catch (err) {
        const mapped = mapYoutubeError(err)
        console.warn(`[youtubeData] fetchChannelStats ${channelId} failed: ${mapped.code} — ${mapped.message}`)
        return unavailable(mapped.code, mapped.message)
    }
}

/**
 * Поиск видео: search.list (100 ед квоты!) — строго с кэшем 6 ч.
 * quotaExceeded → graceful fallback: возвращаем то, что в кэше, либо available:false + лог.
 */
export async function searchYoutubeVideos(query, { maxResults = 10, ownerId = null } = {}) {
    if (!query) return unavailable('no_query', 'Пустой поисковый запрос')
    const cacheId = `yt:search:${query}:${maxResults}`
    const cached = await getJSON(cacheId).catch(() => null)
    if (cached) return { ...cached, cached: true }

    const key = await getYoutubeApiKey(ownerId)
    if (!key) return unavailable('no_api_key', 'YouTube Data API ключ не подключён — поиск недоступен')

    try {
        const res = await axios.get(`${YT_API_URL}/search`, {
            params: {
                part: 'snippet', q: query, type: 'video', order: 'viewCount',
                maxResults: Math.min(maxResults, 25),
                publishedAfter: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
                key,
            },
            timeout: 15000,
        })
        const result = {
            success: true,
            available: true,
            videos: (res.data?.items || []).map(item => ({
                videoId: item.id?.videoId,
                title: item.snippet?.title || '',
                channelTitle: item.snippet?.channelTitle || '',
                publishedAt: item.snippet?.publishedAt || null,
                thumbnail: bestThumbnail(item.snippet?.thumbnails),
            })),
        }
        await setJSON(cacheId, result, TTL.search).catch(() => {})
        return result
    } catch (err) {
        const mapped = mapYoutubeError(err)
        console.warn(`[youtubeData] search "${query}" failed: ${mapped.code} — ${mapped.message}`)
        return unavailable(mapped.code, mapped.message)
    }
}

/**
 * Тренды региона: videos.list?chart=mostPopular (1 ед квоты, кэш 6 ч).
 */
export async function fetchTrendingVideos(regionCode = 'RU', { categoryId = null, ownerId = null } = {}) {
    const cacheId = `yt:trending:${regionCode}:${categoryId || 'all'}`
    const cached = await getJSON(cacheId).catch(() => null)
    if (cached) return { ...cached, cached: true }

    const key = await getYoutubeApiKey(ownerId)
    if (!key) return unavailable('no_api_key', 'YouTube Data API ключ не подключён — тренды недоступны')

    try {
        const params = {
            part: 'snippet,statistics', chart: 'mostPopular',
            regionCode, maxResults: 10, key,
        }
        if (categoryId) params.videoCategoryId = categoryId
        const res = await axios.get(`${YT_API_URL}/videos`, { params, timeout: 15000 })
        const result = {
            success: true,
            available: true,
            videos: (res.data?.items || []).map(item => ({
                videoId: item.id,
                title: item.snippet?.title || '',
                channelTitle: item.snippet?.channelTitle || '',
                views: Number(item.statistics?.viewCount || 0),
                likes: Number(item.statistics?.likeCount || 0),
                thumbnail: bestThumbnail(item.snippet?.thumbnails),
            })),
        }
        await setJSON(cacheId, result, TTL.trending).catch(() => {})
        return result
    } catch (err) {
        const mapped = mapYoutubeError(err)
        console.warn(`[youtubeData] trending ${regionCode} failed: ${mapped.code} — ${mapped.message}`)
        return unavailable(mapped.code, mapped.message)
    }
}

/**
 * Прозрачная формула AI-рейтинга (0–100) из РЕАЛЬНЫХ метрик. Никакой магии:
 *
 *   engagement  = (likes + comments) / views * 100, в %; бар = min(100, engagement / 8 * 100)   — 8% вовлечённости = эталон
 *   virality    = log10(views + 1) / log10(10^7) * 100                                        — лог-шкала до 10 млн просмотров
 *   retention   = min(100, likeRate / 4% * 100), likeRate = likes / views                     — прокси удержания
 *                 (настоящий retention даёт только YouTube Analytics API — он после Google-аудита)
 *   seo         = теги (до 40 п., 10+ тегов = макс) + описание (до 40 п., 500+ симв. = макс)
 *                 + название с цифрой/вопросом (20 п.)
 *   growth      = min(100, viewsPerDay / subscribers * 1000) если известны подписчики,
 *                 иначе min(100, viewsPerDay / 100) — 100 просмотров/день = базовый рост
 *
 *   score = round(engagement*0.3 + virality*0.25 + retention*0.15 + seo*0.15 + growth*0.15)
 *
 * Если лайки скрыты автором (likes=null) — engagement/retention считаются по комментариям,
 * веса перераспределяются на virality. Чего нет в данных — того нет в оценке.
 */
export function computeVideoRating(video, channel = null) {
    if (!video?.available) return null
    const views = Number(video.views || 0)
    const likes = video.likes !== null && video.likes !== undefined ? Number(video.likes) : null
    const comments = video.comments !== null && video.comments !== undefined ? Number(video.comments) : null
    const reactions = (likes || 0) + (comments || 0)

    const engagementPct = views > 0 ? (reactions / views) * 100 : 0
    const engagement = Math.min(100, (engagementPct / 8) * 100)

    const virality = Math.min(100, (Math.log10(views + 1) / 7) * 100)

    let retention
    if (likes !== null && views > 0) {
        retention = Math.min(100, ((likes / views) / 0.04) * 100)
    } else if (comments !== null && views > 0) {
        retention = Math.min(100, ((comments / views) / 0.005) * 100) // 0.5% комментариев — сильный сигнал
    } else {
        retention = 0
    }

    let seo = 0
    seo += Math.min(40, (Array.isArray(video.tags) ? video.tags.length : 0) * 4)
    seo += Math.min(40, (String(video.description || '').length / 500) * 40)
    if (/\d|\?|!/.test(video.title || '')) seo += 20
    seo = Math.min(100, Math.round(seo))

    let ageDays = null
    if (video.publishedAt) {
        ageDays = Math.max(1, (Date.now() - new Date(video.publishedAt).getTime()) / 86400000)
    }
    const viewsPerDay = ageDays ? views / ageDays : 0
    const subscribers = channel?.available && channel.subscribers !== null ? Number(channel.subscribers) : null
    let growth
    if (subscribers && subscribers > 0) {
        growth = Math.min(100, (viewsPerDay / subscribers) * 1000)
    } else {
        growth = Math.min(100, viewsPerDay / 100)
    }

    const bars = {
        engagement: Math.round(engagement),
        virality: Math.round(virality),
        retention: Math.round(retention),
        seo,
        growth: Math.round(growth),
    }
    let score
    if (likes === null) {
        // лайки скрыты: веса engagement/retention отдаём virality
        score = Math.round(bars.engagement * 0.15 + bars.virality * 0.55 + bars.retention * 0 + bars.seo * 0.15 + bars.growth * 0.15)
    } else {
        score = Math.round(bars.engagement * 0.3 + bars.virality * 0.25 + bars.retention * 0.15 + bars.seo * 0.15 + bars.growth * 0.15)
    }
    return { score: Math.max(0, Math.min(100, score)), bars, formula: 'engagement*0.3 + virality*0.25 + retention*0.15 + seo*0.15 + growth*0.15' }
}

export default {
    getYoutubeApiKey,
    mapYoutubeError,
    fetchVideoStats,
    fetchChannelStats,
    searchYoutubeVideos,
    fetchTrendingVideos,
    computeVideoRating,
}
