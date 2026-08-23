// [PLANCONFIG-ADMIN] AI-советчик тарифов: собирает реальные данные (использование лимитов,
// упоры в потолок, распределение по планам, оплаты, воронка, MRR, founding) и просит OMEGA
// дать рекомендации по составу/ценам. Только совет — применяет владелец вручную.
import PlanConfig from '../models/PlanConfig.js'
import PriceChangeLog from '../models/PriceChangeLog.js'
import UsageQuota from '../models/UsageQuota.js'
import Payment from '../models/Payment.js'
import User from '../models/User.js'
import { getFunnel, calcMRR } from './metricsService.js'
import { analyzePricing } from './pricingAnalysis.js'
import { getFoundingStats } from './foundingService.js'
import { chatWithAI, extractText } from './aiService.js'

export async function collectAdvisorData() {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [plans, planDist, usagePressure, overageCount, freeTrialExhausted, paymentsByPlan,
        funnel7, funnel30, mrr, founding, recentChanges] = await Promise.all([
        PlanConfig.getAll(),
        User.aggregate([{ $group: { _id: '$subscription', count: { $sum: 1 } } }]),
        // % пользователей у потолка дневного/цикличного лимита генераций
        UsageQuota.aggregate([
            { $match: { generationsLimit: { $gt: 0 } } },
            { $project: { plan: 1, ratio: { $divide: ['$generationsUsed', '$generationsLimit'] } } },
            { $group: { _id: '$plan', users: { $sum: 1 }, atLimit80: { $sum: { $cond: [{ $gte: ['$ratio', 0.8] }, 1, 0] } } } },
        ]),
        UsageQuota.countDocuments({ overageUsed: { $gt: 0 } }),
        UsageQuota.countDocuments({ plan: 'free', trialTokens: 0 }),
        Payment.aggregate([
            { $match: { status: 'succeeded', createdAt: { $gte: since30 } } },
            { $group: { _id: '$planId', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
        ]),
        getFunnel(7).catch(() => null),
        getFunnel(30).catch(() => null),
        calcMRR().catch(() => null),
        getFoundingStats().catch(() => null),
        PriceChangeLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    ])

    // Маржа по каждому платному тарифу (существующий движок pricingAnalysis)
    const margins = {}
    for (const p of plans.filter(p => p.price > 0)) {
        try {
            const a = await analyzePricing(`tariff.${p.plan}`)
            margins[p.plan] = { marginNow: a.marginNow, sales30d: a.sales30d, recommendation: a.recommendation }
        } catch { /* best-effort */ }
    }

    return {
        plans: plans.map(p => ({ plan: p.plan, price: p.price, quotas: p.quotas, features: p.features })),
        planDistribution: Object.fromEntries(planDist.map(d => [d._id || 'free', d.count])),
        usagePressure: Object.fromEntries(usagePressure.map(u => [u._id, { users: u.users, atLimit80pct: u.atLimit80 }])),
        overageUsers: overageCount,
        freeTrialExhausted,
        payments30d: paymentsByPlan.map(p => ({ plan: p._id, count: p.count, revenueRub: p.revenue })),
        funnel7d: funnel7,
        funnel30d: funnel30,
        mrr,
        founding,
        recentPriceChanges: recentChanges.map(c => ({ what: c.what, oldPrice: c.oldPrice, newPrice: c.newPrice, at: c.createdAt })),
        margins,
    }
}

// Эвристический фолбэк, если AI-провайдер недоступен — советчик работает всегда
function heuristicRecommendations(data) {
    const recs = []
    for (const [plan, u] of Object.entries(data.usagePressure || {})) {
        if (u.users > 0 && u.atLimit80 / u.users >= 0.3) {
            recs.push(`⚠️ ${plan}: ${u.atLimit80}/${u.users} пользователей у потолка генераций (≥80%). Рассмотрите повышение лимита или усиление апсейла на следующий тариф.`)
        }
    }
    if (data.overageUsers > 0) {
        recs.push(`💸 ${data.overageUsers} пользователей переплачивают за overage — кандидаты на апгрейд тарифа.`)
    }
    if (data.freeTrialExhausted > 0) {
        recs.push(`🔒 ${data.freeTrialExhausted} free-пользователей исчерпали trial — точка конверсии в платный тариф.`)
    }
    for (const [plan, m] of Object.entries(data.margins || {})) {
        if (m.marginNow < 30) recs.push(`📉 ${plan}: маржа ${m.marginNow}% ниже 30% — рассмотрите цену ${m.recommendation?.optimal}₽ (диапазон ${m.recommendation?.min}–${m.recommendation?.max}₽).`)
    }
    if (!recs.length) recs.push('✅ Критических отклонений не выявлено: лимиты не душат пользователей, маржа в норме.')
    return recs.join('\n')
}

export async function getAdvisorReport() {
    const data = await collectAdvisorData()

    const prompt = `Ты — pricing-аналитик AI Viral Studio. Вот реальные данные (JSON):
${JSON.stringify(data, null, 1)}

Дай рекомендации владельцу по составу и ценам тарифов (free/pro/agency) на русском, структурировано:
1. Что показывают данные (упоры в лимиты, конверсия, маржа, выручка по тарифам).
2. Конкретные рекомендации по ценам и квотам с обоснованием ЦИФРАМИ из данных выше.
3. Чего не хватает в данных для точных выводов.
Ничего не выдумывай — опирайся только на присланные цифры. До 2000 символов.`

    let recommendations = ''
    let aiUsed = false
    try {
        const ai = await chatWithAI(prompt, [], 'ru', { maxTokens: 1500, temperature: 0.4 })
        recommendations = extractText(ai) || ''
        aiUsed = !!recommendations
    } catch (err) {
        console.warn('[planAdvisor] AI недоступен, эвристика:', err.message)
    }
    if (!recommendations) recommendations = heuristicRecommendations(data)

    return { data, recommendations, aiUsed }
}
