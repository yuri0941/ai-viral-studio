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
  if (source === 'web') return 'Web'
  if (source === 'widget') return 'Widget'
  if (source === 'chat') return 'Chat'
  return 'Other'
}

export async function createTicket(data) {
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
  await ticket.save()

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

  if (ticket.priority === 'urgent' || ticket.priority === 'high' || ticket.aiConfidence < 0.7) {
    try {
      const emoji = ticket.priority === 'urgent' ? '🔴' : '🟠'
      const priorityLabel = ticket.priority === 'urgent' ? 'Срочный' : ticket.priority === 'high' ? 'Высокий' : 'Нормальный'
      await alertOwner([
        `${emoji} <b>Тикет #${ticket._id.toString().slice(-6)} требует внимания!</b>`,
        `━━━━━━━━━━━━━━`,
        `<b>👤 Клиент:</b> ${data.userName || data.userEmail || '—'}`,
        `<b>📱 Источник:</b> ${getSourceBadge(source)}`,
        `<b>🎯 Тема:</b> ${data.subject}`,
        `<b>⚡ Приоритет:</b> ${priorityLabel}`,
        `<b>💡 AI-анализ:</b> ${Math.round(ticket.aiConfidence * 100)}% — ${ticket.aiSuggestion?.slice(0, 120)}...`,
        `📝 <i>${(data.description || '').slice(0, 200)}</i>`,
        `━━━━━━━━━━━━━━`,
        `<a href="https://aiviral-studio.ru/owner?tab=support">Открыть в Dashboard →</a>`
      ].join('\n'), {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👁 Присоединиться', callback_data: `ticket:join:${ticket._id}` }, { text: '✅ Закрыть', callback_data: `ticket:close:${ticket._id}` }],
            [{ text: '⬆️ Эскалация', callback_data: `ticket:escalate:${ticket._id}` }]
          ]
        }
      })
    } catch (e) {
      console.warn('[supportService] owner alert failed:', e.message)
    }
  }

  return ticket
}

export async function addMessage(ticketId, sender, text) {
  const ticket = await SupportTicket.findById(ticketId)
  if (!ticket) return null
  ticket.messages.push({ sender, text, timestamp: new Date() })
  ticket.updatedAt = new Date()
  await ticket.save()
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
