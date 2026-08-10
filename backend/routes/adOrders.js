import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import AdOrder from '../models/AdOrder.js'
import { getAdPricing, updateAdPricing } from '../services/adPricingService.js'

const router = Router()

router.get('/pricing', (req, res) => {
    res.json({ success: true, pricing: getAdPricing() })
})

router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await AdOrder.find({ clientTelegramId: req.user.telegramId || req.user.id }).sort({ createdAt: -1 })
        res.json(orders)
    } catch (err) {
        console.error('[adOrders:my-orders]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.get('/all', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const orders = await AdOrder.find().sort({ createdAt: -1 }).limit(100)
        res.json({ success: true, orders })
    } catch (err) {
        console.error('[adOrders:all]', err.message)
        res.json({ success: true, orders: [] })
    }
})

router.patch('/:id/status', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const order = await AdOrder.findByIdAndUpdate(
            req.params.id,
            {
                status: req.body.status,
                ownerDecision: { approved: req.body.status === 'approved', decidedAt: new Date() }
            },
            { new: true }
        )
        res.json(order)
    } catch (err) {
        console.error('[adOrders:status]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.post('/pricing', protect, requireRole('owner', 'admin'), async (req, res) => {
    const { slotType, price } = req.body
    updateAdPricing(slotType, price)
    res.json(getAdPricing())
})

export default router
