import { UsageQuota } from '../models/index.js'
import User from '../models/User.js'
import { PLANS } from '../config/plans.js'

// [MONETIZE-2026-08-04] updated: unified plan limits from config
const DEFAULT_LIMITS = {
    free: PLANS.free.generations,
    creator: PLANS.creator.generations,
    pro: PLANS.pro.generations,
    agency: PLANS.agency.generations,
}

export async function getOrCreateQuota(userId, plan = null) {
    let quota = await UsageQuota.findOne({ userId })
    if (!quota) {
        let effectivePlan = plan
        if (!effectivePlan) {
            try {
                const user = await User.findById(userId).select('subscription').lean()
                effectivePlan = user?.subscription || 'free'
            } catch {
                effectivePlan = 'free'
            }
        }
        if (!PLANS[effectivePlan]) effectivePlan = 'free'
        quota = await UsageQuota.create({
            userId,
            plan: effectivePlan,
            generationsLimit: DEFAULT_LIMITS[effectivePlan] || PLANS.free.generations,
            cycleStartedAt: new Date(),
            cycleEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
    }
    return quota
}

export async function checkQuota(userId) {
    const quota = await getOrCreateQuota(userId)
    const remaining = Math.max(0, quota.generationsLimit - quota.generationsUsed)
    const overageAllowed = quota.plan === 'agency' || quota.plan === 'enterprise'
    const blocked = remaining === 0 && !overageAllowed
    return {
        used: quota.generationsUsed,
        limit: quota.generationsLimit,
        remaining,
        overageUsed: quota.overageUsed,
        overageCost: quota.overageCost,
        topUpPackSize: quota.topUpPackSize,
        topUpPackPrice: quota.topUpPackPrice,
        plan: quota.plan,
        blocked,
        overageAllowed,
        cycleEndsAt: quota.cycleEndsAt,
    }
}

export async function consumeGeneration(userId, userRole = null) {
    if (['owner', 'admin', 'staff'].includes(userRole)) {
        return { allowed: true, remaining: Infinity, unlimited: true }
    }
    const quota = await getOrCreateQuota(userId)
    if (quota.generationsUsed < quota.generationsLimit) {
        quota.generationsUsed += 1
    } else {
        quota.overageUsed += 1
    }
    await quota.save()
    return checkQuota(userId)
}

export async function topUpGenerations(userId, packs = 1) {
    const quota = await getOrCreateQuota(userId)
    quota.generationsLimit += quota.topUpPackSize * packs
    await quota.save()
    return checkQuota(userId)
}

export async function resetQuotaCycle(userId) {
    const quota = await getOrCreateQuota(userId)
    quota.generationsUsed = 0
    quota.overageUsed = 0
    quota.cycleStartedAt = new Date()
    quota.cycleEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await quota.save()
    return checkQuota(userId)
}

export async function updateQuotaSettings({ plan, generationsLimit, overageCost, topUpPackSize, topUpPackPrice }) {
    const update = {}
    if (plan) update.plan = plan
    if (typeof generationsLimit === 'number') update.generationsLimit = generationsLimit
    if (typeof overageCost === 'number') update.overageCost = overageCost
    if (typeof topUpPackSize === 'number') update.topUpPackSize = topUpPackSize
    if (typeof topUpPackPrice === 'number') update.topUpPackPrice = topUpPackPrice
    await UsageQuota.updateMany({}, { $set: update })
    return { updated: true }
}

export default {
    getOrCreateQuota,
    checkQuota,
    consumeGeneration,
    topUpGenerations,
    resetQuotaCycle,
    updateQuotaSettings,
}
