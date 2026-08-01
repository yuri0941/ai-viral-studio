import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import { getTemplateStats, runEvolutionCron } from '../services/templateEvolution.js'
import { findEligibleUsers, proposeABTest, approveABTest, resolveABTests } from '../services/abAutoLearning.js'
import { predictChurn, getAtRiskUsers, generateRetentionOffer, generateExitOffer, getChurnStats } from '../services/churnPrediction.js'
import { aggregateNicheIntelligence, getNicheComparison } from '../services/nicheIntelligence.js'

const router = express.Router()

// Template Evolution
router.get('/templates/stats', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        res.json({ status: 'success', data: getTemplateStats() })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/templates/evolve', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const result = await runEvolutionCron()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// A/B Auto-Learning
router.get('/ab-learning/eligible', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const users = await findEligibleUsers()
        res.json({ status: 'success', data: users })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/ab-learning/propose', protect, async (req, res) => {
    try {
        const { postId } = req.body || {}
        // For simplicity, fetch the latest scheduled post if postId not provided
        const post = postId
            ? await (await import('../models/ScheduledPost.js')).default.findById(postId).lean()
            : await (await import('../models/ScheduledPost.js')).default.findOne({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
        if (!post) return res.status(404).json({ status: 'error', message: 'Post not found' })
        const result = await proposeABTest(req.user.id, post)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/ab-learning/approve', protect, async (req, res) => {
    try {
        const { postId, choice } = req.body || {}
        const result = await approveABTest(req.user.id, postId, choice)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/ab-learning/resolve', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const result = await resolveABTests()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Churn Prediction
router.get('/churn/me', protect, async (req, res) => {
    try {
        const result = await predictChurn(req.user.id)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/churn/at-risk', protect, authorize('owner', 'admin', 'staff'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50
        const users = await getAtRiskUsers(limit)
        res.json({ status: 'success', data: users })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/churn/offer/:userId/:day', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const result = await generateRetentionOffer(req.params.userId, parseInt(req.params.day) || 1)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/churn/exit-offer/:userId', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const result = await generateExitOffer(req.params.userId)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/churn/stats', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const result = await getChurnStats()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Niche Intelligence
router.get('/niche/aggregate', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const result = await aggregateNicheIntelligence()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/niche/me', protect, async (req, res) => {
    try {
        const result = await getNicheComparison(req.user.id)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
