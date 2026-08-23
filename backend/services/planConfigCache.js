// [PLANCONFIG-ADMIN] Синхронный кэш PlanConfig для горячих путей (canUse, usageQuotaService).
// Асинхронная правда — PlanConfig в MongoDB; здесь — in-memory снапшот, обновляемый
// при старте сервера и при invalidatePlanCache() (enforceQuota). При недоступности БД — PLAN_DEFAULTS.
import PlanConfig from '../models/PlanConfig.js'

// Дефолты === SEED в models/PlanConfig.js (текущие значения тарифов, НЕ менять)
export const PLAN_DEFAULTS = [
  {
    plan: 'free',
    price: 0,
    currency: 'RUB',
    quotas: { generationsPerDay: 20, youtubeUploadsPerDay: 2, youtubeChannels: 1, mediaQueueMB: 500, scheduledPostsMax: 10, aiTagsPerDay: 5 },
    features: { publishAt: false, playlists: false, brandVoice: false, abTesting: false, analytics: false, whiteLabel: false },
  },
  {
    plan: 'pro',
    price: 990,
    currency: 'RUB',
    quotas: { generationsPerDay: 200, youtubeUploadsPerDay: 5, youtubeChannels: 3, mediaQueueMB: 5120, scheduledPostsMax: 100, aiTagsPerDay: 50 },
    features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true, whiteLabel: false },
  },
  {
    plan: 'agency',
    price: 4990,
    currency: 'RUB',
    quotas: { generationsPerDay: 1000, youtubeUploadsPerDay: 10, youtubeChannels: 10, mediaQueueMB: 25600, scheduledPostsMax: 0, aiTagsPerDay: 200 },
    features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true, whiteLabel: true },
  },
]

// Легаси-названия тарифов (Subscription enum: starter/creator/business/enterprise) → PlanConfig
const LEGACY_ALIASES = { creator: 'pro', business: 'agency', enterprise: 'agency', starter: 'free', basic: 'free' }

let cache = null // Array планов из БД; null = ещё не загружено (используем PLAN_DEFAULTS)

export function getPlansSync() {
  return cache || PLAN_DEFAULTS
}

export function getPlanSync(planId) {
  const id = LEGACY_ALIASES[planId] || planId || 'free'
  const plans = getPlansSync()
  return plans.find(p => p.plan === id) || plans.find(p => p.plan === 'free') || PLAN_DEFAULTS[0]
}

export async function refreshPlanCache() {
  try {
    const plans = await PlanConfig.getAll()
    if (Array.isArray(plans) && plans.length) cache = plans
  } catch (err) {
    console.warn('[planConfigCache] refresh failed, keeping previous cache:', err.message)
  }
}

export function invalidatePlanConfigCache() {
  // fire-and-forget: до завершения refresh синхронные читатели видят прошлый снапшот
  refreshPlanCache()
}
