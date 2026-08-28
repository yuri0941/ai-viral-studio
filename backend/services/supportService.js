import SupportTicket from '../models/SupportTicket.js'
import { chatWithAI } from './aiService.js'
import { alertOwner } from './ownerBot.js'
import { createNode } from './cognitiveMesh.js'

const PRIORITY_PATTERNS = {
  urgent: /не работает|сбой|упал|критично|срочно|недоступен|платёж не прошёл|оплата не прошла|возврат|удалить аккаунт/i,
  high: /ошибка|баг|проблема|помощь|поддержка|не могу|не получается|оплата|счёт/i,
  normal: /.*/
}

export function detectPriority(description) {
  if (PRIORITY_PATTERNS.urgent.test(description)) return 'urgent'
  if (PRIORITY_PATTERNS.high.test(description)) return 'high'
  return 'normal'
}

export function getSourceBadge(source) {
  if (source === 'telegram') return 'TG'
  if (source === 'chat') return 'Chat'
  if (source === 'widget') return 'Widget'
  if (source === 'web') return 'Web'
  return 'Other'
}

// [BOT-LINKS-TICKET-SYNC] если клиент пишет из web/widget, но привязан к TG — дублируем сообщение в бот
async function mirrorClientMessageToTelegram(ticket, data) {
  if (data.source === 'telegram') return
  if (!data.userId) return
  try {
    const { default: User } = await import('../models/User.js')
    const user = await User.findById(data.userId).select('telegramChatId').lean()
    if (!user?.telegramChatId) return
    const chatId = String(user.telegramChatId)
    if (!ticket.telegramChatId) {
      ticket.telegramChatId = chatId
      await ticket.save()
    }
    const { sendClientMessage } = await import('./omegaBot.js')
    const text = data.description || data.subject || ''
    await sendClientMessage(chatId, `🎫 <b>Обращение #${ticket._id.toString().slice(-6)}</b>\n${text.slice(0, 2000)}`, { parse_mode: 'HTML' })
  } catch (e) {
    console.warn('[supportService] mirror to telegram failed:', e.message)
  }
}

async function findOpenTicket(data) {
  const or = []
  if (data.userId) or.push({ userId: data.userId })
  if (data.telegramChatId) or.push({ telegramChatId: String(data.telegramChatId) })
  if (data.userEmail) or.push({ userEmail: data.userEmail })
  if (!or.length) return null
  return SupportTicket.findOne({
    $or: or,
    status: { $in: ['open', 'needs_owner', 'in_progress', 'ai_handled'] }
  }).sort({ updatedAt: -1 })
}

export async function createTicket(data) {
  // [SUPPORT-PUSH-FIX] один тикет на диалог: если у клиента уже есть открытый — дописываем сообщение
  const existing = await findOpenTicket(data)
  if (existing) {
    await addMessage(existing._id, 'client', data.description || data.subject || '—')
    await mirrorClientMessageToTelegram(existing, data)
    return existing
  }

  const priority = data.priority || detectPriority(data.description || '')
  const source = data.source || 'web'
  const ticket = await SupportTicket.create({
    ...data,
    priority,
    source,
    status: data.status || 'open'
  })

  const aiPrompt = `Пользователь написал в поддержку: "${data.description}". Тема: "${data.subject}". Кратко предложи решение (1-2 предложения) или напиши "needs_human" если требуется оператор.`
  try {
    const aiResult = await chatWithAI(aiPrompt, [], 'ru', { maxTokens: 200 })
    const suggestion = aiResult?.reply || aiResult?.text || ''
    const confidence = suggestion.toLowerCase().includes('needs_human') ? 0.3 : 0.85
    ticket.aiSuggestion = suggestion
    ticket.aiConfidence = confidence
    ticket.status = confidence < 0.7 ? 'needs_owner' : 'ai_handled'
  } catch (e) {
    console.error('[supportService] AI suggestion failed:', e.message)
    ticket.aiSuggestion = 'Оператор рассмотрит обращение в ближайшее время.'
    ticket.aiConfidence = 0.3
    ticket.status = 'needs_owner'
  }
  // [P2.1] первое действие по тикету (AI-разбор) — для метрики time-to-first-action
  if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date()
  await ticket.save()
  await mirrorClientMessageToTelegram(ticket, data)

  try {
    await createNode({
      type: 'support',
      content: `Ticket #${ticket._id}: ${data.subject}`,
      confidence: ticket.aiConfidence,
      source: 'support_system',
      metadata: { ticketId: ticket._id, userId: data.userId, status: ticket.status }
    })
  } catch (e) {
    console.warn('[supportService] cognitive mesh node failed:', e.message)
  }

  // [SUPPORT-PUSH-FIX] push владельцу на КАЖДОЕ новое обращение (любой source) с кнопками
  try {
    const clientName = ticket.userName || ticket.userEmail || '—'
    const preview = (ticket.description || ticket.subject || '').slice(0, 100)
    const emoji = ticket.priority === 'urgent' ? '🔴' : ticket.priority === 'high' ? '🟠' : '🆘'
    const summary = [
      `${emoji} **Обращение #${ticket._id.toString().slice(-6)}**`,
      `👤 ${clientName}`,
      `📱 ${getSourceBadge(ticket.source)}`,
      `🎯 ${preview}${ticket.description && ticket.description.length > 100 ? '…' : ''}`
    ].join('\n')
    await alertOwner(summary, {
      type: 'ticket',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Взять диалог', callback_data: `ticket:takeover:${ticket._id}` }, { text: '✅ Закрыть', callback_data: `ticket:close:${ticket._id}` }],
          [{ text: '⬆️ Эскалация', callback_data: `ticket:escalate:${ticket._id}` }]
        ]
      }
    })
  } catch (e) {
    console.warn('[supportService] owner alert failed:', e.message)
  }

  // [STAFF-DOP] уведомление сотрудников поддержки (staff/admin с привязанным telegramChatId) о новом обращении
  try {
    const { default: User } = await import('../models/User.js')
    const staffers = await User.find({
      role: { $in: ['staff', 'admin'] },
      status: 'active',
      telegramChatId: { $exists: true, $nin: ['', null] }
    }).select('telegramChatId').lean()
    if (staffers.length) {
      const { sendClientNotification } = await import('./omegaBot.js')
      const clientName = ticket.userName || ticket.userEmail || '—'
      const preview = (ticket.description || ticket.subject || '').slice(0, 100)
      const text = `🆘 Новое обращение #${ticket._id.toString().slice(-6)}\n👤 ${clientName}\n🎯 ${preview}\nОткрыть кабинет → /staff`
      for (const s of staffers) {
        try {
          await sendClientNotification(String(s.telegramChatId), text)
        } catch (e) { console.warn('[supportService] staff notify failed:', e.message) }
      }
    }
  } catch (e) {
    console.warn('[supportService] staff broadcast failed:', e.message)
  }

  return ticket
}

// [P2.1 TAKEOVER] саммари для владельца: кто клиент, тариф, что хотел, что бот уже пробовал
export async function buildTakeoverSummary(ticket) {
  const lines = []
  let clientLine = `<b>👤 Клиент:</b> ${ticket.userName || ticket.userEmail || '—'}`
  try {
    const { default: User } = await import('../models/User.js')
    const user = ticket.userId
      ? await User.findById(ticket.userId).select('name email subscription isFoundingMember').lean()
      : await User.findOne({ telegramChatId: String(ticket.telegramChatId || '') }).select('name email subscription isFoundingMember').lean()
    if (user) {
      clientLine = `<b>👤 Клиент:</b> ${user.name || user.email} (${user.email})`
      lines.push(`<b>💎 Тариф:</b> ${user.subscription || 'free'}${user.isFoundingMember ? ' · founding' : ''}`)
    }
  } catch { /* best-effort */ }
  lines.unshift(clientLine)
  lines.push(`<b>📱 Источник:</b> ${getSourceBadge(ticket.source)}`)
  lines.push(`<b>🎯 Хотел:</b> ${(ticket.description || ticket.subject || '').slice(0, 250)}`)

  // что бот уже пробовал — последние реплики диалога из ClientDialogue
  if (ticket.telegramChatId) {
    try {
      const { default: ClientDialogue } = await import('../models/ClientDialogue.js')
      const doc = await ClientDialogue.findOne({ telegramChatId: String(ticket.telegramChatId) }).sort({ updatedAt: -1 }).lean()
      const last = (doc?.messages || []).slice(-4)
      if (last.length) {
        lines.push('<b>🤖 Бот уже пробовал:</b>')
        for (const m of last) lines.push(`  ${m.role === 'user' ? '👤' : '🤖'} ${String(m.content).slice(0, 100)}`)
      }
    } catch { /* best-effort */ }
  }
  if (ticket.aiSuggestion) lines.push(`<b>💡 AI-анализ:</b> ${Math.round((ticket.aiConfidence || 0) * 100)}% — ${ticket.aiSuggestion.slice(0, 120)}`)
  return lines.join('\n')
}

export async function addMessage(ticketId, sender, text) {
  const ticket = await SupportTicket.findById(ticketId)
  if (!ticket) return null
  ticket.messages.push({ sender, text, timestamp: new Date() })
  ticket.updatedAt = new Date()
  await ticket.save()
  return ticket
}

// [SUPPORT-PUSH-FIX] дописать сообщение клиента в его открытый тикет (без создания нового)
export async function appendToOpenTicket(telegramChatId, text) {
  const ticket = await SupportTicket.findOne({
    telegramChatId: String(telegramChatId),
    status: { $in: ['open', 'needs_owner', 'in_progress', 'ai_handled'] }
  }).sort({ updatedAt: -1 })
  if (!ticket) return null
  ticket.messages.push({ sender: 'client', text: text.slice(0, 2000), timestamp: new Date() })
  ticket.updatedAt = new Date()
  await ticket.save()
  return ticket
}

// [BOT-LINKS-TICKET-SYNC] зеркалирование: ответ оператора/владельца сохраняется в тикет и доставляется клиенту во все каналы
export async function replyToTicket(ticketId, sender, text, options = {}) {
  const ticket = await SupportTicket.findById(ticketId)
  if (!ticket) return null
  const senderRole = options.role || sender
  ticket.messages.push({ sender, text: text.slice(0, 2000), timestamp: new Date(), role: senderRole })
  ticket.updatedAt = new Date()
  if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date()
  await ticket.save()

  const isOperator = /^(owner|operator|admin|staff)$/i.test(senderRole)
  if (ticket.telegramChatId && isOperator) {
    try {
      const { sendClientMessage } = await import('./omegaBot.js')
      await sendClientMessage(
        ticket.telegramChatId,
        `👤 <b>Специалист:</b>\n${text.slice(0, 2000)}`,
        { parse_mode: 'HTML' }
      )
      try {
        const { default: ClientDialogue } = await import('../models/ClientDialogue.js')
        await ClientDialogue.findOneAndUpdate(
          { telegramChatId: String(ticket.telegramChatId) },
          {
            $push: { messages: { role: 'assistant', content: text.slice(0, 2000), intent: 'support', timestamp: new Date() } },
            $set: { updatedAt: new Date() }
          },
          { upsert: true }
        )
      } catch (e) { console.warn('[supportService] dialogue persist failed:', e.message) }
    } catch (e) {
      console.warn('[supportService] telegram reply failed:', e.message)
    }
  }
  return ticket
}

export async function updateTicketStatus(ticketId, status, resolution = null) {
  const update = { status, updatedAt: new Date() }
  if (resolution) update.resolution = resolution
  return await SupportTicket.findByIdAndUpdate(ticketId, update, { new: true })
}

export async function getTicketContext(ticketId) {
  const ticket = await SupportTicket.findById(ticketId).lean()
  if (!ticket) return null
  const related = await SupportTicket.find({ userId: ticket.userId, _id: { $ne: ticket._id } }).sort({ createdAt: -1 }).limit(5).lean()
  return {
    ticket,
    relatedTickets: related,
    metrics: {
      totalUserTickets: related.length + 1,
      lastTicketAt: related[0]?.createdAt || ticket.createdAt
    },
    recommendations: ticket.aiSuggestion ? [ticket.aiSuggestion] : []
  }
}

export async function escalateToOwner(ticketId, reason = '') {
  const ticket = await SupportTicket.findByIdAndUpdate(
    ticketId,
    { status: 'needs_owner', priority: 'urgent', updatedAt: new Date() },
    { new: true }
  )
  if (ticket) {
    await alertOwner(`🔴 <b>Эскалация тикета #${ticket._id.toString().slice(-6)}</b>\nПричина: ${reason || 'запрошено вручную'}\nТема: ${ticket.subject}\nОткрыть Dashboard → Поддержка.`)
  }
  return ticket
}
