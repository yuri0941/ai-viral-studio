import express from 'express'
import Addon from '../models/Addon.js'
import UserAddon from '../models/UserAddon.js'
import { protect, requireRole } from '../middleware/auth.js'
import Stripe from 'stripe'
import { analyzeAddonMarket, generatePricingReport } from '../services/aiPricingService.js'

const router = express.Router()

async function getOrSeedAddons() {
    const count = await Addon.countDocuments()
    if (count > 0) return
    await Addon.insertMany([
        { id: 'ai-designer', name: 'AI Дизайнер', description: 'Генерация обложек, баннеров, логотипов.', price: 290, currency: 'RUB', category: 'design', icon: '🎨', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'ai-video', name: 'AI Видео', description: 'Shorts/Reels из текста.', price: 990, currency: 'RUB', category: 'video', icon: '🎥', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'extra-agents', name: 'Дополнительные агенты', description: '+10 агентов в Swarm.', price: 490, currency: 'RUB', category: 'agents', icon: '🤖', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'analytics-pro', name: 'Аналитика Pro', description: 'Глубокая аналитика, отчёты, экспорт.', price: 490, currency: 'RUB', category: 'analytics', icon: '📊', isActive: true, requiresPlan: ['Pro', 'Agency', 'Business'] },
        { id: 'integrations-pro', name: 'Интеграции Pro', description: 'WhatsApp, Slack, Notion, Shopify.', price: 290, currency: 'RUB', category: 'integrations', icon: '🔗', isActive: true, requiresPlan: ['Pro', 'Agency'] },
        { id: 'white-label', name: 'White-Label', description: 'Скрыть бренд, CNAME, свой логотип.', price: 1990, currency: 'RUB', category: 'white-label', icon: '🌐', isActive: true, requiresPlan: ['Agency'] },
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
        res.json({ success: true, addons: list.map(l => ({ ...l, addon: addons.find(a => a.id === l.addonId) })) })
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
        let checkout = null

        if (provider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: addon.price * 100,
                currency: addon.currency.toLowerCase(),
                automatic_payment_methods: { enabled: true },
                metadata: { userId: String(req.user._id), addonId: id },
            })
            checkout = { clientSecret: paymentIntent.client_secret, provider: 'stripe', paymentId: paymentIntent.id }
        }

        // Manual / fallback: create active subscription immediately (demo/owner override)
        const userAddon = await UserAddon.create({
            userId: req.user._id,
            addonId: id,
            price: addon.price,
            currency: addon.currency,
            paymentProvider: provider,
            paymentId: checkout?.paymentId || 'manual',
        })

        res.json({ success: true, addon: userAddon, checkout })
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

// [v7.1-ADDON-PRICING] Owner/admin price management
router.patch('/addons/:id/price', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        await getOrSeedAddons()
        const { price, currency, discountPercent, paymentMethods } = req.body
        const addon = await Addon.findOneAndUpdate(
            { id: req.params.id },
            {
                $set: {
                    price: Number(price),
                    currency: currency || 'RUB',
                    'ownerPriceConfig.customPrice': Number(price),
                    'ownerPriceConfig.customCurrency': currency || 'RUB',
                    'ownerPriceConfig.discountPercent': Math.min(100, Math.max(0, Number(discountPercent) || 0)),
                    ...(paymentMethods ? { paymentMethods } : {}),
                },
            },
            { new: true }
        )
        if (!addon) return res.status(404).json({ success: false, error: 'Аддон не найден' })
        res.json({ success: true, addon })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/addons/pricing-config', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        await getOrSeedAddons()
        const addons = await Addon.find({ isActive: true }).lean()
        res.json({ success: true, addons })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/addons/:id/reset-price', protect, requireRole('owner', 'admin'), async (req, res) => {
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

router.post('/addons/:id/analyze-price', protect, requireRole('owner', 'admin'), async (req, res) => {
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

router.get('/addons/pricing-report', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const report = await generatePricingReport()
        res.json({ success: true, report })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
