import express from 'express'
import { protect } from '../middleware/auth.js'
import channelAnalytics, { getAllChannelAnalytics } from '../services/channelAnalytics.js'
import audienceService, { getAllAudienceInsights } from '../services/audienceService.js'
import vectorStore from '../services/vectorStore.js'
import abTestService from '../services/abTestService.js'
import { checkQuota, consumeGeneration, topUpGenerations, updateQuotaSettings } from '../services/usageQuotaService.js'
import { getReferralData, registerReferral } from '../services/referralService.js'
import { generateCaseStudy, findCaseStudyCandidates } from '../services/caseStudyGenerator.js'
import { generateReport } from '../services/pdfGenerator.js'
import { authorize } from '../middleware/auth.js'

import { predictViralScore } from '../services/predictiveEngine.js'

const router = express.Router()

// Quota
router.get('/quota', protect, async (req, res) => {
    try {
        const data = await checkQuota(req.user._id)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/quota/topup', protect, async (req, res) => {
    try {
        const packs = parseInt(req.body.packs) || 1
        const data = await topUpGenerations(req.user._id, packs)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.put('/quota/settings', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const data = await updateQuotaSettings(req.body)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Referrals
router.get('/referrals', protect, async (req, res) => {
    try {
        const data = await getReferralData(req.user._id)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/referrals/apply', protect, async (req, res) => {
    try {
        const { code } = req.body
        const result = await registerReferral(req.user._id, code)
        if (!result) return res.status(400).json({ status: 'error', message: 'Invalid referral code' })
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

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

// Case studies
router.get('/case-studies/candidates', protect, async (req, res) => {
    try {
        const data = await findCaseStudyCandidates(parseFloat(req.query.minGrowth) || 20)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/case-studies/generate', protect, async (req, res) => {
    try {
        const { userId: targetUserId } = req.body
        const data = await generateCaseStudy(targetUserId || req.user._id)
        res.json(data)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Reports
router.post('/reports/generate', protect, async (req, res) => {
    try {
        const { type = 'weekly', channels = ['instagram', 'tiktok'], format = 'pdf' } = req.body
        const result = await generateReport({ userId: req.user._id, type, channels, format })
        if (result.status === 'no_data') {
            return res.status(400).json(result)
        }
        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.pdf"`)
            return res.send(result.buffer)
        }
        res.json({ status: 'success', data: result.data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Legacy platform routes (keep for compatibility)
router.get('/tiktok/:username', (req, res) => {
    res.json({ status: 'success', message: 'TikTok analytics' })
})

router.get('/youtube/:channelId', (req, res) => {
    res.json({ status: 'success', message: 'YouTube analytics' })
})

// Predictive viral score
router.post('/predict', protect, async (req, res) => {
    try {
        const userId = req.user._id
        const { content } = req.body
        if (!content) return res.status(400).json({ status: 'error', message: 'Content is required' })
        const data = await predictViralScore(userId, content)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
