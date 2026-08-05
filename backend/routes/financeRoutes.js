import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/transactions', protect, (req, res) => {
  res.json({ success: true, transactions: [] })
})

export default router
