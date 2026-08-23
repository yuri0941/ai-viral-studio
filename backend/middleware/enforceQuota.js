import PlanConfig from '../models/PlanConfig.js'
import UsageQuota from '../models/UsageQuota.js'
import UploadSession from '../models/UploadSession.js'
import ScheduledPost from '../models/ScheduledPost.js'
import User from '../models/User.js'

// [25-TARIFF-GATES] simple in-memory cache for plan configs (5 min TTL)
const planCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function getPlan(planId) {
    const cached = planCache.get(planId)
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data
    const data = await PlanConfig.getPlan(planId)
    planCache.set(planId, { data, at: Date.now() })
    return data
}

export function invalidatePlanCache() {
    planCache.clear()
    // [PLANCONFIG-ADMIN] синхронный кэш (canUse/usageQuota) тоже обновляется
    import('../services/planConfigCache.js')
        .then(m => m.invalidatePlanConfigCache())
        .catch(() => { /* best-effort */ })
}

function isPrivileged(user) {
    return ['owner', 'admin', 'staff'].includes(user?.role)
}

function startOfDayUTC() {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

async function getUsage(userId, resource) {
    const today = startOfDayUTC()
    switch (resource) {
        case 'generations': {
            const quota = await UsageQuota.findOne({ userId }).lean()
            return quota?.generationsUsed || 0
        }
        case 'youtubeUploads': {
            return UploadSession.countDocuments({
                userId,
                status: { $in: ['active', 'completed'] },
                createdAt: { $gte: today }
            })
        }
        case 'scheduledPosts': {
            return ScheduledPost.countDocuments({
                userId,
                status: { $in: ['scheduled', 'publishing', 'published'] },
                createdAt: { $gte: today }
            })
        }
        case 'mediaQueueMB': {
            // Approximate: sum of active upload sessions file sizes
            const sessions = await UploadSession.find({
                userId,
                status: 'active',
                expiresAt: { $gt: new Date() }
            }).lean()
            const bytes = sessions.reduce((sum, s) => sum + (s.fileSize || 0), 0)
            return Math.round(bytes / (1024 * 1024))
        }
        default:
            return 0
    }
}

export function enforceQuota(resource) {
    return async (req, res, next) => {
        try {
            const user = req.user
            if (!user) return res.status(401).json({ success: false, error: 'unauthorized' })
            if (isPrivileged(user)) return next()

            const planId = user.subscription || 'free'
            const plan = await getPlan(planId)
            // [PLANCONFIG-ADMIN] fix: ключи квот PlanConfig — generationsPerDay/youtubeUploadsPerDay/scheduledPostsMax,
            // раньше читались как generations/youtubeUploads → лимит всегда был undefined (unlimited)
            const QUOTA_KEY = { generations: 'generationsPerDay', youtubeUploads: 'youtubeUploadsPerDay', scheduledPosts: 'scheduledPostsMax', mediaQueueMB: 'mediaQueueMB' }
            const limit = plan.quotas?.[QUOTA_KEY[resource] || resource]

            if (limit === undefined || limit === 0) {
                // 0 = unlimited (agency scheduledPosts) or not applicable
                return next()
            }

            const usage = await getUsage(user._id || user.id, resource)
            if (usage >= limit) {
                const upsellPlan = planId === 'free' ? await getPlan('pro') : await getPlan('agency')
                return res.status(402).json({
                    success: false,
                    error: 'quota_exceeded',
                    reason: `Лимит ${resource} исчерпан`,
                    limit,
                    usage,
                    upsell: {
                        plan: upsellPlan.plan,
                        price: upsellPlan.price,
                        currency: upsellPlan.currency || 'RUB',
                    },
                })
            }
            next()
        } catch (err) {
            console.error('[enforceQuota] error:', err.message)
            // Fail open: do not block legitimate users on quota check failure
            next()
        }
    }
}
