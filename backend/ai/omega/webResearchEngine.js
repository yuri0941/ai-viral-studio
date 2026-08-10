import { searchWithFallback } from './webSearch.js'
import { chatWithAI, extractText } from '../../services/aiService.js'
import { ResearchLog } from '../../models/ResearchLog.js'
import * as neuralGraph from './neuralGraph.js'
import User from '../../models/User.js'
import cron from 'node-cron'

export class WebResearchEngine {
    async researchTopic(topic, depth = 3) {
        const queries = [
            topic,
            `${topic} trends 2026`,
            `${topic} viral content`,
        ].slice(0, depth)

        const allSources = []
        for (const q of queries) {
            try {
                const res = await searchWithFallback(q)
                if (res?.sources) allSources.push(...res.sources)
            } catch (err) {
                console.warn('[webResearchEngine] search failed:', err.message)
            }
        }

        const unique = []
        const seen = new Set()
        for (const s of allSources) {
            const key = s.link || s.title
            if (!key || seen.has(key)) continue
            seen.add(key)
            unique.push({
                title: s.title || 'Untitled',
                url: s.link || '',
                confidence: Math.min(1, 0.5 + (s.snippet?.length || 0) / 500),
            })
        }

        const summary = unique.length
            ? `Найдено ${unique.length} источников по теме "${topic}".`
            : `Не удалось найти внешние источники по теме "${topic}".`

        let ideas = []
        try {
            const ai = await chatWithAI(`По теме "${topic}" вот источники:\n${unique.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}\n\nСгенерируй 3 идеи постов. Верни JSON массив строк.`, [], 'ru', { userRole: 'owner' })
            const reply = extractText(ai)
            const match = reply.match(/\[[\s\S]*\]/)
            ideas = match ? JSON.parse(match[0]) : []
        } catch (err) {
            console.warn('[webResearchEngine] ideas generation failed:', err.message)
        }

        const log = await ResearchLog.create({
            type: 'general',
            topic,
            summary,
            sources: unique.slice(0, 10),
            ideas: ideas.slice(0, 3),
            confidence: unique.length ? 0.7 : 0.2,
        })

        return { topic, summary, sources: unique, ideas, logId: log._id }
    }

    async autoResearch() {
        try {
            const users = await User.find({ niche: { $exists: true, $ne: '' } }).select('niche').limit(5).lean()
            const niches = [...new Set(users.map(u => u.niche).filter(Boolean))]
            const results = []
            for (const niche of niches) {
                for (const q of [`тренды ${niche} 2026`, `viral content ${niche}`, `best hooks ${niche}`]) {
                    const res = await this.researchTopic(q, 2)
                    res.sources.forEach(s => {
                        neuralGraph.addNode('trend', s.title, { topic: niche, url: s.url, confidence: s.confidence }, [], { accessLevel: 'public' })
                    })
                    await ResearchLog.findByIdAndUpdate(res.logId, { type: 'trend', addedToGraph: true })
                    results.push(res)
                }
            }
            return results
        } catch (err) {
            console.error('[webResearchEngine] autoResearch failed:', err.message)
            return []
        }
    }

    async competitorWatch(urls) {
        if (!Array.isArray(urls) || urls.length === 0) return []
        const results = []
        for (const url of urls) {
            try {
                const res = await searchWithFallback(`site:${url} new features pricing`)
                const summary = res?.sources?.length
                    ? `Конкурент ${url}: найдено ${res.sources.length} изменений.`
                    : `Конкурент ${url}: изменений не обнаружено.`
                const log = await ResearchLog.create({
                    type: 'competitor',
                    topic: url,
                    summary,
                    sources: (res?.sources || []).slice(0, 5).map(s => ({ title: s.title, url: s.link, confidence: 0.6 })),
                    confidence: 0.6,
                })
                results.push({ url, summary, logId: log._id })
            } catch (err) {
                console.warn('[webResearchEngine] competitorWatch failed for', url, err.message)
            }
        }
        return results
    }

    async learnFromInternet() {
        const topics = [
            'AI marketing trends 2026',
            'SMM automation best practices',
            'viral video algorithms',
        ]
        const results = []
        for (const topic of topics) {
            const res = await this.researchTopic(topic, 2)
            res.sources.forEach(s => {
                neuralGraph.addNode('tech', s.title, { url: s.url, confidence: s.confidence }, [], { accessLevel: 'public' })
            })
            await ResearchLog.findByIdAndUpdate(res.logId, { type: 'tech', addedToGraph: true })
            results.push(res)
        }
        return results
    }
}

const engine = new WebResearchEngine()

export function startWebResearchCrons() {
    cron.schedule('0 */6 * * *', () => {
        console.log('[webResearchEngine] running autoResearch')
        engine.autoResearch().catch(err => console.error(err))
    })
    cron.schedule('0 2 * * *', () => {
        console.log('[webResearchEngine] running competitorWatch')
        engine.competitorWatch([]).catch(err => console.error(err))
    })
    cron.schedule('0 */12 * * *', () => {
        console.log('[webResearchEngine] running learnFromInternet')
        engine.learnFromInternet().catch(err => console.error(err))
    })
}

export default engine
