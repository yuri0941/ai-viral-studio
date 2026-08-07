import { OmegaTransaction } from '../models/index.js'

export function calculateDynamicLimit(mrr) {
    if (!mrr || mrr < 1000) return 20
    if (mrr < 5000) return 100
    return Math.max(200, Math.round(mrr * 0.02))
}

export async function getROIBreakdown(ownerId) {
    const categories = [
        { name: 'AI-генерация', income: 4200, expense: 800 },
        { name: 'Реклама', income: 8900, expense: 3200 },
        { name: 'Персонал', income: 0, expense: 2100 },
        { name: 'Инфраструктура', income: 0, expense: 1200 },
    ]
    return categories.map(c => ({
        ...c,
        roi: c.expense > 0 ? Math.round(((c.income - c.expense) / c.expense) * 100) : 0,
    }))
}

export async function getMRRForecast(ownerId, days = 90) {
    const baseMrr = 12500
    const dailyGrowth = 120
    const dates = []
    const values = []
    const now = new Date()
    for (let i = 1; i <= days; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
        dates.push(d.toISOString().slice(0, 10))
        values.push(Math.round(baseMrr + dailyGrowth * i + Math.sin(i / 7) * 500))
    }
    return { dates, values }
}

export async function logTransaction(ownerId, type, category, amount, status = 'completed', description = '') {
    return await OmegaTransaction.create({
        ownerId,
        type,
        category,
        amount,
        status,
        description,
        currency: 'USD',
        source: 'omega_auto',
    })
}

export async function getTransactions(ownerId, { category, status, page = 1, limit = 20 } = {}) {
    const filter = { ownerId }
    if (category) filter.category = category
    if (status) filter.status = status
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
        OmegaTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        OmegaTransaction.countDocuments(filter),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
}
