import axios from 'axios'

// [MASTER-v5.0] added: real YouTube metadata via oEmbed
export function extractVideoId(url) {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) {
            if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2]
            return u.searchParams.get('v')
        }
        if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    } catch {
        return null
    }
    return null
}

export async function scrapeYouTube(url) {
    const videoId = extractVideoId(url)
    if (!videoId) {
        return { error: 'Invalid YouTube URL' }
    }
    try {
        const res = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 10000 })
        return {
            platform: 'youtube',
            videoId,
            title: res.data.title || '',
            author: res.data.author_name || '',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        }
    } catch (err) {
        console.error('[youtubeScraper]', err.message)
        return {
            platform: 'youtube',
            videoId,
            title: 'Не удалось загрузить название',
            author: '',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            error: err.message,
        }
    }
}

export async function scrapeVideo(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return scrapeYouTube(url)
    return { platform: 'unknown', title: '', author: '', thumbnail: '' }
}
