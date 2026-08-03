// [P17] added: OMEGA Web Search with provider fallback
import axios from 'axios'

async function searchSerpAPI(query) {
    const key = process.env.SERPAPI_KEY
    if (!key) return null
    try {
        const res = await axios.get('https://serpapi.com/search', {
            params: { q: query, api_key: key, engine: 'google' },
            timeout: 20000
        })
        const results = res.data?.organic_results || []
        return results.slice(0, 5).map(r => ({
            title: r.title || '',
            link: r.link || r.url || '',
            snippet: r.snippet || r.description || ''
        }))
    } catch (err) {
        console.warn('[webSearch] SerpAPI failed:', err.message)
        return null
    }
}

async function searchDuckDuckGo(query) {
    try {
        const res = await axios.get('https://html.duckduckgo.com/html/', {
            params: { q: query },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        })
        const html = res.data
        const sources = []
        const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi
        let match
        while ((match = regex.exec(html)) !== null && sources.length < 5) {
            const link = match[1]
            const title = match[2].replace(/<[^>]+>/g, '').trim()
            sources.push({ title, link, snippet: '' })
        }
        return sources
    } catch (err) {
        console.warn('[webSearch] DuckDuckGo failed:', err.message)
        return []
    }
}

async function getRedditToken() {
    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET
    if (!clientId || !clientSecret) return null
    try {
        const res = await axios.post(
            'https://www.reddit.com/api/v1/access_token',
            'grant_type=client_credentials',
            {
                auth: { username: clientId, password: clientSecret },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000
            }
        )
        return res.data?.access_token || null
    } catch (err) {
        console.warn('[webSearch] Reddit token failed:', err.message)
        return null
    }
}

async function searchReddit(query) {
    const token = await getRedditToken()
    if (!token) return []
    try {
        const res = await axios.get('https://oauth.reddit.com/search', {
            params: { q: query, limit: 5, sort: 'relevance' },
            headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'omega-search/1.0' },
            timeout: 15000
        })
        const posts = res.data?.data?.children || []
        return posts.slice(0, 5).map(p => ({
            title: p.data?.title || '',
            link: `https://www.reddit.com${p.data?.permalink || ''}`,
            snippet: p.data?.selftext?.slice(0, 200) || ''
        }))
    } catch (err) {
        console.warn('[webSearch] Reddit search failed:', err.message)
        return []
    }
}

async function searchTwitter(query) {
    if (!process.env.TWITTER_BEARER_TOKEN) return []
    try {
        const res = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
            params: { query, max_results: 5 },
            headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
            timeout: 15000
        })
        const tweets = res.data?.data || []
        return tweets.slice(0, 5).map(t => ({
            title: 'Tweet',
            link: `https://twitter.com/i/web/status/${t.id}`,
            snippet: t.text || ''
        }))
    } catch (err) {
        console.warn('[webSearch] Twitter search failed:', err.message)
        return []
    }
}

export async function searchWithFallback(query) {
    if (!query || typeof query !== 'string') {
        throw new Error('query is required')
    }

    let sources = await searchSerpAPI(query)
    if (!sources) {
        sources = await searchDuckDuckGo(query)
    }

    if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
        try {
            const reddit = await searchReddit(query)
            sources = sources.concat(reddit).slice(0, 8)
        } catch (err) {
            console.warn('[webSearch] Reddit fallback failed:', err.message)
        }
    }

    if (process.env.TWITTER_BEARER_TOKEN) {
        try {
            const tweets = await searchTwitter(query)
            sources = sources.concat(tweets).slice(0, 10)
        } catch (err) {
            console.warn('[webSearch] Twitter fallback failed:', err.message)
        }
    }

    const summary = sources.length
        ? `Найдено ${sources.length} источников по запросу "${query}".`
        : `Не удалось найти результаты по запросу "${query}".`

    return { summary, sources: sources.filter(s => s.title || s.link || s.snippet) }
}

export default { searchWithFallback }
