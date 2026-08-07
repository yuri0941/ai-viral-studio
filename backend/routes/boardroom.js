import express from 'express'
import { protect } from '../middleware/auth.js'
import { runBoardroom } from '../services/boardroom.js'

const router = express.Router()

// [v7.1-PART1] Boardroom history
const HISTORY = []
router.post('/run', protect, async (req, res) => {
    try {
        const { question, category } = req.body || {}
        const result = await runBoardroom(question, category || 'стратегия')
        HISTORY.unshift({ question, category: category || 'стратегия', createdAt: new Date().toISOString(), result })
        if (HISTORY.length > 50) HISTORY.pop()
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})
router.get('/history', protect, (req, res) => {
    res.json({ status: 'success', data: HISTORY.map(h => ({ question: h.question, category: h.category, createdAt: h.createdAt })) })
})

export default router
