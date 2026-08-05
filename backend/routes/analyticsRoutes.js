import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/overview', protect, (req, res) => {
  res.json({ revenue: 0, users: 0, posts: 0, score: 0, success: true })
})

router.get('/predictive/enable', protect, (req, res) => {
  res.json({ success: true, active: false })
})

router.post('/predictive/enable', protect, (req, res) => {
  res.json({ success: true, active: req.body?.active || false })
})

router.get('/vector-store/status', protect, (req, res) => {
  res.json({ active: false, status: 'idle', documents: 0 })
})

router.get('/case-studies/candidates', protect, (req, res) => {
  res.json({ success: true, data: [], count: 0 })
})

router.get('/audience', protect, (req, res) => {
  res.json({ success: true, demographics: [], interests: [], total: 0 })
})

export default router
