import express from 'express'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, (req, res) => {
  res.json({ success: true, invoices: [], count: 0 })
})

export default router
