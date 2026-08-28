// [OWNER-OMEGA] Лайт-трекер расходов на AI: лог вызовов + оценка стоимости по провайдеру.
// Цены — грубая оценка USD за 1M токенов (blended in/out); токены оцениваются как chars/4,
// т.к. провайдеры в fallback-цепочке не всегда возвращают usage. Точный биллинг — P13.8.
import AiUsageLog from '../models/AiUsageLog.js'
import InfraExpense from '../models/InfraExpense.js'

const COST_PER_1M_USD = {
    groq: 0.10,
    openrouter: 0.20,
    openai: 2.50,
    deepseek: 0.14,
    cerebras: 0.10,
    together: 0.20,
    fireworks: 0.20,
    mistral: 0.25,
    cohere: 0.30,
    gemini: 0.10,
    github: 0.0,
    pollinations: 0.0,
}

// fire-and-forget: учёт НИКОГДА не должен ломать/тормозить ответ пользователю
export function logAiUsage(provider, promptText, replyText) {
    try {
        const promptChars = String(promptText || '').length
        const completionChars = String(replyText || '').length
        const estTokens = Math.ceil((promptChars + completionChars) / 4)
        const price = COST_PER_1M_USD[provider] ?? 0.20
        const estCostUsd = (estTokens / 1_000_000) * price
        AiUsageLog.create({ provider, promptChars, completionChars, estTokens, estCostUsd })
            .catch(e => console.warn('[expenseTracker] log failed:', e.message))
    } catch { /* never throw */ }
}

const RANGE_MS = {
    day: 24 * 3600 * 1000,
    week: 7 * 24 * 3600 * 1000,
    month: 30 * 24 * 3600 * 1000,
}

export async function getExpensesSummary() {
    const now = Date.now()
    const [byRange, infra] = await Promise.all([
        Promise.all(Object.entries(RANGE_MS).map(async ([range, ms]) => {
            const rows = await AiUsageLog.aggregate([
                { $match: { createdAt: { $gte: new Date(now - ms) } } },
                { $group: { _id: '$provider', calls: { $sum: 1 }, tokens: { $sum: '$estTokens' }, costUsd: { $sum: '$estCostUsd' } } },
                { $sort: { costUsd: -1 } },
            ])
            return [range, {
                calls: rows.reduce((s, r) => s + r.calls, 0),
                costUsd: Math.round(rows.reduce((s, r) => s + r.costUsd, 0) * 100) / 100,
                byProvider: rows.map(r => ({
                    provider: r._id,
                    calls: r.calls,
                    tokens: r.tokens,
                    costUsd: Math.round(r.costUsd * 10000) / 10000,
                })),
            }]
        })),
        InfraExpense.find().sort({ service: 1 }).lean(),
    ])
    return {
        ai: Object.fromEntries(byRange),
        infra: infra.map(e => ({ service: e.service, amountRub: e.amountRub, note: e.note, updatedAt: e.updatedAt })),
        infraTotalRub: infra.reduce((s, e) => s + (Number(e.amountRub) || 0), 0),
    }
}

export async function upsertInfraExpense(service, amountRub, note, actor = '') {
    const name = String(service || '').trim()
    if (!name) throw new Error('service required')
    const doc = await InfraExpense.findOneAndUpdate(
        { service: name },
        { $set: { amountRub: Math.max(0, Number(amountRub) || 0), note: String(note || '').slice(0, 300), updatedBy: actor } },
        { upsert: true, new: true },
    )
    return doc
}

export async function deleteInfraExpense(service) {
    await InfraExpense.deleteOne({ service: String(service || '').trim() })
}
