import express from 'express'
import Stripe from 'stripe'
import { getStripe } from '../config/stripe.js'
import { protect } from '../middleware/auth.js'
import PaymentProvider from '../models/PaymentProvider.js'
import Subscription from '../models/Subscription.js'
import { createYookassaPayment, yookassaWebhookHandler, getPaymentStatus } from '../controllers/paymentController.js'

const router = express.Router()

// ============ COINBASE COMMERCE ============
const COINBASE_API_KEY = process.env.COINBASE_API_KEY || ''

// ============ PUBLIC METHODS (IP-based recommendation) ============
router.get('/methods', async (req, res) => {
    try {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
        const country = req.headers['cf-ipcountry'] || 'RU'

        let providers = await PaymentProvider.find({ isActive: true }).lean()
        providers = providers.sort((a, b) => {
            const aMatch = a.supportedCountries?.includes(country) ? 1 : 0
            const bMatch = b.supportedCountries?.includes(country) ? 1 : 0
            return bMatch - aMatch
        })

        res.json({
            country,
            methods: providers.map(p => ({
                id: p.name,
                name: p.displayName,
                icon: p.icon,
                currency: p.defaultCurrency,
                commission: p.commissionPercent,
                recommended: p.supportedCountries?.includes(country) || false,
            }))
        })
    } catch (err) {
        console.error('[payments/methods]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ============ CREATE CHECKOUT SESSION (multi-provider) ============
router.post('/create-checkout-session', protect, async (req, res) => {
    try {
        const { provider, priceId, userId, plan, email } = req.body
        const paymentProvider = await PaymentProvider.findOne({ name: provider, isActive: true })

        if (!paymentProvider) {
            return res.status(503).json({
                error: 'Платёжная система временно недоступна',
                code: 'PROVIDER_NOT_ACTIVE',
            })
        }

        const origin = req.headers.origin || process.env.FRONTEND_URL || 'https://ai-viral-studio.pages.dev'

        if (provider === 'stripe' && paymentProvider.config?.secretKey) {
            const stripe = new Stripe(paymentProvider.config.secretKey)
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                customer_email: email,
                success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/cancel`,
                metadata: { userId: userId?.toString() || '', plan: plan || '' },
            })
            return res.json({ url: session.url, provider: 'stripe', sessionId: session.id })
        }

        if (provider === 'yookassa' && paymentProvider.config?.secretKey) {
            return res.json({
                url: `https://yoomoney.ru/checkout/payments/v2/contract?receiver=${paymentProvider.config.shopId}&sum=990&quickpay-form=shop&targets=Подписка+${plan}`,
                provider: 'yookassa',
                testMode: true,
            })
        }

        if (provider === 'paypal') {
            return res.json({ url: '#paypal-not-configured', provider: 'paypal', testMode: true })
        }

        if (provider === 'crypto') {
            return res.json({ address: 'bc1q...test', amount: '0.001', provider: 'crypto', testMode: true })
        }

        res.status(503).json({ error: 'Провайдер не настроен полностью', code: 'INCOMPLETE_CONFIG' })
    } catch (err) {
        console.error('[Payments]', err)
        res.status(500).json({ error: err.message })
    }
})

// ============ LEGACY YOOKASSA ROUTES ============
router.post('/create', protect, createYookassaPayment)
router.post('/webhook', yookassaWebhookHandler)
router.get('/status', protect, getPaymentStatus)

// ============ CRYPTO ============
router.post('/crypto-charge', async (req, res) => {
    try {
        if (!COINBASE_API_KEY) {
            return res.status(503).json({ error: 'Coinbase Commerce not configured' })
        }

        const { name, description, price, currency = 'USD' } = req.body

        const response = await fetch('https://api.commerce.coinbase.com/charges', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CC-Api-Key': COINBASE_API_KEY,
                'X-CC-Version': '2018-03-22'
            },
            body: JSON.stringify({
                name: name || 'AI Viral Studio Subscription',
                description: description || 'Подписка на AI Viral Studio',
                local_price: { amount: String(price), currency },
                pricing_type: 'fixed_price',
                redirect_url: `${process.env.FRONTEND_URL}/settings?payment=success`,
                cancel_url: `${process.env.FRONTEND_URL}/settings?payment=cancel`
            })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error?.message || 'Coinbase API error')
        }

        res.json({
            success: true,
            hosted_url: data.data.hosted_url,
            chargeId: data.data.id,
            code: data.data.code
        })
    } catch (err) {
        console.error('Coinbase error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ============ STRIPE WEBHOOK (raw body) ============
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const stripe = getStripe()
        if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(503).json({ error: 'Webhook not configured' })
        }

        const sig = req.headers['stripe-signature']
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

        console.log('🔔 Stripe webhook:', event.type)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const { userId, planId, isYearly } = session.metadata || {}
            console.log(`✅ Payment success: user=${userId}, plan=${planId}, yearly=${isYearly}`)
        }

        res.json({ received: true })
    } catch (err) {
        console.error('Webhook error:', err.message)
        res.status(400).json({ error: err.message })
    }
})

// ============ ADMIN: OWNER PAYMENT PROVIDERS CONFIG ============
router.post('/admin/providers', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Only owner' })
        }
        const { name, displayName, config, supportedCountries, defaultCurrency, commissionPercent } = req.body
        await PaymentProvider.findOneAndUpdate(
            { name },
            {
                name,
                displayName,
                config,
                supportedCountries,
                defaultCurrency,
                commissionPercent,
                isActive: true,
            },
            { upsert: true, new: true }
        )
        res.json({ success: true, message: `Провайдер ${displayName} активирован` })
    } catch (err) {
        console.error('[payments/admin/providers:post]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.get('/admin/providers', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Only owner' })
        }
        const providers = await PaymentProvider.find().lean()
        const safe = providers.map(p => ({
            ...p,
            config: { publicKey: p.config?.publicKey, shopId: p.config?.shopId },
        }))
        res.json(safe)
    } catch (err) {
        console.error('[payments/admin/providers:get]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ============ SUBSCRIPTION WEBHOOK (Stripe + generic) ============
router.post('/webhook/subscriptions', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        let event
        const sig = req.headers['stripe-signature']
        const stripe = getStripe()

        if (sig && stripe && process.env.STRIPE_WEBHOOK_SECRET) {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
        } else {
            event = JSON.parse(req.body)
        }

        const obj = event.data?.object || event.data?.object || {}
        const subId = obj.subscription || obj.id

        if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid' || event.type === 'payment.success') {
            const sub = await Subscription.findOne({ providerSubscriptionId: subId })
            if (!sub && obj.metadata?.userId && obj.metadata?.plan) {
                await Subscription.create({
                    userId: obj.metadata.userId,
                    plan: obj.metadata.plan,
                    status: 'active',
                    provider: 'stripe',
                    providerSubscriptionId: subId,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    amount: (obj.amount_total || obj.amount || 0) / 100,
                    currency: obj.currency?.toUpperCase() || 'USD',
                    paymentHistory: [{
                        amount: (obj.amount_total || obj.amount || 0) / 100,
                        currency: obj.currency?.toUpperCase() || 'USD',
                        status: 'paid',
                        providerPaymentId: obj.payment_intent || obj.id
                    }]
                })
            } else if (sub) {
                sub.status = 'active'
                sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                sub.paymentHistory.push({
                    amount: (obj.amount_total || obj.amount || 0) / 100,
                    currency: obj.currency?.toUpperCase() || sub.currency,
                    status: 'paid',
                    providerPaymentId: obj.payment_intent || obj.id
                })
                await sub.save()
            }
        }

        if (event.type === 'customer.subscription.deleted' || event.type === 'subscription.canceled') {
            await Subscription.updateOne(
                { providerSubscriptionId: subId },
                { status: 'canceled', cancelAtPeriodEnd: true }
            )
        }

        res.json({ received: true })
    } catch (err) {
        console.error('[payments/webhook/subscriptions]', err.message)
        res.status(400).json({ error: err.message })
    }
})

// ============ ADMIN: SUBSCRIPTIONS ============
function requireOwner(req, res, next) {
    if (req.user?.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner' })
    }
    next()
}

router.get('/admin/subscriptions', protect, requireOwner, async (req, res) => {
    try {
        const subs = await Subscription.find()
            .populate('userId', 'name email avatar')
            .sort({ currentPeriodEnd: -1 })
            .lean()
        res.json(subs)
    } catch (err) {
        console.error('[payments/admin/subscriptions]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ============ ADMIN: REFUND / EXTEND / BROADCAST ============
router.post('/admin/refund/:subscriptionId', protect, requireOwner, async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.subscriptionId)
        if (!sub) return res.status(404).json({ error: 'Подписка не найдена' })

        const lastPayment = sub.paymentHistory?.slice(-1)[0]
        if (!lastPayment) return res.status(400).json({ error: 'Нет платежей для возврата' })

        if (sub.provider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
            await stripe.refunds.create({ payment_intent: lastPayment.providerPaymentId })
        }

        sub.status = 'refunded'
        sub.cancelAtPeriodEnd = true
        sub.paymentHistory.push({ ...lastPayment, status: 'refunded', createdAt: new Date() })
        await sub.save()

        res.json({ success: true, message: 'Возврат выполнен' })
    } catch (err) {
        console.error('[payments/admin/refund]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/admin/extend/:subscriptionId', protect, requireOwner, async (req, res) => {
    try {
        const { months = 1 } = req.body || {}
        const sub = await Subscription.findById(req.params.subscriptionId)
        if (!sub) return res.status(404).json({ error: 'Не найдена' })

        const currentEnd = sub.currentPeriodEnd || new Date()
        sub.currentPeriodEnd = new Date(currentEnd.getTime() + Number(months) * 30 * 24 * 60 * 60 * 1000)
        sub.status = 'active'
        sub.cancelAtPeriodEnd = false
        await sub.save()

        res.json({ success: true, newPeriodEnd: sub.currentPeriodEnd })
    } catch (err) {
        console.error('[payments/admin/extend]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/admin/broadcast', protect, requireOwner, async (req, res) => {
    try {
        const { segment = 'all', subject, message, discountCode } = req.body || {}
        let query = {}
        if (segment === 'active') query.status = 'active'
        if (segment === 'past_due') query.status = 'past_due'
        if (segment === 'canceled') query.status = 'canceled'
        if (segment === 'refunded') query.status = 'refunded'
        if (segment === 'pro') query.plan = 'pro'
        if (segment === 'business') query.plan = 'business'
        if (segment === 'agency') query.plan = 'agency'

        const subs = await Subscription.find(query).populate('userId', 'email telegramId name').lean()
        const results = subs.map(sub => ({
            userId: sub.userId?._id,
            email: sub.userId?.email,
            telegramId: sub.userId?.telegramId,
            name: sub.userId?.name,
            status: 'queued'
        }))

        // TODO: plug into email/telegram queue
        console.log(`[broadcast] ${results.length} recipients, segment=${segment}`)
        res.json({ sent: results.length, segment, discountCode, recipients: results })
    } catch (err) {
        console.error('[payments/admin/broadcast]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ============ LEGACY STATUS ============
router.get('/status', (req, res) => {
    res.json({
        stripe: !!getStripe(),
        coinbase: !!COINBASE_API_KEY,
        timestamp: new Date().toISOString()
    })
})

export default router
