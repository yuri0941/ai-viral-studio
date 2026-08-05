import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Analytics overview with safe defaults matching frontend dashboard expectations
router.get('/analytics/overview', protect, (req, res) => res.json({
  revenue: 0,
  users: 0,
  posts: 0,
  score: 0,
  success: true,
  mock: true,
  message: 'Analytics temporarily unavailable'
}))

router.get('/analytics/predictive/enable', protect, (req, res) => res.json({ success: true, active: false, mock: true }))
router.post('/analytics/predictive/enable', protect, (req, res) => res.json({ success: true, active: false, mock: true }))
router.get('/analytics/vector-store/status', protect, (req, res) => res.json({ active: false, status: 'idle', mock: true }))
router.get('/analytics/case-studies/candidates', protect, (req, res) => res.json({ success: true, data: [], mock: true }))
router.get('/analytics/audience', protect, (req, res) => res.json({ success: true, demographics: [], interests: [], mock: true }))

router.get('/owner/settings', protect, (req, res) => {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Access denied', required: 'owner' })
  res.json({ success: true, settings: {}, mock: true })
})

router.get('/users/me/quota', protect, (req, res) => res.json({ used: 0, limit: 1000, remaining: 1000, mock: true }))
router.get('/omega/templates', protect, (req, res) => res.json({ success: true, templates: [], mock: true }))
router.get('/omega/memory', protect, (req, res) => res.json({ success: true, memory: [], mock: true }))
router.get('/invoices', protect, (req, res) => res.json({ success: true, invoices: [], mock: true }))
router.get('/finance/transactions', protect, (req, res) => res.json({ success: true, transactions: [], mock: true }))
router.get('/subscriptions/config', protect, (req, res) => res.json({ success: true, plans: [], mock: true }))
router.get('/subscriptions/history', protect, (req, res) => res.json({ success: true, history: [], mock: true }))
router.get('/subscriptions/current', protect, (req, res) => res.json({ success: true, subscription: null, mock: true }))
router.get('/subscriptions/exchange-rate', protect, (req, res) => res.json({ rate: 1, from: 'RUB', to: 'RUB', mock: true }))
router.post('/yookassa/pay/subscription', protect, (req, res) => res.json({
  success: false,
  message: 'Payment service temporarily unavailable',
  mock: true
}))

export default router
