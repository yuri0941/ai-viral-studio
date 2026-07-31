import { getAgents, getAgentByName } from './agentsRegistry.js'
import { incrementUsage, maybeUnlockSkill } from './skillsSystem.js'
import axios from 'axios'

const KEYWORD_AGENT_MAP = [
    { keywords: ['тренд', 'тренды', 'trend', 'новость', 'новости', 'актуально', 'сейчас', '2026', 'хайп'], agents: ['TrendScout'] },
    { keywords: ['конкурент', 'конкуренты', 'конкуренция', 'competitor', 'анализ конкурентов', 'шпион'], agents: ['CompetitorSpy'] },
    { keywords: ['пост', 'контент', 'скрипт', 'хук', 'description', 'hashtag', 'seo', 'идея контента', ' reels'], agents: ['ContentForge'] },
    { keywords: ['прогноз', 'predict', 'вирусность', 'viral', 'шанс', 'рейтинг', 'score'], agents: ['ViralPredictor'] },
]

function mockSkillResult(skill, query) {
    const mocks = {
        google_trends: `Google Trends: запрос "${query}" — рост интереса +12% за 7 дней.`,
        tiktok_api: `TikTok: по "${query}" топ-хештеги #viral #trend2026, средний охват 450K.`,
        news_parser: `Новости: найдено 3 источника по "${query}" — рост упоминаний.`,
        instagram_scraper: `Instagram: у конкурентов по "${query}" средний ER 4.2%, лучшие посты — Reels.`,
        youtube_api: `YouTube: по "${query}" лидируют Shorts, CTR 9.1%.`,
        copywriting: `Копрайтинг: для "${query}" рекомендуется короткий хук с цифрами.`,
        seo: `SEO: ключевые слова для "${query}" — ${query}, viral, 2026, how to.`,
        hashtags: `Хештеги: #${query.replace(/\s+/g, '')} #trend #content.`,
        analytics: `Аналитика: по "${query}" прогноз охвата 120K за 48 часов.`,
        ml_score: `ML Score: вирусный потенциал "${query}" — 73/100.`,
    }
    return mocks[skill] || `Результат навыка ${skill} для "${query}"`
}

export function analyzeQuery(query) {
    const lower = (query || '').toLowerCase()
    const selected = new Set()
    for (const group of KEYWORD_AGENT_MAP) {
        if (group.keywords.some(k => lower.includes(k.toLowerCase()))) {
            group.agents.forEach(a => selected.add(a))
        }
    }
    return Array.from(selected)
}

export async function runAgent(agentName, query) {
    const agent = await getAgentByName(agentName)
    if (!agent) return { agent: agentName, error: 'Agent not found' }
    if (agent.status !== 'active') return { agent: agentName, status: 'paused', results: [] }

    const results = await Promise.all(
        agent.skills.map(async skill => {
            // In a real system each skill would call its own API/scraper.
            return {
                skill,
                result: mockSkillResult(skill, query),
            }
        })
    )

    await incrementUsage(agentName)
    await maybeUnlockSkill(agentName)

    return {
        agent: agent.name,
        role: agent.role,
        level: agent.level,
        results,
    }
}

export async function runAgentsForQuery(query) {
    const names = analyzeQuery(query)
    if (names.length === 0) return []
    const results = await Promise.all(names.map(name => runAgent(name, query)))
    return results
}

export function formatAgentResults(results) {
    if (!results || results.length === 0) return ''
    return results.map(r => {
        const lines = r.results.map(s => `- ${s.skill}: ${s.result}`).join('\n')
        return `Агент ${r.agent} (Lv.${r.level}):\n${lines}`
    }).join('\n\n')
}

export default { analyzeQuery, runAgent, runAgentsForQuery, formatAgentResults }
