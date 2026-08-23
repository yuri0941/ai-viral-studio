// [PLANCONFIG-ADMIN] Лимиты/фичи тарифов — из PlanConfig (БД) через синхронный кэш.
// Legacy config/plans.js (Creator 2900/Pro 7900) удалён. Внешне используется только isOwner.
import { getPlanSync } from '../services/planConfigCache.js'

const OWNER_EMAIL = process.env.OWNER_EMAIL || ''

export function isOwner(user) {
    if (!user) return false
    if (user.role === 'owner') return true
    if (OWNER_EMAIL && user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) return true
    return false
}

// Плоская проекция PlanConfig под старые ключи (generations/socials/...);
// у PlanConfig нет аналогов projects/team/scheduler — такие ключи → undefined (falsy), как и раньше для неизвестных.
export function getEffectivePlan(user) {
    const planId = user?.subscription || 'free'
    const doc = getPlanSync(planId)
    return {
        id: doc.plan,
        name: doc.plan,
        priceRUB: doc.price ?? 0,
        priceUSD: 0,
        generations: doc.quotas?.generationsPerDay ?? 0,
        socials: doc.quotas?.youtubeChannels ?? 0,
    }
}

/**
 * Check whether a user may use a feature or resource.
 * @param {Object} user
 * @param {string} feature - plan key, e.g. 'generations', 'socials'
 * @returns {boolean}
 */
export function canUse(user, feature) {
    if (isOwner(user)) return true
    const plan = getEffectivePlan(user)
    if (feature === 'unlimited') return false
    return !!plan[feature]
}

export function getPlanLimit(user, feature) {
    if (isOwner(user)) return Infinity
    const plan = getEffectivePlan(user)
    return typeof plan[feature] === 'number' ? plan[feature] : 0
}

export function isWithinLimit(user, feature, currentCount) {
    if (isOwner(user)) return true
    const limit = getPlanLimit(user, feature)
    return currentCount < limit
}
