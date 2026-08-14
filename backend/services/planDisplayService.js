// [P1.6-PREP] форматирование тарифов из PlanConfig для TG-ботов. Кэш ≤60 сек (hot-edit без деплоя).
import PlanConfig from '../models/PlanConfig.js'

const CACHE_TTL_MS = 60 * 1000
let cache = { lines: null, at: 0 }

const PLAN_LABELS = { free: 'Free', pro: 'Pro', agency: 'Agency' }
const FEATURE_LABELS = {
    publishAt: 'отложенный постинг',
    playlists: 'плейлисты',
    brandVoice: 'Brand Voice',
    abTesting: 'A/B тесты',
    analytics: 'аналитика',
    whiteLabel: 'White-label',
}

export async function getCachedPlansForBot() {
    if (cache.lines && Date.now() - cache.at < CACHE_TTL_MS) return cache.lines
    const plans = await PlanConfig.getAll()
    const lines = plans.map(p => {
        const label = PLAN_LABELS[p.plan] || p.plan
        const q = p.quotas || {}
        const parts = []
        if (q.generationsPerDay) parts.push(`${q.generationsPerDay} генераций/день`)
        if (q.youtubeUploadsPerDay) parts.push(`${q.youtubeUploadsPerDay} YouTube/день`)
        const activeFeatures = Object.entries(p.features || {})
            .filter(([, v]) => v)
            .map(([k]) => FEATURE_LABELS[k])
            .filter(Boolean)
        if (activeFeatures.length) parts.push(activeFeatures.join(', '))
        const price = Number(p.price) || 0
        return `• ${label} — ${price.toLocaleString('ru-RU')}₽/мес${parts.length ? ` (${parts.join(', ')})` : ''}`
    }).join('\n')
    cache = { lines, at: Date.now() }
    return lines
}

export function invalidatePlanDisplayCache() {
    cache = { lines: null, at: 0 }
}
