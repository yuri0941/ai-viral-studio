import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import AdOrder from '../models/AdOrder.js'
import { getAdPricing, updateAdPricing } from '../services/adPricingService.js'

const router = Router()

router.get('/pricing', (req, res) => {
    res.json({ success: true, pricing: getAdPricing() })
})

// [v9.9.19-MASTER-AUDIT] GET / — список заказов (owner/admin — все, остальные — свои), graceful fallback
router.get('/', protect, async (req, res) => {
    try {
        const isPrivileged = ['owner', 'admin'].includes(req.user?.role)
        const query = isPrivileged ? {} : { clientTelegramId: req.user?.telegramId || req.user?.id }
        const orders = await AdOrder.find(query).sort({ createdAt: -1 }).limit(100)
        res.json({ success: true, data: orders, orders })
    } catch (err) {
        console.error('[adOrders:list]', err.message)
        res.json({ success: true, data: [], orders: [] })
    }
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
