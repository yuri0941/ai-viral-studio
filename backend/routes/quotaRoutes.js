import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/me/quota', protect, (req, res) => {
  res.json({ used: 0, limit: 1000, remaining: 1000 })
})

export default router
