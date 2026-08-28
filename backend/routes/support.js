import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import { supportTicketLimiter } from '../middleware/rateLimiter.js' // [security-hardening Б5-З5]
import SupportTicket from '../models/SupportTicket.js'
import { createTicket, addMessage, replyToTicket, updateTicketStatus, getTicketContext, escalateToOwner } from '../services/supportService.js'

const router = Router()

// [security-hardening Б5-З5] антиспам на создание тикетов (публичный и авторизованный)
router.post('/public', supportTicketLimiter, async (req, res) => {
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

router.post('/', protect, supportTicketLimiter, async (req, res) => {
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
    // [STAFF-DOP] staff видит все обращения (иначе кабинет поддержки пустой); клиенты — только свои
    const filter = ['owner', 'admin', 'staff'].includes(req.user.role)
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

    // [STAFF-DOP] PATCH без status (напр. только priority/assignedTo) не должен затирать статус
    if (status) ticket.status = status
    ticket.updatedAt = new Date()
    if (req.body.resolution) ticket.resolution = req.body.resolution
    // [STAFF-DOP] смена приоритета из кабинета поддержки (enum из SupportTicket)
    if (req.body.priority && ['low', 'normal', 'medium', 'high', 'urgent', 'critical'].includes(req.body.priority)) {
      ticket.priority = req.body.priority
    }
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
      try {
        const { addMessage } = await import('../services/supportService.js')
        await addMessage(ticket._id, 'system', `👤 Специалист (${req.user.role || 'operator'}) взял обращение в работу.`)
      } catch (e) { console.warn('[support] system message failed:', e.message) }
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

    // [STAFF-DOP] персональное TG-уведомление назначенному сотруднику (assignedTo = email)
    if (req.body.assignedTo) {
      try {
        const { default: User } = await import('../models/User.js')
        const assignee = await User.findOne({
          email: String(req.body.assignedTo).toLowerCase(),
          role: { $in: ['staff', 'admin', 'owner'] }
        }).select('telegramChatId').lean()
        if (assignee?.telegramChatId) {
          const { sendClientNotification } = await import('../services/omegaBot.js')
          await sendClientNotification(
            String(assignee.telegramChatId),
            `📌 Вам назначено обращение #${ticket._id.toString().slice(-6)}\n🎯 ${(ticket.subject || '').slice(0, 120)}\nОткрыть кабинет → /staff`
          )
        }
      } catch (e) { console.warn('[support] assignee notify failed:', e.message) }
    }

    res.json({ status: 'success', data: ticket })
  } catch (err) {
    console.error('[support] status update failed:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

router.post('/:id/messages', protect, async (req, res) => {
  try {
    const role = ['owner', 'admin', 'staff'].includes(req.user.role) ? req.user.role : 'user'
    // [STAFF-DOP] анти-IDOR: клиент может писать только в СВОЙ тикет
    if (role === 'user') {
      const own = await SupportTicket.findOne({
        _id: req.params.id,
        $or: [{ userId: req.user.id || req.user._id }, { userEmail: req.user.email }]
      }).select('_id').lean()
      if (!own) return res.status(403).json({ status: 'error', message: 'Forbidden' })
    }
    const sender = req.body.sender || req.user.name || 'user'
    const ticket = await replyToTicket(req.params.id, sender, req.body.text, { role })
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
