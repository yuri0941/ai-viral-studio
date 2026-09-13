// [REAL-DATA З5.3] Реестр цен действий (✦): единый источник цен, фактическая себестоимость
// из логов (AiUsageLog.action), маржинальный пол 70% (паттерн marginService для пакетов).
import AiUsageLog from '../models/AiUsageLog.js'
import ActionSpendLog from '../models/ActionSpendLog.js'
import { CreditPack } from '../models/CreditPack.js'
import { getActionPrices, ACTION_PRICE_DEFAULTS } from '../models/OwnerSettings.js'
import { COST_PER_CREDIT, ACQUIRING_PERCENT, TAX_PERCENT, MARGIN_FLOOR_PERCENT } from './marginService.js'

// Курс для перевода оценки расхода AI (USD → ₽): тот же, что в /subscriptions/exchange-rate (1 USD ≈ 90.9₽)
export const USD_TO_RUB = 1 / 0.011

// Реестр действий: id → поле OwnerSettings + подписи. Порядок = порядок в кабинете.
export const ACTION_REGISTRY = [
    { id: 'chat', priceKey: 'chatMessageCostCredits', labelRu: 'Сообщение в чате OMEGA', labelEn: 'OMEGA chat message' },
    { id: 'video_analysis', priceKey: 'videoAnalysisCostCredits', labelRu: 'Разбор загруженного видео', labelEn: 'Uploaded video analysis' },
    { id: 'link_analysis', priceKey: 'linkAnalysisCostCredits', labelRu: 'Анализ видео по ссылке', labelEn: 'Video analysis by link' },
    { id: 'script', priceKey: 'scriptGenerationCostCredits', labelRu: 'Сценарий из мысли', labelEn: 'Script from idea' },
    { id: 'cover', priceKey: 'coverGenerationCostCredits', labelRu: 'Генерация обложек (3 варианта)', labelEn: 'Cover variants (3)' },
    { id: 'vision', priceKey: 'visionAnalysisCostCredits', labelRu: 'Анализ изображения (Vision)', labelEn: 'Image analysis (Vision)' },
    { id: 'tts', priceKey: 'ttsCostCredits', labelRu: 'Озвучка (TTS)', labelEn: 'Text-to-speech' },
    { id: 'niche_competitors', priceKey: 'nicheCompetitorsCostCredits', labelRu: 'Конкуренты ниши', labelEn: 'Niche competitors' },
]

const NET_RATIO = 1 - (ACQUIRING_PERCENT + TAX_PERCENT) / 100

// Продажная цена 1✦ в ₽ — входной (самый маленький) пакет: стандартная цена кредита.
// Пакетов нет → оценка из себестоимости: 0.24₽ / 0.7 ≈ 0.35₽ (минимально допустимая цена ✦).
export async function getCreditSalePriceRub() {
    try {
        const packs = await CreditPack.find({}).sort({ credits: 1 }).lean()
        const base = (packs || []).find(p => p.credits > 0 && p.priceRub > 0)
        if (base) return base.priceRub / base.credits
    } catch { /* fallback ниже */ }
    return COST_PER_CREDIT / (1 - MARGIN_FLOOR_PERCENT / 100)
}

// Фактическая себестоимость действия в ₽: средний расход AI за 30 дней по логам (без генераций владельца).
// Логов по действию нет → null (честно: «нет данных»), НЕ выдуманная цифра.
export async function getActionCostsRub(days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
    const rows = await AiUsageLog.aggregate([
        { $match: { createdAt: { $gte: since }, action: { $ne: '' }, isOwner: { $ne: true } } },
        { $group: { _id: '$action', calls: { $sum: 1 }, costUsd: { $sum: '$estCostUsd' } } },
    ])
    const out = {}
    for (const r of rows) {
        out[r._id] = {
            calls: r.calls,
            totalCostRub: Math.round(r.costUsd * USD_TO_RUB * 100) / 100,
            avgCostRub: r.calls > 0 ? Math.round((r.costUsd * USD_TO_RUB) / r.calls * 10000) / 10000 : 0,
        }
    }
    return out
}

// Маржинальный пол: минимум ✦ при текущей себестоимости.
// Маржа = (нетто − себестоимость) / нетто; нетто = priceCredits × цена✦ × (1 − комиссия − налог).
// Себестоимость измерена (логи 30д) → факт; не измерена → базовая оценка 0.24₽ за вызов (1 генерация).
export async function getActionFloorCredits(actionId, priceCredits) {
    const costs = await getActionCostsRub(30)
    const measured = costs[actionId]?.avgCostRub
    const price = Math.max(0, Number(priceCredits) || 0)
    const costRub = Number.isFinite(measured) ? measured : COST_PER_CREDIT
    const saleRub = await getCreditSalePriceRub()
    // min цена ✦: costRub = minCredits × saleRub × NET_RATIO × (1 − floor)
    const minCredits = Math.max(1, Math.ceil(costRub / (saleRub * NET_RATIO * (1 - MARGIN_FLOOR_PERCENT / 100)) - 1e-9))
    const netRub = price * saleRub * NET_RATIO
    const marginPercent = price > 0 ? Math.round(((netRub - costRub) / netRub) * 1000) / 10 : null
    return {
        minCredits,
        costRub: Math.round(costRub * 10000) / 10000,
        costMeasured: Number.isFinite(measured),
        saleRubPerCredit: Math.round(saleRub * 100) / 100,
        marginPercent,
        belowFloor: price > 0 && marginPercent !== null && marginPercent < MARGIN_FLOOR_PERCENT,
    }
}

// Полная карточка реестра для кабинета владельца: цена ✦ + себестоимость ₽ + маржа %.
export async function getActionPricesWithCosts() {
    const [prices, costs, saleRub] = await Promise.all([getActionPrices(), getActionCostsRub(30), getCreditSalePriceRub()])
    const items = []
    for (const meta of ACTION_REGISTRY) {
        const price = prices[meta.priceKey] ?? ACTION_PRICE_DEFAULTS[meta.priceKey]
        const cost = costs[meta.id] || null
        const costRub = cost ? cost.avgCostRub : COST_PER_CREDIT // без логов — базовая оценка 0.24₽/вызов
        const netRub = price * saleRub * NET_RATIO
        const marginPercent = price > 0 ? Math.round(((netRub - costRub) / netRub) * 1000) / 10 : null
        items.push({
            ...meta,
            priceCredits: price,
            costRub: Math.round(costRub * 10000) / 10000,
            costMeasured: !!cost,
            aiCalls30d: cost?.calls || 0,
            marginPercent,
            belowFloor: marginPercent !== null && marginPercent < MARGIN_FLOOR_PERCENT,
        })
    }
    return { items, saleRubPerCredit: Math.round(saleRub * 100) / 100, floorPercent: MARGIN_FLOOR_PERCENT }
}

// [REAL-DATA З5.3.3] Аналитика расхода за N дней: функция → штук → списано ✦ → себестоимость ₽ → маржа ₽.
export async function getActionSpendAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
    const [spend, costs, prices, saleRub] = await Promise.all([
        ActionSpendLog.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$action', count: { $sum: 1 }, credits: { $sum: '$costCredits' } } },
        ]),
        getActionCostsRub(days),
        getActionPrices(),
        getCreditSalePriceRub(),
    ])
    const spendByAction = Object.fromEntries(spend.map(s => [s._id, s]))
    const rows = ACTION_REGISTRY.map(meta => {
        const s = spendByAction[meta.id]
        const c = costs[meta.id]
        const credits = s?.credits || 0
        const costRub = c?.totalCostRub || 0
        const revenueRub = Math.round(credits * saleRub * 100) / 100
        const marginRub = Math.round((revenueRub * NET_RATIO - costRub) * 100) / 100
        return {
            ...meta,
            priceCredits: prices[meta.priceKey] ?? ACTION_PRICE_DEFAULTS[meta.priceKey],
            count: s?.count || 0,
            creditsSpent: credits,
            costRub: Math.round(costRub * 100) / 100,
            revenueRub,
            marginRub,
            lossMaking: marginRub < 0,
        }
    })
    // Топ убыточных — первыми
    rows.sort((a, b) => a.marginRub - b.marginRub)
    return { days, rows, saleRubPerCredit: Math.round(saleRub * 100) / 100 }
}
