import mongoose from 'mongoose'

// [REAL-DATA З5.3.3] Журнал списаний ✦ по действиям: каждая платная функция пишет сюда
// факт списания (fire-and-forget из consumeGeneration). Основа аналитики расхода у владельца.
const actionSpendLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true }, // chat | video_analysis | script | cover | link_analysis | vision | ...
    costCredits: { type: Number, required: true, min: 1 },
    via: { type: String, enum: ['quota', 'trial', 'overage'], default: 'quota' },
    createdAt: { type: Date, default: Date.now },
})

// TTL 180 дней — аналитика 7/30 дней + история
actionSpendLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 })
actionSpendLogSchema.index({ action: 1, createdAt: 1 })

export const ActionSpendLog = mongoose.models.ActionSpendLog || mongoose.model('ActionSpendLog', actionSpendLogSchema)
export default ActionSpendLog
