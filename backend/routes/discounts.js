import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import DiscountPost from '../models/DiscountPost.js'
import { generateDiscountPost, publishDiscountToChannel } from '../services/discountService.js'

const router = Router()

router.get('/', async (req, res) => {
    try {
        const d = await DiscountPost.find({ isActive: true, validUntil: { $gt: new Date() } })
        res.json(d)
    } catch (err) {
        console.error('[discounts:list]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.post('/', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const d = await generateDiscountPost(req.body.planId, req.body.percent)
        res.json(d)
    } catch (err) {
        console.error('[discounts:create]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.post('/:id/publish', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const result = await publishDiscountToChannel(req.params.id, req.body.configId)
        res.json(result)
    } catch (err) {
        console.error('[discounts:publish]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

export default router
