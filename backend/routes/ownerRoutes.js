import express from 'express'
import { protect, requireOwner } from '../middleware/auth.js'

const router = express.Router()

router.get('/settings', protect, requireOwner, (req, res) => {
  res.json({ success: true, settings: {} })
})

export default router
