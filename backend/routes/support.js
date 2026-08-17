import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import SupportTicket from '../models/SupportTicket.js'
import { createTicket, addMessage, replyToTicket, updateTicketStatus, getTicketContext, escalateToOwner } from '../services/supportService.js'

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

// [v9.9.19.15.1] creator SupportTab calls /support/my
router.get('/my', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id || req.user._id })
      .sort({ updatedAt: -1 })
      .limit(100)
    res.json({ status: 'success', tickets })
  } catch (err) {
    console.error('[support] my tickets failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.patch('/:id/status', protect, requireRole('owner', 'admin', 'staff'), async (req, res) => {
  try {
    const status = req.body.status
    const ticket = await SupportTicket.findById(req.params.id)
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' })

    ticket.status = status
    ticket.updatedAt = new Date()
    if (req.body.resolution) ticket.resolution = req.body.resolution
    if (req.body.assignedTo) ticket.assignedTo = req.body.assignedTo

    // [SUBSCRIPTION-CHECKOUT-FIX] Dashboard «Взять в работу» активирует takeover, AI молчит
    if (status === 'in_progress' && ticket.telegramChatId) {
      ticket.takeoverBy = req.body.takeoverBy || req.body.assignedTo || 'operator'
      ticket.takeoverAt = new Date()
      if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date()
      try {
        const { invalidateTakeoverCache } = await import('../services/omegaBot.js')
        invalidateTakeoverCache(ticket.telegramChatId)
      } catch (e) { console.warn('[support] invalidate takeover cache failed:', e.message) }
    }
    // возврат боту или закрытие — снимаем takeover
    if ((status === 'open' || status === 'resolved' || status === 'closed') && ticket.takeoverBy) {
      const oldChatId = ticket.telegramChatId
      ticket.takeoverBy = null
      ticket.takeoverAt = null
      if (oldChatId) {
        try {
          const { invalidateTakeoverCache } = await import('../services/omegaBot.js')
          invalidateTakeoverCache(oldChatId)
        } catch (e) { console.warn('[support] invalidate takeover cache failed:', e.message) }
      }
    }
    await ticket.save()
    res.json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] status update failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.post('/:id/messages', protect, async (req, res) => {
  try {
    const sender = req.body.sender || req.user.name || 'user'
    const ticket = await replyToTicket(req.params.id, sender, req.body.text)
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' })
    res.json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] add message failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.get('/:id/context', protect, requireRole('owner', 'admin', 'staff'), async (req, res) => {
  try {
    const context = await getTicketContext(req.params.id)
    if (!context) return res.status(404).json({ status: 'error', message: 'Ticket not found' })
    res.json({ status: 'success', data: context })
  } catch (err) {
    console.error('[support] context failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.post('/:id/escalate', protect, requireRole('owner', 'admin', 'staff'), async (req, res) => {
  try {
    const ticket = await escalateToOwner(req.params.id, req.body.reason)
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' })
    res.json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] escalate failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

export default router
