import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    getCurrentChallenge,
    createMonthlyChallenge,
    submitToChallenge,
    evaluateSubmission,
    getChallengeResults,
    getArchive,
} from '../services/challengeService.js'

const router = express.Router()

// [P20] added: OMEGA Challenge routes
router.get('/current', protect, async (req, res) => {
    try {
        const challenge = await getCurrentChallenge()
        if (!challenge) {
            return res.json({ status: 'success', data: null })
        }
        res.json({ status: 'success', data: challenge })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/submit', protect, async (req, res) => {
    try {
        const result = await submitToChallenge(req.user.id, req.body || {})
        if (!result.success) {
            return res.status(400).json({ status: 'error', message: result.message })
        }
        res.json({ status: 'success', message: result.message })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/archive', protect, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12
        const data = await getArchive(limit)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.get('/:id/results', protect, async (req, res) => {
    try {
        const result = await getChallengeResults(req.params.id)
        if (!result.success) {
            return res.status(404).json({ status: 'error', message: result.message })
        }
        res.json({ status: 'success', data: result.data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/admin/create', protect, async (req, res) => {
    try {
        if (!['owner', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden' })
        }
        const challenge = await createMonthlyChallenge(req.body || {})
        res.json({ status: 'success', data: challenge })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/:id/evaluate', protect, async (req, res) => {
    try {
        const result = await evaluateSubmission(req.params.id)
        if (!result.success) {
            return res.status(400).json({ status: 'error', message: result.message })
        }
        res.json({ status: 'success', data: result.data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
