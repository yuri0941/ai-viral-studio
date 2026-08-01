import express from 'express'
import { protect } from '../middleware/auth.js'
import channelAnalytics, { getAllChannelAnalytics } from '../services/channelAnalytics.js'
import audienceService, { getAllAudienceInsights } from '../services/audienceService.js'
import vectorStore from '../services/vectorStore.js'
import abTestService from '../services/abTestService.js'

const router = express.Router()

// Channel analytics per platform
router.get('/channels/:platform', protect, async (req, res) => {
    try {
        const userId = req.user._id
        const { platform } = req.params
        const data = await getAllChannelAnalytics(userId)
        const result = data.find(d => d.platform === platform)
        res.json({ status: 'success', data: result || { status: 'disconnected', platform } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/channels', protect, async (req, res) => {
    try {
        const userId = req.user._id
        const data = await getAllChannelAnalytics(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Audience insights
router.get('/audience/:platform', protect, async (req, res) => {
    try {
        const userId = req.user._id
        const { platform } = req.params
        const data = await getAllAudienceInsights(userId)
        const result = data.find(d => d.platform === platform)
        res.json({ status: 'success', data: result || { status: 'no_permission', platform } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/audience', protect, async (req, res) => {
    try {
        const userId = req.user._id
        const data = await getAllAudienceInsights(userId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Vector store status
router.get('/vector-store/status', protect, async (req, res) => {
    res.json({ status: 'success', data: vectorStore.getStoreStatus() })
})

// A/B tests
router.post('/ab-test', protect, async (req, res) => {
    try {
        const aiCheck = await abTestService.checkAIRequired()
        if (aiCheck.required) {
            return res.status(400).json({ status: 'error', ...aiCheck })
        }
        const { postParams, scheduledAt, platform } = req.body
        const data = await abTestService.createABTest({
            userId: req.user._id,
            postParams,
            scheduledAt,
            platform,
        })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/ab-test/:id/select', protect, async (req, res) => {
    try {
        const data = await abTestService.selectVariant({ testId: req.params.id, variantId: req.body.variantId })
        if (!data.success) return res.status(404).json({ status: 'error', message: data.message })
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/ab-test/ai-required', protect, async (req, res) => {
    const data = await abTestService.checkAIRequired()
    res.json({ status: 'success', data })
})

// Legacy platform routes (keep for compatibility)
router.get('/tiktok/:username', (req, res) => {
    res.json({ status: 'success', message: 'TikTok analytics' })
})

router.get('/youtube/:channelId', (req, res) => {
    res.json({ status: 'success', message: 'YouTube analytics' })
})

export default router
