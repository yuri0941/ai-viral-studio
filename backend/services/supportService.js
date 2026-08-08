import SupportTicket from '../models/SupportTicket.js'
import { chatWithAI } from './aiService.js'
import { alertOwner } from './ownerBot.js'
import { createNode } from './cognitiveMesh.js'

export async function createTicket(data) {
  const ticket = await SupportTicket.create(data)
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
  if (ticket.aiConfidence < 0.7) {
    try {
      alertOwner(`🆘 Тикет #${ticket._id} требует внимания!\nТема: ${data.subject}\nAI не уверен (${Math.round(ticket.aiConfidence * 100)}%).\nОтветь в Dashboard → Поддержка.`)
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
