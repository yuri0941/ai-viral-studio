// [P1.6-PREP] отзывы лендинга: публичное чтение (только visible), CRUD — только владелец
import express from 'express'
import Testimonial from '../models/Testimonial.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// GET /api/testimonials — публичный список для лендинга (может быть пустым — лендинг покажет заглушку)
router.get('/', async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ visible: true })
            .sort({ order: 1, createdAt: -1 })
            .limit(12)
            .select('name role text')
            .lean()
        res.json({ success: true, testimonials })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// GET /api/testimonials/all — владелец: все, включая скрытые
router.get('/all', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ order: 1, createdAt: -1 }).lean()
        res.json({ success: true, testimonials })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// POST /api/testimonials — владелец: добавить
router.post('/', protect, authorize('owner'), async (req, res) => {
    try {
        const { name, role = '', text, visible = true } = req.body || {}
        if (!name?.trim() || !text?.trim()) {
            return res.status(400).json({ success: false, error: 'name_and_text_required' })
        }
        const doc = await Testimonial.create({ name: name.trim(), role: role.trim(), text: text.trim(), visible: !!visible })
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.testimonial.create', { name: doc.name }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true, testimonial: doc })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// PUT /api/testimonials/:id — владелец: обновить (в т.ч. видимость)
router.put('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const { name, role, text, visible, order } = req.body || {}
        const update = {}
        if (name !== undefined) update.name = String(name).trim()
        if (role !== undefined) update.role = String(role).trim()
        if (text !== undefined) update.text = String(text).trim()
        if (visible !== undefined) update.visible = !!visible
        if (order !== undefined) update.order = Number(order) || 0
        const doc = await Testimonial.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
        if (!doc) return res.status(404).json({ success: false, error: 'not_found' })
        res.json({ success: true, testimonial: doc })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// DELETE /api/testimonials/:id — владелец
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const doc = await Testimonial.findByIdAndDelete(req.params.id)
        if (!doc) return res.status(404).json({ success: false, error: 'not_found' })
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.testimonial.delete', { name: doc.name }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
