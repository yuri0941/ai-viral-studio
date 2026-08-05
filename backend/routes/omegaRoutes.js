import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.post('/autopilot/toggle', protect, (req, res) => {
  res.json({ success: true, enabled: req.body?.enabled || false })
})

router.get('/memory', protect, (req, res) => {
  res.json({ success: true, memory: [], count: 0 })
})

router.get('/templates', protect, (req, res) => {
  res.json({ success: true, templates: [], count: 0 })
})

export default router
