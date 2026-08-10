import axios from 'axios'

const DUCKDUCKGO_URL = 'https://html.duckduckgo.com/html/'
const SERPAPI_URL = 'https://serpapi.com/search'

const FALLBACK_RESULTS = {
    'тренд': [
        { title: 'TikTok Trends 2026', snippet: 'Краткие вирусные ролики, AI-генерация и ностальгия — главные тренды.', url: 'https://example.com/tiktok-trends' },
        { title: 'YouTube Shorts growth', snippet: 'Shorts показывают рост просмотров на 35% год к году.', url: 'https://example.com/shorts-growth' },
    ],
    'новость': [
        { title: 'AI content tools update', snippet: 'Новые модели генерации видео меняют подход к контенту.', url: 'https://example.com/ai-tools' },
    ],
}

export function isWebSearchQuery(query) {
    const q = (query || '').toLowerCase()
    return /тренд|новост|актуально|сейчас|2026|news|trend|latest|now|google|reddit|tiktok тренд/.test(q)
}

export async function searchWebSerpAPI(query, limit = 3) {
    const key = process.env.SERPAPI_KEY
    if (!key) return null
    try {
        const { data } = await axios.get(SERPAPI_URL, {
            params: { q: query, api_key: key, engine: 'google', num: limit, hl: 'ru' },
            timeout: 20000
        })
        return (data?.organic_results || []).slice(0, limit).map(r => ({
            title: r.title,
            url: r.link,
            snippet: r.snippet || r.title
        }))
    } catch (err) {
        console.warn('[webSearch] SerpAPI failed:', err.message)
        return null
    }
}

export async function searchWeb(query, limit = 3) {
    const serp = await searchWebSerpAPI(query, limit)
    if (serp && serp.length) return serp

    try {
        const url = `${DUCKDUCKGO_URL}?q=${encodeURIComponent(query)}`
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Viral-Bot/1.0)' },
            timeout: 15000,
        })

        const results = []
        const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
        let match
        while ((match = regex.exec(data)) !== null && results.length < limit) {
            results.push({
                title: stripHtml(match[2]),
                url: decodeURIComponent(stripHtml(match[1])),
                snippet: stripHtml(match[3]),
            })
        }

        if (results.length > 0) return results
        return getMockResults(query, limit)
    } catch (err) {
        console.warn('[webSearch] failed:', err.message)
        return getMockResults(query, limit)
    }
}

export async function getTrendingTopics(niche = 'smm', limit = 5) {
    const query = `тренды ${niche} 2026 соцсети`
    const results = await searchWeb(query, limit)
    return results.map(r => r.title)
}

export function formatWebResultsLuxury(results) {
    if (!results || results.length === 0) return ''
    return '🔗 <b>Источники:</b>\n' + results.map((r, i) => `${i + 1}. <a href="${r.url}">${r.title}</a>\n<i>${r.snippet?.slice(0, 100)}</i>`).join('\n')
}

function stripHtml(html) {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

function getMockResults(query, limit) {
    const q = (query || '').toLowerCase()
    for (const key of Object.keys(FALLBACK_RESULTS)) {
        if (q.includes(key)) return FALLBACK_RESULTS[key].slice(0, limit)
    }
    return [
        { title: `Search results for "${query}"`, snippet: 'Свежие данные по запросу временно недоступны, используем внутренние шаблоны.', url: 'https://example.com' },
    ]
}

export function formatWebResults(results) {
    if (!results || results.length === 0) return ''
    return 'Свежие данные из интернета:\n' + results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')
}

export default { searchWeb, formatWebResults, isWebSearchQuery }
