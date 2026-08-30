import express from 'express'
import Addon from '../models/Addon.js'
import UserAddon from '../models/UserAddon.js'
import { protect, authorize } from '../middleware/auth.js'
import AuditLog from '../models/AuditLog.js'
import { analyzeAddonMarket, generatePricingReport } from '../services/aiPricingService.js'

const router = express.Router()

async function getOrSeedAddons() {
    const count = await Addon.countDocuments()
    if (count > 0) return
    await Addon.insertMany([
        { id: 'ai-designer', name: 'AI Дизайнер', description: 'Генерация обложек, баннеров, логотипов.', price: 290, basePrice: 290, currency: 'RUB', category: 'design', icon: '🎨', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'ai-video', name: 'AI Видео', description: 'Shorts/Reels из текста.', price: 990, basePrice: 990, currency: 'RUB', category: 'video', icon: '🎥', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'extra-agents', name: 'Дополнительные агенты', description: '+10 агентов в Swarm.', price: 490, basePrice: 490, currency: 'RUB', category: 'agents', icon: '🤖', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'analytics-pro', name: 'Аналитика Pro', description: 'Глубокая аналитика, отчёты, экспорт.', price: 490, basePrice: 490, currency: 'RUB', category: 'analytics', icon: '📊', isActive: true, requiresPlan: ['Pro', 'Agency', 'Business'] },
        { id: 'integrations-pro', name: 'Интеграции Pro', description: 'WhatsApp, Slack, Notion, Shopify.', price: 290, basePrice: 290, currency: 'RUB', category: 'integrations', icon: '🔗', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'white-label', name: 'White-Label', description: 'Скрыть бренд, CNAME, свой логотип.', price: 1990, basePrice: 1990, currency: 'RUB', category: 'white-label', icon: '🌐', isActive: true, requiresPlan: ['Agency'] },
    ])
}

router.get('/addons', async (req, res) => {
    try {
        await getOrSeedAddons()
        const addons = await Addon.find({ isActive: true }).lean()
        res.json({ success: true, addons })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/my-addons', protect, async (req, res) => {
    try {
        const list = await UserAddon.find({ userId: req.user._id, status: 'active', expiresAt: { $gt: new Date() } }).lean()
        const addonIds = list.map(l => l.addonId)
        const addons = await Addon.find({ id: { $in: addonIds } }).lean()
        // [ADDONS-SEMANTICS] состав: живой список (добавления — сразу всем) + снапшот покупки
        // (удалённые позиции сохраняются активному подписчику до expiresAt)
        res.json({ success: true, addons: list.map(l => {
            const addon = addons.find(a => a.id === l.addonId)
            if (!addon) return { ...l, addon }
            const merged = [...new Set([...(addon.includes || []), ...(l.includesSnapshot || [])])]
            return { ...l, addon: { ...addon, includes: merged } }
        }) })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/addons/:id/purchase', protect, async (req, res) => {
    try {
        await getOrSeedAddons()
        const { id } = req.params
        const addon = await Addon.findOne({ id, isActive: true }).lean()
        if (!addon) return res.status(404).json({ success: false, error: 'Аддон не найден' })

        const existing = await UserAddon.findOne({ userId: req.user._id, addonId: id, status: 'active', expiresAt: { $gt: new Date() } })
        if (existing) return res.status(400).json({ success: false, error: 'Аддон уже подключен' })

        const { provider = 'yookassa' } = req.body

        // [CLIENT-JOURNEY-QA] ручная активация без оплаты — только owner/admin (демо/тест).
        // Раньше ЛЮБОЙ клиент активировал аддон бесплатно (paymentId 'manual').
        if (provider === 'manual') {
            if (!['owner', 'admin'].includes(req.user.role)) {
                return res.status(403).json({ success: false, error: 'Ручная активация доступна только владельцу' })
            }
            const userAddon = await UserAddon.findOneAndUpdate(
                { userId: req.user._id, addonId: id },
                { $set: { price: addon.price, currency: addon.currency, paymentProvider: 'manual', paymentId: 'manual', status: 'active', purchasedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), includesSnapshot: addon.includes || [] } },
                { upsert: true, new: true }
            )
            return res.json({ success: true, addon: userAddon })
        }

        // [CLIENT-JOURNEY-QA] реальная оплата аддона через ЮKassa — как у тарифов:
        // pending-запись, активация webhook'ом payment.succeeded (metadata.addonId).
        if (provider === 'yookassa') {
            const { getProviderKey } = await import('../services/aiService.js')
            const shopId = await getProviderKey('yookassa_shop_id')
            const secret = await getProviderKey('yookassa_secret')
            if (!shopId || !secret) {
                return res.status(400).json({ success: false, error: 'ЮKassa не настроена. Кабинет → API Ключи → yookassa' })
            }

            const { createPayment } = await import('../services/yookassaService.js')
            const returnBase = (process.env.FRONTEND_URL || 'https://aiviral-studio.ru').replace(/\/$/, '')
            const price = Math.max(1, Math.round(Number(addon.price) || 0))
            const receipt = req.user?.email
                ? {
                    customer: { email: req.user.email },
                    items: [{
                        description: `Аддон ${addon.name}, 1 мес`.slice(0, 128),
                        quantity: '1.00',
                        amount: { value: price.toFixed(2), currency: 'RUB' },
                        vat_code: 1,
                        payment_mode: 'full_payment',
                        payment_subject: 'service',
                    }],
                }
                : null

            const payment = await createPayment({
                amount: price,
                currency: addon.currency || 'RUB',
                description: `Аддон ${addon.name} — AI Viral Studio`,
                returnUrl: `${returnBase}/payment/success?addon=${id}`,
                receipt,
                metadata: { userId: String(req.user._id), addonId: id, addonPrice: price, purchaseType: 'addon' },
            })

            await UserAddon.findOneAndUpdate(
                { userId: req.user._id, addonId: id },
                { $set: { price, currency: addon.currency || 'RUB', paymentProvider: 'yookassa', paymentId: payment.paymentId, status: 'pending', includesSnapshot: addon.includes || [] } },
                { upsert: true, new: true }
            )

            return res.json({ success: true, paymentUrl: payment.confirmationUrl, paymentId: payment.paymentId })
        }

        return res.status(400).json({ success: false, error: 'Для аддонов доступна только оплата через ЮKassa' })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.delete('/my-addons/:id', protect, async (req, res) => {
    try {
        const doc = await UserAddon.findOne({ userId: req.user._id, addonId: req.params.id, status: 'active' })
        if (!doc) return res.status(404).json({ success: false, error: 'Не найдено' })
        const now = new Date()
        const total = doc.expiresAt.getTime() - doc.purchasedAt.getTime()
        const remaining = doc.expiresAt.getTime() - now.getTime()
        const refundAmount = remaining > 0 && total > 0 ? Math.round(doc.price * (remaining / total)) : 0
        doc.status = 'canceled'
        await doc.save()
        res.json({ success: true, refundAmount, currency: doc.currency })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// [v7.1-ADDON-PRICING] Owner price management
// [ADDONS-MARKETPLACE-RESTORE] редактирование аддонов ЦЕЛИКОМ — строго authorize('owner'):
// admin и все остальные роли → 403. Полный редактор: цена, название, описание, состав, вкл/выкл.
router.patch('/addons/:id/price', protect, authorize('owner'), async (req, res) => {
    try {
        await getOrSeedAddons()
        const { price, currency, discountPercent, paymentMethods, name, description, includes, isActive } = req.body
        const before = await Addon.findOne({ id: req.params.id }).lean()
        if (!before) return res.status(404).json({ success: false, error: 'Аддон не найден' })
        const $set = {}
        if (price !== undefined) {
            $set.price = Number(price)
            $set['ownerPriceConfig.customPrice'] = Number(price)
        }
        if (currency !== undefined) {
            $set.currency = currency || 'RUB'
            $set['ownerPriceConfig.customCurrency'] = currency || 'RUB'
        }
        if (discountPercent !== undefined) $set['ownerPriceConfig.discountPercent'] = Math.min(100, Math.max(0, Number(discountPercent) || 0))
        if (paymentMethods) $set.paymentMethods = paymentMethods
        if (name !== undefined) $set.name = String(name).trim().slice(0, 120)
        if (description !== undefined) $set.description = String(description).trim().slice(0, 500)
        if (Array.isArray(includes)) $set.includes = includes.map(s => String(s).trim()).filter(Boolean).slice(0, 20)
        if (isActive !== undefined) $set.isActive = Boolean(isActive)
        const addon = await Addon.findOneAndUpdate({ id: req.params.id }, { $set }, { new: true })
        // AuditLog: кто/что менял, diff до/после
        try {
            await AuditLog.create({
                action: 'owner.addon_update',
                user: String(req.user.email || req.user._id),
                userId: req.user._id,
                type: 'owner',
                severity: 'medium',
                metadata: { addonId: req.params.id, changes: $set, before: { price: before.price, name: before.name, isActive: before.isActive } },
                timestamp: new Date(),
            })
        } catch (auditErr) {
            console.warn('[addons] audit log failed:', auditErr.message)
        }
        res.json({ success: true, addon })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// [ADDONS-MARKETPLACE-RESTORE] список для редактора owner — ВСЕ аддоны, включая выключенные
router.get('/addons/pricing-config', protect, authorize('owner'), async (req, res) => {
    try {
        await getOrSeedAddons()
        const addons = await Addon.find({}).lean()
        res.json({ success: true, addons })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/addons/:id/reset-price', protect, authorize('owner'), async (req, res) => {
    try {
        await getOrSeedAddons()
        const addon = await Addon.findOne({ id: req.params.id })
        if (!addon) return res.status(404).json({ success: false, error: 'Аддон не найден' })
        addon.price = addon.basePrice || addon.price
        addon.ownerPriceConfig.customPrice = null
        addon.ownerPriceConfig.discountPercent = 0
        await addon.save()
        res.json({ success: true, addon })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/addons/:id/analyze-price', protect, authorize('owner'), async (req, res) => {
    try {
        await getOrSeedAddons()
        const addon = await Addon.findOne({ id: req.params.id }).lean()
        if (!addon) return res.status(404).json({ success: false, error: 'Аддон не найден' })
        const analysis = await analyzeAddonMarket(addon, req.user.role)
        await Addon.findOneAndUpdate(
            { id: req.params.id },
            {
                $set: {
                    'ownerPriceConfig.aiRecommendedPrice': analysis.recommendedPrice,
                    'ownerPriceConfig.aiRecommendationReason': analysis.reasoning,
                    'ownerPriceConfig.lastAnalyzed': new Date(),
                },
            }
        )
        res.json({ success: true, analysis })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/addons/pricing-report', protect, authorize('owner'), async (req, res) => {
    try {
        const report = await generatePricingReport()
        res.json({ success: true, report })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
