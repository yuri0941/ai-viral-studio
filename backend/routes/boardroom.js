import express from 'express'
import { protect } from '../middleware/auth.js'
import { runBoardroom } from '../services/boardroom.js'

const router = express.Router()

router.post('/run', protect, async (req, res) => {
    try {
        const { question, category } = req.body || {}
        const result = await runBoardroom(question, category || 'стратегия')
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

export default router
