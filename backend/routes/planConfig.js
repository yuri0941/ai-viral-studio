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
// [PLANCONFIG-ADMIN] + featureList (RU/EN) и founding (скидка/слоты из FoundingConfig)
router.get('/', async (req, res) => {
    try {
        const plans = await PlanConfig.getAll()
        const { getFoundingConfig } = await import('../services/foundingService.js')
        const founding = await getFoundingConfig()
        res.json({
            success: true,
            plans: plans.map(p => ({
                plan: p.plan,
                price: p.price,
                currency: p.currency || 'RUB',
                quotas: p.quotas || {},
                features: p.features || {},
                featureList: p.featureList || { ru: [], en: [] },
            })),
            founding: { discountPercent: founding.discountPercent, totalSlots: founding.totalSlots },
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// [PLANCONFIG-ADMIN] PUT /api/plan-config/founding — владелец: скидка и слоты founding-программы.
// ВАЖНО: роут объявлен ДО '/:plan', иначе 'founding' попадёт в :plan.
router.put('/founding', protect, authorize('owner'), async (req, res) => {
    try {
        const { discountPercent, totalSlots, reason } = req.body || {}
        const FoundingConfig = (await import('../models/FoundingConfig.js')).default
        const cfg = await FoundingConfig.findOne({ key: 'founding' }) || new FoundingConfig({ key: 'founding' })
        const changes = []
        if (discountPercent !== undefined) {
            const v = Number(discountPercent)
            if (!Number.isFinite(v) || v < 1 || v > 90) {
                return res.status(400).json({ success: false, error: 'invalid_discount_percent' })
            }
            if (cfg.discountPercent !== v) {
                changes.push({ what: 'founding.discountPercent', oldPrice: cfg.discountPercent, newPrice: v })
                cfg.discountPercent = v
            }
        }
        if (totalSlots !== undefined) {
            const v = Number(totalSlots)
            if (!Number.isFinite(v) || v < 0 || v > 10000 || !Number.isInteger(v)) {
                return res.status(400).json({ success: false, error: 'invalid_total_slots' })
            }
            if (cfg.totalSlots !== v) {
                changes.push({ what: 'founding.totalSlots', oldPrice: cfg.totalSlots, newPrice: v })
                cfg.totalSlots = v
            }
        }
        if (!changes.length) return res.json({ success: true, founding: cfg, changed: 0 })
        await cfg.save()
        FoundingConfig.invalidateFoundingCache()
        const actor = `cabinet:${req.user?.email || req.user?._id}`
        await PriceChangeLog.insertMany(changes.map(c => ({
            ...c,
            source: 'cabinet',
            reason: reason || 'founding config update',
            changedBy: req.user?._id || req.user?.id,
        })))
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.founding.update', { fields: changes.map(c => c.what) }, 'ok', actor)
        res.json({ success: true, founding: cfg, changed: changes.length })
    } catch (err) {
        console.error('[plan-config:founding]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// [PLANCONFIG-ADMIN] GET /api/plan-config/history?plan=&limit=20 — история изменений (кто/когда/что)
router.get('/history', protect, authorize('owner'), async (req, res) => {
    try {
        const plan = String(req.query.plan || '').toLowerCase()
        const limit = Math.min(Number(req.query.limit) || 20, 50)
        const filter = plan ? { what: { $regex: `^(tariff\\.${plan}\\.|founding\\.)` } } : {}
        const history = await PriceChangeLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('changedBy', 'email')
            .lean()
        res.json({
            success: true,
            history: history.map(h => ({
                _id: h._id,
                what: h.what,
                oldPrice: h.oldPrice,
                newPrice: h.newPrice,
                source: h.source,
                reason: h.reason,
                changedBy: h.changedBy?.email || h.changedBy || null,
                createdAt: h.createdAt,
                hasSnapshot: !!h.analysisSnapshot?.oldFeatureList,
            })),
        })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// [PLANCONFIG-ADMIN] POST /api/plan-config/:plan/rollback { logId } — откатить одну запись истории
router.post('/:plan/rollback', protect, authorize('owner'), async (req, res) => {
    try {
        const planId = String(req.params.plan || '').toLowerCase()
        const log = await PriceChangeLog.findById(req.body?.logId).lean()
        if (!log) return res.status(404).json({ success: false, error: 'log_not_found' })
        const m = String(log.what).match(/^tariff\.([a-z]+)\.(.+)$/)
        if (!m || m[1] !== planId) return res.status(400).json({ success: false, error: 'log_plan_mismatch' })
        const field = m[2]
        const doc = await PlanConfig.findOne({ plan: planId })
        if (!doc) return res.status(404).json({ success: false, error: 'plan_not_found' })

        let rolled = null
        if (field === 'price') {
            rolled = { price: log.oldPrice }
            doc.price = log.oldPrice
        } else if (field === 'featureList') {
            const oldList = log.analysisSnapshot?.oldFeatureList
            if (!oldList) return res.status(400).json({ success: false, error: 'snapshot_missing' })
            rolled = { featureList: oldList }
            doc.featureList = oldList
        } else if (field.startsWith('feature.')) {
            const f = field.slice('feature.'.length)
            if (!FEATURE_FIELDS.includes(f)) return res.status(400).json({ success: false, error: 'unknown_field' })
            rolled = { [f]: !!log.oldPrice }
            doc.features[f] = !!log.oldPrice
        } else if (QUOTA_FIELDS.includes(field)) {
            rolled = { [field]: log.oldPrice }
            doc.quotas[field] = log.oldPrice
        } else {
            return res.status(400).json({ success: false, error: 'unknown_field' })
        }

        await doc.save()
        invalidatePlanCache()
        await PriceChangeLog.create({
            what: log.what,
            oldPrice: log.newPrice,
            newPrice: log.oldPrice,
            source: 'cabinet',
            reason: `rollback of ${log._id}`,
            changedBy: req.user?._id || req.user?.id,
            analysisSnapshot: log.analysisSnapshot?.oldFeatureList ? { oldFeatureList: doc.featureList } : undefined,
        })
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.plan.rollback', { plan: planId, what: log.what }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true, plan: doc, rolledBack: log.what, applied: rolled })
    } catch (err) {
        console.error('[plan-config:rollback]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// PUT /api/plan-config/:plan — владелец: цена, лимиты, фичи и список «что входит» тарифа.
// Каждое изменение — запись в PriceChangeLog + аудит + invalidatePlanCache (hot-reload без деплоя).
router.put('/:plan', protect, authorize('owner'), async (req, res) => {
    try {
        const planId = String(req.params.plan || '').toLowerCase()
        const doc = await PlanConfig.findOne({ plan: planId })
        if (!doc) return res.status(404).json({ success: false, error: 'plan_not_found' })

        const changes = []

        // [PLANCONFIG-ADMIN] цена: платный тариф > 0, free = 0
        if (req.body?.price !== undefined) {
            const value = Number(req.body.price)
            if (!Number.isFinite(value) || value < 0 || (planId !== 'free' && value <= 0)) {
                return res.status(400).json({ success: false, error: 'invalid_price' })
            }
            const old = Number(doc.price ?? 0)
            if (old !== value) {
                doc.price = value
                changes.push({ what: `tariff.${planId}.price`, oldPrice: old, newPrice: value })
            }
        }

        const quotas = req.body?.quotas || {}
        for (const field of QUOTA_FIELDS) {
            if (quotas[field] === undefined) continue
            const value = Number(quotas[field])
            if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
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

        // [PLANCONFIG-ADMIN] список «что входит» RU/EN: до 20 строк, каждая ≤ 120 символов
        let featureListSnapshot
        if (req.body?.featureList !== undefined) {
            const fl = req.body.featureList || {}
            for (const lang of ['ru', 'en']) {
                const list = fl[lang]
                if (list === undefined) continue
                if (!Array.isArray(list) || list.length > 20 || list.some(s => typeof s !== 'string' || s.length > 120)) {
                    return res.status(400).json({ success: false, error: 'invalid_featurelist' })
                }
            }
            const oldList = { ru: doc.featureList?.ru || [], en: doc.featureList?.en || [] }
            const newList = { ru: fl.ru ?? oldList.ru, en: fl.en ?? oldList.en }
            if (JSON.stringify(oldList) !== JSON.stringify(newList)) {
                featureListSnapshot = { oldFeatureList: oldList }
                doc.featureList = newList
                changes.push({ what: `tariff.${planId}.featureList`, oldPrice: oldList.ru.length, newPrice: newList.ru.length })
            }
        }

        if (!changes.length) return res.json({ success: true, plan: doc, changed: 0 })

        await doc.save()
        invalidatePlanCache()

        const actor = `cabinet:${req.user?.email || req.user?._id}`
        await PriceChangeLog.insertMany(changes.map(c => ({
            ...c,
            source: 'cabinet',
            reason: req.body?.reason || 'plan update',
            changedBy: req.user?._id || req.user?.id,
            ...(c.what.endsWith('.featureList') && featureListSnapshot ? { analysisSnapshot: featureListSnapshot } : {}),
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
