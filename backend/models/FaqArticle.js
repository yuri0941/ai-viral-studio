import mongoose from 'mongoose'

// [P2.1] FAQ/база знаний клиентского бота. Бот отвечает ТОЛЬКО из базы + фактов аккаунта.
const FaqArticleSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  keywords: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  createdBy: { type: String, default: 'seed' }, // 'seed' | 'owner'
}, { timestamps: true })

FaqArticleSchema.index({ active: 1 })

export default mongoose.model('FaqArticle', FaqArticleSchema)
