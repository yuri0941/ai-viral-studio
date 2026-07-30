import { google } from 'googleapis'

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