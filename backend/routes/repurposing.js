import express from 'express'
import { protect } from '../middleware/auth.js'
import { repurpose, listFormats } from '../services/repurposingEngine.js'

const router = express.Router()

// GET /api/repurposing/formats
router.get('/formats', protect, async (req, res) => {
  try {
    res.json({ success: true, data: listFormats() })
  } catch (err) {
    console.error('[repurposing] formats failed:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/repurposing
router.post('/', protect, async (req, res) => {
  try {
    const { content, formats, context } = req.body
    if (!content || !Array.isArray(formats) || formats.length === 0) {
      return res.status(400).json({ success: false, message: 'content and formats are required' })
    }
    const results = await repurpose(content, formats, {
      ...context,
      userRole: req.user.role,
      userId: req.user._id,
    })
    res.json({ success: true, data: results })
  } catch (err) {
    console.error('[repurposing] failed:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router
