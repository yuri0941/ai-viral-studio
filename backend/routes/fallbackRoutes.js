import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Generic fallback for any /api/* route not implemented by a specific router.
router.all('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' })
})

export default router
