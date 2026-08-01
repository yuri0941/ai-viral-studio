import { searchWeb } from './webSearch.js'
import { chatWithAI } from './aiService.js'
import { saveFact } from './omegaBrain/memoryStore.js'

/**
 * OMEGA Scout — сканер трендов для контент-стратегии.
 * Кэш: 6 часов (не тратит API на каждый запрос).
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
let trendCache = null
let trendCacheAt = 0

const DEFAULT_TRENDS = [
    {
        topic: 'AI-генерация коротких видео',
        platform: 'TikTok / Reels / Shorts',
        date: new Date().toISOString(),
        ideas: [
            'Сравнение 3 AI-инструментов для монтажа в 60 секунд',
            'Честный тест: смогла ли AI сделать вирусный ролик?',
            'Туториал: как создавать Shorts за 5 минут с помощью AI',
        ],
    },
    {
        topic: 'Личный бренд vs корпоративный контент',
        platform: 'Telegram / YouTube',
        date: new Date().toISOString(),
        ideas: [
            'Почему люди подписываются на человека, а не на логотип',
            '5 закулисных постов, которые повышают доверие',
            'История неудачи: как я потерял клиента и что исправил',
        ],
    },
    {
        topic: 'Ностальгия и ретро-форматы',
        platform: 'Instagram / TikTok',
        date: new Date().toISOString(),
        ideas: [
            'POV: 2010 vs 2026 — как изменился контент',
            'Вернём старые форматы: теги, челленджи, влоги',
            'Реакция на свои первые ролики: кринж или ностальгия?',
        ],
    },
]

async function fetchTrendsFromWeb(niche = '') {
    const query = niche ? `тренды ${niche} 2026 соцсети` : 'тренды соцсетей 2026 контент'
    try {
        const results = await searchWeb(query, 5)
        return results.map(r => ({
            title: r.title,
            snippet: r.snippet,
            url: r.url,
        }))
    } catch (err) {
        console.warn('[trendScanner] web search failed:', err.message)
        return []
    }
}

async function analyzeTrendsWithAI(rawTrends, niche = '') {
    if (!rawTrends.length) return null

    const prompt = `Проанализируй список новостей/трендов и выдели 3 актуальные темы для контент-креатора${niche ? ` в нише ${niche}` : ''}. Для каждой темы предложи 3 идеи постов/роликов.

Верни ТОЛЬКО JSON без Markdown:
[
  {
    "topic": "название тренда",
    "platform": "платформа",
    "ideas": ["идея 1", "идея 2", "идея 3"]
  }
]

Источники:
${rawTrends.map((r, i) => `${i + 1}. ${r.title}: ${r.snippet}`).join('\n')}`

    try {
        const result = await chatWithAI(prompt, [], 'ru')
        const text = result?.reply || ''
        let json = null
        try {
            json = JSON.parse(text)
        } catch {
            const match = text.match(/\[[\s\S]*\]/)
            if (match) json = JSON.parse(match[0])
        }

        if (Array.isArray(json) && json.length > 0) {
            return json.map(t => ({
                topic: t.topic,
                platform: t.platform || 'Social Media',
                date: new Date().toISOString(),
                ideas: Array.isArray(t.ideas) ? t.ideas.slice(0, 3) : [],
                source: 'ai',
            }))
        }
    } catch (err) {
        console.warn('[trendScanner] AI analysis failed:', err.message)
    }
    return null
}

export async function getTrends({ niche = '', userId = null, force = false } = {}) {
    if (!force && trendCache && Date.now() - trendCacheAt < CACHE_TTL_MS) {
        return { trends: trendCache, cached: true, source: 'cache' }
    }

    const raw = await fetchTrendsFromWeb(niche)
    let trends = null
    if (raw.length) {
        trends = await analyzeTrendsWithAI(raw, niche)
    }

    if (!trends || trends.length === 0) {
        trends = DEFAULT_TRENDS.map(t => ({ ...t, source: 'default' }))
    }

    trendCache = trends
    trendCacheAt = Date.now()

    // Save to OmegaMemory as facts (optional, fire-and-forget)
    if (userId) {
        try {
            await saveFact(userId, JSON.stringify({ type: 'trends', trends: trends.slice(0, 2) })).catch(() => {})
        } catch (err) {
            console.warn('[trendScanner] saveFact failed:', err.message)
        }
    }

    return { trends, cached: false, source: raw.length ? 'web+ai' : 'default' }
}

export function invalidateTrendCache() {
    trendCache = null
    trendCacheAt = 0
}

export default { getTrends, invalidateTrendCache }
