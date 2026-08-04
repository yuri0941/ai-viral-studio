import express from 'express'
import { protect } from '../middleware/auth.js'
import { createYooKassaPayment } from '../services/yookassaService.js'
import { createStripeSession } from '../services/stripeService.js'
import { createPayPalOrder } from '../services/paypalService.js'
import { createCryptoInvoice } from '../services/cryptoService.js'
import { getAvailableProviders } from '../config/payments.js'
import { PLANS } from '../config/plans.js'

const router = express.Router()

// [PAYMENT-v5.2] added: available payment methods for currency
router.get('/methods', (req, res) => {
    const { currency = 'ALL' } = req.query
    const providers = getAvailableProviders(currency)
    res.json({ providers, currency })
})

// [PAYMENT-v5.2] added: create unified payment
router.post('/create', protect, async (req, res) => {
    try {
        const { planId, provider, currency } = req.body
        const plan = PLANS[planId]
        if (!plan) return res.status(404).json({ error: 'Plan not found' })

        const amount = currency === 'USD' ? plan.priceUSD : plan.priceRUB
        const returnUrl = `${process.env.FRONTEND_URL}/payment-success?plan=${planId}&provider=${provider}`

        let result
        switch (provider) {
            case 'yookassa':
                result = await createYooKassaPayment({
                    amount,
                    description: `Подписка ${planId} — AI Viral Studio`,
                    returnUrl,
                    metadata: { userId: req.user.id, planId }
                })
                result.paymentUrl = result.confirmationUrl
                break
            case 'stripe':
                result = await createStripeSession({ planId, userId: req.user.id, email: req.user.email, currency: currency.toLowerCase() })
                break
            case 'paypal':
                result = await createPayPalOrder({ planId, amount, currency })
                break
            case 'crypto':
                result = await createCryptoInvoice({ planId, amount, currency })
                break
            default:
                return res.status(400).json({ error: 'Unknown provider' })
        }

        res.json(result)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
