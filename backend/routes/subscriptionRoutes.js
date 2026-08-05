import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/config', protect, (req, res) => {
  res.json({ success: true, plans: [], currency: 'RUB' })
})

router.get('/history', protect, (req, res) => {
  res.json({ success: true, history: [] })
})

router.get('/current', protect, (req, res) => {
  res.json({ success: true, subscription: null })
})

router.get('/exchange-rate', protect, (req, res) => {
  res.json({ rate: 1, from: 'RUB', to: 'RUB' })
})

router.post('/yookassa/pay/subscription', protect, (req, res) => {
  res.status(503).json({ success: false, error: 'Payment service temporarily unavailable. Please try later.' })
})

export default router
