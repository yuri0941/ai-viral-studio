import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    createPrediction,
    placeWager,
    resolvePredictionsFromAnalytics,
    autoResolveOldPredictions,
    getPendingPredictions,
    getLeaderboard as getPredictionLeaderboard,
    getAccuracyStats,
} from '../services/predictionGame.js'
import {
    submitHumanPost,
    vote,
    getCurrentRound,
    getArchive,
    getStats,
    autoRevealRounds,
} from '../services/aiVsHuman.js'
import {
    calculateViralScore,
    getLeaderboard as getViralLeaderboard,
    getTop3,
} from '../services/leaderboardService.js'

const router = express.Router()

// ============ Gamified Predictions ============

router.post('/predictions', protect, async (req, res) => {
    try {
        const { content, postId, platform, niche } = req.body || {}
        const result = await createPrediction({
            userId: req.user.id,
            postId,
            content,
            platform,
            niche,
        })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/predictions/pending', protect, async (req, res) => {
    try {
        const predictions = await getPendingPredictions(req.user.id)
        res.json({ status: 'success', data: predictions })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/predictions/:id/wager', protect, async (req, res) => {
    try {
        const { wager } = req.body || {}
        const result = await placeWager(req.params.id, wager)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/predictions/resolve', protect, async (req, res) => {
    try {
        const { updates } = req.body || {}
        const result = await resolvePredictionsFromAnalytics(req.user.id, updates)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/predictions/auto-resolve', protect, async (req, res) => {
    try {
        const result = await autoResolveOldPredictions()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/predictions/leaderboard', protect, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30
        const data = await getPredictionLeaderboard(req.user.id, days)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// [P20] added: viral leaderboard routes
router.get('/leaderboard', protect, async (req, res) => {
    try {
        const { period = 'week', niche = 'all' } = req.query || {}
        const data = await getViralLeaderboard(period, niche)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/leaderboard/top3', protect, async (req, res) => {
    try {
        const { period = 'week', niche = 'all' } = req.query || {}
        const data = await getTop3(period, niche)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/leaderboard/score', protect, async (req, res) => {
    try {
        const data = await calculateViralScore(req.user.id)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/predictions/accuracy', protect, async (req, res) => {
    try {
        const data = await getAccuracyStats(req.user.id)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// ============ AI vs Human ============

router.get('/aivshuman/current', protect, async (req, res) => {
    try {
        const round = await getCurrentRound()
        res.json({ status: 'success', data: round })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/aivshuman/vote', protect, async (req, res) => {
    try {
        const { roundId, choice } = req.body || {}
        const result = await vote(roundId, req.user.id, choice)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/aivshuman/human-post', protect, async (req, res) => {
    try {
        const { roundId, humanPost } = req.body || {}
        const result = await submitHumanPost(roundId, humanPost)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/aivshuman/archive', protect, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20
        const rounds = await getArchive(limit)
        res.json({ status: 'success', data: rounds })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/aivshuman/stats', protect, async (req, res) => {
    try {
        const stats = await getStats()
        res.json({ status: 'success', data: stats })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/aivshuman/auto-reveal', protect, async (req, res) => {
    try {
        const result = await autoRevealRounds()
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
