// [HOTFIX-FINAL] Витрина пакетов кредитов: публичный список, покупка через ЮKassa
// (цена ТОЛЬКО с сервера, из CreditPack), owner-редактор цены с маржинальным полом.
import express from 'express'
import CreditPack from '../models/CreditPack.js'
import { Payment } from '../models/index.js'
import PriceChangeLog from '../models/PriceChangeLog.js'
import { protect, authorize } from '../middleware/auth.js'
import { createPayment } from '../services/yookassaService.js'
import { calcMargin } from '../services/marginService.js'

const router = express.Router()

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://aiviral-studio.ru').replace(/\/$/, '')

const packPublic = (p) => ({
    packId: p.packId,
    credits: p.credits,
    priceRub: p.priceRub,
    perCredit: Math.round((p.priceRub / p.credits) * 100) / 100,
})

// GET /api/credits/packs — публичная витрина (только активные)
router.get('/packs', async (req, res) => {
    try {
        const packs = await CreditPack.getAll()
        res.json({ success: true, packs: packs.filter(p => p.isActive).map(packPublic) })
    } catch (err) {
        console.error('[credits:packs]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// POST /api/credits/purchase { packId } — создание платежа ЮKassa на пакет.
// Цена и размер — из БД (клиент не влияет). Начисление — в webhook payment.succeeded.
router.post('/purchase', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const pack = await CreditPack.findOne({ packId: String(req.body?.packId || ''), isActive: true }).lean()
        if (!pack) return res.status(404).json({ success: false, error: 'pack_not_found' })

        const paymentDoc = await Payment.create({
            userId,
            planId: pack.packId,
            amount: pack.priceRub,
            currency: 'RUB',
            status: 'pending',
            description: `Пакет ${pack.credits} кредитов`,
            customerEmail: req.user?.email || undefined,
        })

        const payment = await createPayment({
            amount: pack.priceRub,
            currency: 'RUB',
            description: `AI Viral Studio: пакет ${pack.credits} кредитов`,
            returnUrl: `${FRONTEND_URL}/payment/success?paymentId=${paymentDoc._id}`,
            metadata: {
                userId: userId.toString(),
                planId: pack.packId,
                packId: pack.packId,
                credits: String(pack.credits),
                paymentDocId: paymentDoc._id.toString(),
            },
        })

        paymentDoc.yookassaPaymentId = payment.paymentId
        await paymentDoc.save()

        res.json({ success: true, confirmationUrl: payment.confirmationUrl, paymentId: paymentDoc._id })
    } catch (err) {
        console.error('[credits:purchase]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// GET /api/credits/packs-admin — владелец: все пакеты + маржа
router.get('/packs-admin', protect, authorize('owner'), async (req, res) => {
    try {
        const packs = await CreditPack.getAll()
        res.json({
            success: true,
            packs: packs.map(p => ({ ...packPublic(p), isActive: p.isActive, margin: calcMargin({ priceRub: p.priceRub, credits: p.credits }) })),
        })
    } catch (err) {
        console.error('[credits:packs-admin]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

// PUT /api/credits/packs/:packId — владелец: цена/активность пакета.
// Маржинальный пол: убыточная цена (маржа < 0) — 400; ниже пола 70% — только с allowLowMargin:true.
router.put('/packs/:packId', protect, authorize('owner'), async (req, res) => {
    try {
        const pack = await CreditPack.findOne({ packId: String(req.params.packId || '') })
        if (!pack) return res.status(404).json({ success: false, error: 'pack_not_found' })

        const changes = []
        if (req.body?.priceRub !== undefined) {
            const value = Number(req.body.priceRub)
            if (!Number.isFinite(value) || value < 1) {
                return res.status(400).json({ success: false, error: 'invalid_price' })
            }
            const margin = calcMargin({ priceRub: value, credits: pack.credits })
            if (margin.loss) {
                return res.status(400).json({ success: false, error: 'below_cost', margin })
            }
            if (margin.belowFloor && req.body?.allowLowMargin !== true) {
                return res.status(409).json({ success: false, error: 'below_margin_floor', margin })
            }
            if (pack.priceRub !== value) {
                changes.push({ what: `creditpack.${pack.packId}.price`, oldPrice: pack.priceRub, newPrice: value })
                pack.priceRub = value
            }
        }
        if (req.body?.isActive !== undefined) {
            const value = !!req.body.isActive
            if (pack.isActive !== value) {
                changes.push({ what: `creditpack.${pack.packId}.isActive`, oldPrice: pack.isActive ? 1 : 0, newPrice: value ? 1 : 0 })
                pack.isActive = value
            }
        }
        if (!changes.length) return res.json({ success: true, pack: packPublic(pack), changed: 0 })

        pack.updatedAt = new Date()
        await pack.save()
        await PriceChangeLog.insertMany(changes.map(c => ({
            ...c,
            source: 'cabinet',
            reason: req.body?.reason || 'credit pack update',
            changedBy: req.user?._id || req.user?.id,
        })))
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.creditpack.update', { packId: pack.packId, fields: changes.map(c => c.what) }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true, pack: { ...packPublic(pack), isActive: pack.isActive }, changed: changes.length })
    } catch (err) {
        console.error('[credits:put]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
