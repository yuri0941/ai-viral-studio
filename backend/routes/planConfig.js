// [P1.6-PREP] PlanConfig API: публичный снапшот тарифов для лендинга/ботов +
// редактирование лимитов и фич владельцем (кабинет PricingTab). Цены — как раньше через /api/owner/pricing.
import express from 'express'
import PlanConfig from '../models/PlanConfig.js'
import PriceChangeLog from '../models/PriceChangeLog.js'
import { protect, authorize } from '../middleware/auth.js'
import { invalidatePlanCache } from '../middleware/enforceQuota.js'

const router = express.Router()

const QUOTA_FIELDS = ['generationsPerDay', 'youtubeUploadsPerDay', 'youtubeChannels', 'mediaQueueMB', 'scheduledPostsMax', 'aiTagsPerDay']
const FEATURE_FIELDS = ['publishAt', 'playlists', 'brandVoice', 'abTesting', 'analytics', 'whiteLabel']

// GET /api/plan-config — публично: цены, лимиты, фичи (источник истины для лендинга и omegaBot)
router.get('/', async (req, res) => {
    try {
        const plans = await PlanConfig.getAll()
        res.json({
            success: true,
            plans: plans.map(p => ({
                plan: p.plan,
                price: p.price,
                currency: p.currency || 'RUB',
                quotas: p.quotas || {},
                features: p.features || {},
            })),
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// PUT /api/plan-config/:plan — владелец: лимиты и/или фичи тарифа.
// Каждое изменение — запись в PriceChangeLog (фичи как 0/1) + аудит.
router.put('/:plan', protect, authorize('owner'), async (req, res) => {
    try {
        const planId = String(req.params.plan || '').toLowerCase()
        const doc = await PlanConfig.findOne({ plan: planId })
        if (!doc) return res.status(404).json({ success: false, error: 'plan_not_found' })

        const changes = []
        const quotas = req.body?.quotas || {}
        for (const field of QUOTA_FIELDS) {
            if (quotas[field] === undefined) continue
            const value = Number(quotas[field])
            if (!Number.isFinite(value) || value < 0) {
                return res.status(400).json({ success: false, error: `invalid_quota_${field}` })
            }
            const old = Number(doc.quotas?.[field] ?? 0)
            if (old !== value) {
                doc.quotas[field] = value
                changes.push({ what: `tariff.${planId}.${field}`, oldPrice: old, newPrice: value })
            }
        }
        const features = req.body?.features || {}
        for (const field of FEATURE_FIELDS) {
            if (features[field] === undefined) continue
            const value = !!features[field]
            const old = !!doc.features?.[field]
            if (old !== value) {
                doc.features[field] = value
                changes.push({ what: `tariff.${planId}.feature.${field}`, oldPrice: old ? 1 : 0, newPrice: value ? 1 : 0 })
            }
        }

        if (!changes.length) return res.json({ success: true, plan: doc, changed: 0 })

        await doc.save()
        invalidatePlanCache()

        const actor = `cabinet:${req.user?.email || req.user?._id}`
        await PriceChangeLog.insertMany(changes.map(c => ({
            ...c,
            source: 'cabinet',
            reason: req.body?.reason || 'quota/feature update',
            changedBy: req.user?._id || req.user?.id,
        })))
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.plan.update', { plan: planId, fields: changes.map(c => c.what) }, 'ok', actor)

        res.json({ success: true, plan: doc, changed: changes.length })
    } catch (err) {
        console.error('[plan-config:put]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
