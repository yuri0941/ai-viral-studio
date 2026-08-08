import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import ChannelConfig from '../models/ChannelConfig.js'
import { publishToChannel, getChannelStats } from '../services/channelPublisher.js'

const router = Router()

router.post('/config', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const config = await ChannelConfig.create({ ...req.body, ownerId: req.user.id || req.user._id })
        res.status(201).json(config)
    } catch (err) {
        console.error('[channel:config:create]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.get('/config', protect, async (req, res) => {
    try {
        const configs = await ChannelConfig.find({ ownerId: req.user.id || req.user._id })
        res.json(configs)
    } catch (err) {
        console.error('[channel:config:list]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.patch('/config/:id', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const config = await ChannelConfig.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.json(config)
    } catch (err) {
        console.error('[channel:config:patch]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.post('/publish/:id', protect, requireRole('owner', 'admin'), async (req, res) => {
    try {
        const result = await publishToChannel(req.params.id, req.body.type)
        res.json(result)
    } catch (err) {
        console.error('[channel:publish]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

router.get('/stats/:id', protect, async (req, res) => {
    try {
        const stats = await getChannelStats(req.params.id)
        res.json(stats)
    } catch (err) {
        console.error('[channel:stats]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

export default router
