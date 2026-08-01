import { spawn } from 'child_process'
import { Integration } from '../models/index.js'
import axios from 'axios'

// Platform API endpoints
const PLATFORM_APIS = {
    youtube: {
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        metrics: ['views', 'subscribers', 'videos', 'estimatedMinutesWatched'],
    },
    instagram: {
        baseUrl: 'https://graph.instagram.com',
        metrics: ['followers_count', 'media_count', 'impressions', 'reach'],
    },
    tiktok: {
        baseUrl: 'https://open.tiktokapis.com/v2',
        metrics: ['followers', 'following', 'likes', 'videos'],
    },
    telegram: {
        baseUrl: null, // no public API for stats, use bot or manual
        metrics: ['subscribers', 'views', 'messages'],
    },
}

export async function isPlatformConnected(platform, userId) {
    if (!platform || !userId) return false
    try {
        const integration = await Integration.findOne({ userId, provider: platform }).lean()
        return !!(integration?.connected && (integration?.accessToken || integration?.apiKey))
    } catch (err) {
        console.warn(`[channelAnalytics] isPlatformConnected failed for ${platform}:`, err.message)
        return false
    }
}

export async function fetchChannelAnalytics({ platform, userId, accessToken, apiKey, channelId }) {
    const connected = await isPlatformConnected(platform, userId)
    if (!connected) {
        return {
            status: 'disconnected',
            platform,
            message: `Подключите ${platform} в Интеграциях`,
            setupUrl: '/owner?tab=integrations',
            demoData: false,
            data: null,
        }
    }

    try {
        if (platform === 'youtube') {
            const token = accessToken || apiKey || process.env.YOUTUBE_API_KEY
            if (!token) throw new Error('No YouTube API key')
            const url = `${PLATFORM_APIS.youtube.baseUrl}/channels?part=statistics,snippet&id=${channelId || 'UC'}&key=${token}`
            const response = await axios.get(url, { timeout: 10000 })
            const item = response.data?.items?.[0]
            const stats = item?.statistics || {}
            return {
                status: 'connected',
                platform,
                data: {
                    followers: parseInt(stats.subscriberCount || 0),
                    views: parseInt(stats.viewCount || 0),
                    videos: parseInt(stats.videoCount || 0),
                    estimatedMinutesWatched: null,
                    title: item?.snippet?.title,
                    thumbnail: item?.snippet?.thumbnails?.default?.url,
                },
            }
        }

        if (platform === 'instagram') {
            const token = accessToken || apiKey
            if (!token) throw new Error('No Instagram access token')
            const fields = PLATFORM_APIS.instagram.metrics.join(',')
            const url = `${PLATFORM_APIS.instagram.baseUrl}/me?fields=${fields}&access_token=${token}`
            const response = await axios.get(url, { timeout: 10000 })
            return {
                status: 'connected',
                platform,
                data: {
                    followers: response.data?.followers_count || 0,
                    media: response.data?.media_count || 0,
                    impressions: response.data?.impressions || 0,
                    reach: response.data?.reach || 0,
                },
            }
        }

        if (platform === 'tiktok') {
            const token = accessToken || apiKey
            if (!token) throw new Error('No TikTok access token')
            const url = `${PLATFORM_APIS.tiktok.baseUrl}/user/info/?fields=display_name,follower_count,following_count,like_count,video_count`
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
            })
            const data = response.data?.data || {}
            return {
                status: 'connected',
                platform,
                data: {
                    followers: data.follower_count || 0,
                    following: data.following_count || 0,
                    likes: data.like_count || 0,
                    videos: data.video_count || 0,
                },
            }
        }

        if (platform === 'telegram') {
            return {
                status: 'connected',
                platform,
                data: {
                    followers: 0,
                    views: 0,
                    messages: 0,
                    note: 'Telegram stats require bot admin access. Configure TELEGRAM_BOT_TOKEN and channel ID.',
                },
            }
        }

        return {
            status: 'unsupported',
            platform,
            message: 'Платформа не поддерживается',
            data: null,
        }
    } catch (err) {
        console.error(`[channelAnalytics] ${platform} fetch failed:`, err.message)
        return {
            status: 'error',
            platform,
            message: `Ошибка получения данных: ${err.message}`,
            data: null,
        }
    }
}

export async function getAllChannelAnalytics(userId) {
    const platforms = ['youtube', 'instagram', 'tiktok', 'telegram']
    const results = await Promise.all(
        platforms.map(async (platform) => {
            try {
                const integration = await Integration.findOne({ userId, provider: platform }).select('+accessToken +apiKey').lean()
                return await fetchChannelAnalytics({
                    platform,
                    userId,
                    accessToken: integration?.accessToken,
                    apiKey: integration?.apiKey,
                    channelId: integration?.metadata?.channelId,
                })
            } catch (err) {
                return { status: 'error', platform, message: err.message, data: null }
            }
        })
    )
    return results
}

export default {
    isPlatformConnected,
    fetchChannelAnalytics,
    getAllChannelAnalytics,
}
