import mongoose from 'mongoose'

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userEmail: String,
  userName: String,
  subject: { type: String, required: true },
  description: { type: String, required: true },
  screenshotBase64: { type: String, maxLength: 500000 },
  status: { type: String, enum: ['open','ai_handled','needs_owner','in_progress','resolved','closed'], default: 'open' },
  priority: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  aiSuggestion: String,
  aiConfidence: Number,
  assignedTo: { type: String, default: null },
  telegramChatId: String,
  messages: [{ sender: String, text: String, timestamp: Date }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model('SupportTicket', SupportTicketSchema)
