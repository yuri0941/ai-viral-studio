// [PLANCONFIG-ADMIN] Синхронный кэш PlanConfig для горячих путей (canUse, usageQuotaService).
// Асинхронная правда — PlanConfig в MongoDB; здесь — in-memory снапшот, обновляемый
// при старте сервера и при invalidatePlanCache() (enforceQuota). При недоступности БД — PLAN_DEFAULTS.
import PlanConfig, { PLAN_SEED } from '../models/PlanConfig.js'

// Дефолты = SEED из models/PlanConfig.js (текущие значения тарифов, НЕ менять)
export const PLAN_DEFAULTS = PLAN_SEED

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
