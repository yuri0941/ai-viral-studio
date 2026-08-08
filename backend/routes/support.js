import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import { createTicket, addMessage } from '../services/supportService.js'

const router = Router()

router.post('/public', async (req, res) => {
  try {
    const { email, name, subject, description, screenshot } = req.body || {}
    const ticket = await createTicket({
      userEmail: email,
      userName: name,
      subject: subject || 'Обращение с сайта',
      description: description || '',
      screenshotBase64: screenshot
    })
    res.status(201).json({
      status: 'success',
      ticketId: ticket._id,
      status: ticket.status,
      aiSuggestion: ticket.aiSuggestion
    })
  } catch (err) {
    console.error('[support:public] create failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const ticket = await createTicket({
      ...req.body,
      userId: req.user.id || req.user._id,
      userEmail: req.user.email,
      userName: req.user.name
    })
    res.status(201).json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] create failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const filter = (req.user.role === 'owner' || req.user.role === 'admin')
      ? {}
      : { userId: req.user.id || req.user._id }
    const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 }).limit(100)
    res.json({ status: 'success', data: tickets })
  } catch (err) {
    console.error('[support] list failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.patch('/:id/status', protect, requireRole('owner', 'admin', 'staff'), async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, assignedTo: req.body.assignedTo, updatedAt: new Date() },
      { new: true }
    )
    res.json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] status update failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.post('/:id/messages', protect, async (req, res) => {
  try {
    const ticket = await addMessage(req.params.id, req.body.sender || req.user.name || 'user', req.body.text)
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' })
    res.json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] add message failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

export default router
