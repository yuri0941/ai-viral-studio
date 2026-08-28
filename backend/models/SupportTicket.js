import mongoose from 'mongoose'

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userEmail: String,
  userName: String,
  subject: { type: String, required: true },
  description: { type: String, required: true },
  screenshotBase64: { type: String, maxLength: 500000 },
  // [STAFF-DOP] 'waiting' — оператор ждёт ответа клиента (staff-кабинет)
  status: { type: String, enum: ['open','ai_handled','needs_owner','in_progress','waiting','resolved','closed'], default: 'open' },
  priority: { type: String, enum: ['low','normal','medium','high','urgent','critical'], default: 'normal' },
  aiSuggestion: String,
  aiConfidence: Number,
  assignedTo: { type: String, default: null },
  telegramChatId: String,
  // [P2.1] источник обращения (web/telegram/widget/chat) — раньше поле не было в схеме и молча отбрасывалось
  source: { type: String, default: 'web' },
  resolution: String,
  // [P2.1] takeover: владелец ведёт диалог вручную, AI молчит
  takeoverBy: { type: String, default: null },
  takeoverAt: { type: Date, default: null },
  // [P2.1] CSAT 1–5 после закрытия
  csat: { type: Number, min: 1, max: 5, default: null },
  csatAt: { type: Date, default: null },
  // [P2.1] метрики: первое действие по тикету (AI-ответ или takeover) и закрытие
  firstResponseAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  messages: [{ sender: String, text: String, timestamp: Date }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

SupportTicketSchema.index({ telegramChatId: 1, status: 1 })

export default mongoose.model('SupportTicket', SupportTicketSchema)
