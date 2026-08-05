import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/churn/stats', protect, (req, res) => {
  res.json({ success: true, stats: {} })
})

router.get('/churn/at-risk', protect, (req, res) => {
  res.json({ success: true, users: [], count: 0 })
})

export default router
