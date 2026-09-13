import mongoose from 'mongoose'

// [OWNER-OMEGA] Лайт-учёт AI-вызовов: каждая успешная генерация пишется сюда (fire-and-forget).
// Полный сбор расходов OMEGA — отдельная задача P13.8, тут только лайт-версия.
const AiUsageLogSchema = new mongoose.Schema({
    provider: { type: String, required: true, index: true },
    promptChars: { type: Number, default: 0 },
    completionChars: { type: Number, default: 0 },
    estTokens: { type: Number, default: 0 },
    estCostUsd: { type: Number, default: 0 },
    // [HOTFIX-FINAL] пометка генераций владельца — в клиентскую статистику/маржу не входит
    isOwner: { type: Boolean, default: false },
    // [REAL-DATA З5.3.1] какое действие породило вызов (chat/script/cover/…) — основа себестоимости по функциям
    action: { type: String, default: '', index: true },
    createdAt: { type: Date, default: Date.now },
})

// TTL 90 дней — лайт-учёт не должен раздувать БД
AiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 })

export default mongoose.model('AiUsageLog', AiUsageLogSchema)
