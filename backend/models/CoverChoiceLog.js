// [COVERS-SUPREME З6] Лог выбора обложки клиентом → Self-Optimize: система учится на
// реальных выборах (какие схемы/источники берут чаще), пресеты композиции подстраиваются.
import mongoose from 'mongoose'

const coverChoiceLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, default: '' },
    platform: { type: String, default: 'youtube' },
    chosenIndex: { type: Number, required: true },
    scheme: { type: Number, default: 0 },
    source: { type: String, default: 'frame' }, // frame | youtube-frames | youtube | ai
    score: { type: Number, default: null },     // AI-скор выбранного варианта
    bestScore: { type: Number, default: null }, // скор варианта, который Омега ставила первым
    pickedBest: { type: Boolean, default: false }, // клиент согласен с ранжированием?
}, { timestamps: true })

coverChoiceLogSchema.index({ createdAt: -1 })

const CoverChoiceLog = mongoose.models.CoverChoiceLog || mongoose.model('CoverChoiceLog', coverChoiceLogSchema)

// Байас из реальных выборов: win-rate схем (0/1/2) и насколько клиенты согласны с AI-ранжированием.
// Кэш 5 мин; выборок < 8 → нейтраль (системе ещё не на чем учиться).
let biasCache = { value: null, at: 0 }
export async function getChoiceBias() {
    if (biasCache.value && Date.now() - biasCache.at < 5 * 60 * 1000) return biasCache.value
    let bias = { schemeBoost: { 0: 0, 1: 0, 2: 0 }, agreeRate: null, samples: 0 }
    try {
        const since = new Date(Date.now() - 60 * 24 * 3600 * 1000)
        const rows = await CoverChoiceLog.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$scheme', picks: { $sum: 1 }, bestPicks: { $sum: { $cond: ['$pickedBest', 1, 0] } } } },
        ])
        const total = rows.reduce((s, r) => s + r.picks, 0)
        if (total >= 8) {
            const bestPicks = rows.reduce((s, r) => s + r.bestPicks, 0)
            bias.samples = total
            bias.agreeRate = Math.round((bestPicks / total) * 100) / 100
            const expected = total / 3
            for (const r of rows) {
                bias.schemeBoost[r._id] = Math.max(-0.5, Math.min(1.5, (r.picks - expected) / expected))
            }
        }
    } catch (e) {
        console.warn('[CoverChoiceLog] bias failed:', e.message)
    }
    biasCache = { value: bias, at: Date.now() }
    return bias
}

export default CoverChoiceLog
