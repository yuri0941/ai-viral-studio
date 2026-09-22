// [KNOWLEDGE-PACK З4] Лог выбора клиентом варианта упаковки (тайтл/хук/описание) → Self-Optimize:
// система учится, какие формулы клиенты берут чаще и насколько согласны с AI-ранжированием.
// Паттерн CoverChoiceLog (COVERS-SUPREME З6): байас по win-rate формул, кэш 5 мин,
// выборок < 8 → нейтраль (системе ещё не на чем учиться).
import mongoose from 'mongoose'

const metaChoiceLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, default: 'title' },   // title | hook | description
    topic: { type: String, default: '' },
    platform: { type: String, default: 'youtube' },
    lang: { type: String, default: 'en' },
    chosenIndex: { type: Number, required: true },
    formula: { type: String, default: null },   // id формулы выбранного варианта (Y3-how-i-outcome, the-statistic…)
    score: { type: Number, default: null },     // детерминированный скор выбранного варианта
    bestScore: { type: Number, default: null }, // скор варианта, который Омега ставила первым
    pickedBest: { type: Boolean, default: false },
}, { timestamps: true })

metaChoiceLogSchema.index({ createdAt: -1 })
metaChoiceLogSchema.index({ kind: 1, createdAt: -1 })

const MetaChoiceLog = mongoose.models.MetaChoiceLog || mongoose.model('MetaChoiceLog', metaChoiceLogSchema)

let biasCache = { value: null, at: 0 }
export async function getMetaChoiceBias(kind = 'title') {
    const cacheKey = String(kind)
    if (biasCache.value?.[cacheKey] && Date.now() - biasCache.at < 5 * 60 * 1000) return biasCache.value[cacheKey]
    let bias = { formulaBoost: {}, agreeRate: null, samples: 0 }
    try {
        const since = new Date(Date.now() - 60 * 24 * 3600 * 1000)
        const rows = await MetaChoiceLog.aggregate([
            { $match: { createdAt: { $gte: since }, kind: cacheKey, formula: { $ne: null } } },
            { $group: { _id: '$formula', picks: { $sum: 1 }, bestPicks: { $sum: { $cond: ['$pickedBest', 1, 0] } } } },
        ])
        const total = rows.reduce((s, r) => s + r.picks, 0)
        if (total >= 8) {
            bias.samples = total
            bias.agreeRate = Math.round((rows.reduce((s, r) => s + r.bestPicks, 0) / total) * 100) / 100
            const expected = total / rows.length
            for (const r of rows) {
                bias.formulaBoost[r._id] = Math.max(-0.5, Math.min(1.5, (r.picks - expected) / expected))
            }
        }
    } catch (e) {
        console.warn('[MetaChoiceLog] bias failed:', e.message)
    }
    biasCache = { value: { ...(biasCache.value || {}), [cacheKey]: bias }, at: Date.now() }
    return bias
}

export default MetaChoiceLog
