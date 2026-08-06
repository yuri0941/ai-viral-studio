import express from 'express'
import ApprovalQueue from '../models/ApprovalQueue.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = express.Router()

// GET /api/approvals — list pending/approved/rejected for owner/admin
router.get('/', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { status } = req.query
    const filter = { ownerId: req.user._id }
    if (status) filter.status = status
    const items = await ApprovalQueue.find(filter).sort({ createdAt: -1 }).limit(100)
    res.json({ success: true, data: items })
  } catch (err) {
    console.error('[approval] list failed:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/approvals — create new approval request (OMEGA or owner)
router.post('/', protect, async (req, res) => {
  try {
    const { type, description, data, proposedBy } = req.body
    if (!type || !description) {
      return res.status(400).json({ success: false, message: 'type and description required' })
    }
    const item = await ApprovalQueue.create({
      type,
      description,
      data: data || {},
      proposedBy: proposedBy || req.user.name || 'OMEGA',
      ownerId: req.user._id,
    })
    res.status(201).json({ success: true, data: item })
  } catch (err) {
    console.error('[approval] create failed:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/approvals/:id/approve
router.post('/:id/approve', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { note } = req.body
    const item = await ApprovalQueue.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { status: 'approved', resolutionNote: note || '', resolvedAt: new Date() },
      { new: true }
    )
    if (!item) return res.status(404).json({ success: false, message: 'not found' })
    res.json({ success: true, data: item })
  } catch (err) {
    console.error('[approval] approve failed:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/approvals/:id/reject
router.post('/:id/reject', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { note } = req.body
    const item = await ApprovalQueue.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { status: 'rejected', resolutionNote: note || '', resolvedAt: new Date() },
      { new: true }
    )
    if (!item) return res.status(404).json({ success: false, message: 'not found' })
    res.json({ success: true, data: item })
  } catch (err) {
    console.error('[approval] reject failed:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router
