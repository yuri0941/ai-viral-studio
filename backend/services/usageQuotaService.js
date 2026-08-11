import { UsageQuota } from '../models/index.js'
import User from '../models/User.js'
import { PLANS } from '../config/plans.js'
import { isOwner } from '../utils/canUse.js'

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
    try {
        const user = await User.findById(userId).select('role email').lean()
        if (isOwner(user)) {
            return { used: 0, limit: Infinity, remaining: Infinity, overageUsed: 0, overageCost: 0, topUpPackSize: 0, topUpPackPrice: 0, plan: 'owner', blocked: false, overageAllowed: true, cycleEndsAt: null }
        }
    } catch { /* ignore */ }
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

export async function consumeGeneration(userId, userRole = null, { isInfoQuery = false } = {}) {
    if (isOwner({ role: userRole })) {
        return { allowed: true, remaining: Infinity, unlimited: true }
    }
    const quota = await getOrCreateQuota(userId)

    // [v9.9.2-MASTER-FIX] Smart quota: info/help/navigation queries don't consume tokens
    if (isInfoQuery) {
        return { ...await checkQuota(userId), allowed: true, infoQuery: true, consumed: false }
    }

    // [v9.9.2-MASTER-FIX] Trial token system for free users
    if (quota.plan === 'free' || !quota.plan) {
        if ((quota.trialTokens || 0) > 0) {
            quota.trialTokens = (quota.trialTokens || 0) - 1
            quota.trialUsed = (quota.trialUsed || 0) + 1
            await quota.save()
            return {
                ...await checkQuota(userId),
                allowed: true,
                consumed: true,
                trialTokens: quota.trialTokens,
                trialUsed: quota.trialUsed,
            }
        }
        return {
            ...await checkQuota(userId),
            allowed: false,
            blocked: true,
            code: 'TRIAL_EXHAUSTED',
            message: '⚡️ Лимит генераций исчерпан. Перейдите на платный тариф.',
            upgradeUrl: '/pricing',
            trialTokens: 0,
        }
    }

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
