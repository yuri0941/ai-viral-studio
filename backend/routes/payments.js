import express from 'express'
import Stripe from 'stripe'
import { protect } from '../middleware/auth.js'
import { createYookassaPayment, yookassaWebhookHandler, getPaymentStatus } from '../controllers/paymentController.js'

const router = express.Router()

// ============ STRIPE ============
let stripe = null
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    console.log('💳 Stripe initialized')
} else {
    console.log('⚠️  Stripe not initialized — no valid key')
}

// ============ COINBASE COMMERCE ============
const COINBASE_API_KEY = process.env.COINBASE_API_KEY || ''

// ============ ROUTES ============

/**
 * POST /api/payments/create
 * Создаёт тестовый платёж через ЮKassa
 */
router.post('/create', protect, createYookassaPayment)

/**
 * POST /api/payments/webhook
 * Webhook от ЮKassa
 */
router.post('/webhook', yookassaWebhookHandler)

/**
 * GET /api/payments/status
 * Статус платежа
 */
router.get('/status', protect, getPaymentStatus)

/**
 * POST /api/payments/create-checkout-session
 * Создаёт Stripe Checkout Session для подписки
 */
router.post('/create-checkout-session', async (req, res) => {
    let attempts = 0
    const maxAttempts = 2
    let lastError = null

    while (attempts < maxAttempts) {
        attempts++
        try {
            if (!stripe) {
                return res.status(503).json({ success: false, error: 'Stripe not configured' })
            }

            const { planId, price, isYearly, currency = 'USD', userId } = req.body

            if (!planId || !price || price <= 0) {
                return res.status(400).json({ status: 'error', error: 'Invalid plan or price' })
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `AI Viral Studio — ${planId}`,
                            description: isYearly ? 'Годовая подписка' : 'Месячная подписка'
                        },
                        unit_amount: Math.round(price * 100), // в центах
                        recurring: isYearly
                            ? { interval: 'year' }
                            : { interval: 'month' }
                    },
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `${process.env.FRONTEND_URL || ''}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || ''}/settings?payment=cancel`,
                metadata: {
                    userId: userId || 'anonymous',
                    planId: planId,
                    isYearly: String(isYearly)
                }
            })

            return res.json({
                success: true,
                url: session.url,
                sessionId: session.id
            })
        } catch (err) {
            lastError = err
            if (attempts >= maxAttempts) {
                console.error(`[Stripe] final error after ${attempts} attempts:`, err.message)
            }
            if (attempts < maxAttempts) await new Promise(r => setTimeout(r, 500))
        }
    }

    return res.status(503).json({ success: false, error: lastError?.message || 'Payment service temporarily unavailable. Please try later.' })
})

/**
 * POST /api/payments/crypto-charge
 * Создаёт Coinbase Commerce charge для крипто-оплаты
 */
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
                local_price: {
                    amount: String(price),
                    currency: currency
                },
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

/**
 * POST /api/payments/webhook
 * Webhook для Stripe — подтверждение оплаты
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(503).json({ error: 'Webhook not configured' })
        }

        const sig = req.headers['stripe-signature']
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )

        console.log('🔔 Stripe webhook:', event.type)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const { userId, planId, isYearly } = session.metadata || {}

            // TODO: Активировать подписку в MongoDB
            console.log(`✅ Payment success: user=${userId}, plan=${planId}, yearly=${isYearly}`)

            // Пример активации (раскомментируй когда будет модель Subscription):
            // await Subscription.create({
            //     userId,
            //     planId,
            //     isYearly: isYearly === 'true',
            //     stripeSessionId: session.id,
            //     status: 'active',
            //     expiresAt: new Date(Date.now() + (isYearly === 'true' ? 365 : 30) * 24 * 60 * 60 * 1000)
            // })
        }

        res.json({ received: true })

    } catch (err) {
        console.error('Webhook error:', err.message)
        res.status(400).json({ error: err.message })
    }
})

/**
 * GET /api/payments/status
 * Проверка статуса платёжной системы
 */
router.get('/status', (req, res) => {
    res.json({
        stripe: !!stripe,
        coinbase: !!COINBASE_API_KEY,
        timestamp: new Date().toISOString()
    })
})

export default router