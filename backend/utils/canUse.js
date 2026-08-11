import { PLANS } from '../config/plans.js'

const OWNER_EMAIL = process.env.OWNER_EMAIL || ''

export function isOwner(user) {
    if (!user) return false
    if (user.role === 'owner') return true
    if (OWNER_EMAIL && user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) return true
    return false
}

export function getEffectivePlan(user) {
    if (!user) return PLANS.free
    const planId = user.subscription || 'free'
    return PLANS[planId] || PLANS.free
}

/**
 * Check whether a user may use a feature or resource.
 * @param {Object} user
 * @param {string} feature - plan key, e.g. 'generations', 'socials', 'projects', 'team', 'scheduler'
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
