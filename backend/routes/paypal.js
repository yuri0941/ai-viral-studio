import express from 'express'
import { protect } from '../middleware/auth.js'
import { createPayPalOrder, capturePayPalOrder, getPayPalStatus } from '../services/paypalService.js'

const router = express.Router()

router.get('/status', (req, res) => {
    res.json({ success: true, data: getPayPalStatus() })
})

router.post('/create-order', protect, async (req, res) => {
    try {
        const { amount, currency, description, planId } = req.body
        const result = await createPayPalOrder({
            amount,
            currency,
            description,
            customId: JSON.stringify({ userId: req.user.id, planId }),
            returnUrl: `${process.env.FRONTEND_URL}/payment/success?provider=paypal`,
            cancelUrl: `${process.env.FRONTEND_URL}/settings?payment=cancel`,
        })
        res.json(result)
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

router.post('/capture', protect, async (req, res) => {
    try {
        const { orderId } = req.body
        const result = await capturePayPalOrder(orderId)
        res.json(result)
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
