import PlanConfig from '../models/PlanConfig.js'
import AdPricing from '../models/AdPricing.js'
import Payment from '../models/Payment.js'
import UsageQuota from '../models/UsageQuota.js'
import { getProviderKey, generateContent } from './aiService.js'

// [25-TARIFF-GATES] cost assumptions (RUB)
const YOOKASSA_FEE = 0.035 // 3.5%
const TAX_NPD = 0.06 // 6%
const AI_TOKEN_COST_PER_GENERATION = 0.5 // approx ₽/generation
const SUPPORT_COST_PER_USER = 30 // monthly fixed cost allocation

async function getCostPerUnit(planId) {
    try {
        const quota = await UsageQuota.findOne({ plan: planId }).sort({ createdAt: -1 }).lean()
        const gens = quota?.generationsUsed || 0
        const aiCost = gens * AI_TOKEN_COST_PER_GENERATION
        return aiCost + SUPPORT_COST_PER_USER
    } catch {
        return AI_TOKEN_COST_PER_GENERATION * 100 + SUPPORT_COST_PER_USER
    }
}

async function getSales30d(planId) {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return await Payment.countDocuments({
            status: 'succeeded',
            'metadata.planId': planId,
            createdAt: { $gte: since }
        })
    } catch {
        return 0
    }
}

async function getConversionFreeToPaid() {
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const total = await Payment.countDocuments({ createdAt: { $gte: since }, status: 'succeeded' })
        const free = await Payment.countDocuments({ createdAt: { $gte: since }, 'metadata.planId': 'free' })
        if (total === 0) return 0
        return Math.round(((total - free) / total) * 100)
    } catch {
        return 0
    }
}

export async function analyzePricing(what) {
    // what: tariff.free | tariff.pro | tariff.agency | ad.channel.cpm | ad.channel.cpc | ad.channel.cpa | ad.app.banner
    const [type, target, field] = what.split('.')

    let currentPrice = 0
    if (type === 'tariff') {
        const plan = await PlanConfig.getPlan(target)
        currentPrice = plan.price
    } else if (type === 'ad' && target === 'channel') {
        const pricing = await AdPricing.findOne().lean()
        currentPrice = pricing?.[field] || 0
    } else if (type === 'ad' && target === 'app') {
        currentPrice = 0 // banner pricing placeholder
    }

    const costPerUnit = await getCostPerUnit(target)
    const fee = currentPrice * YOOKASSA_FEE
    const tax = currentPrice * TAX_NPD
    const totalCost = costPerUnit + fee + tax
    const marginNow = currentPrice > 0 ? Math.round(((currentPrice - totalCost) / currentPrice) * 100) : 0

    const sales30d = await getSales30d(target)
    const conversion = await getConversionFreeToPaid()

    // Competitor hint via aiService (non-blocking)
    let competitorHint = ''
    try {
        const res = await generateContent('pricing_hint', { product: what, currentPrice })
        competitorHint = res?.content?.slice(0, 200) || ''
    } catch { /* optional */ }

    const minPrice = Math.ceil((costPerUnit * (1 + YOOKASSA_FEE + TAX_NPD)) * 1.3)
    const optimalPrice = Math.max(minPrice, Math.round(currentPrice * 1.1))
    const maxPrice = Math.round(optimalPrice * 1.5)

    return {
        what,
        currentPrice,
        costPerUnit: Math.round(costPerUnit),
        commissionYookassa: Math.round(fee),
        taxNpd: Math.round(tax),
        totalCost: Math.round(totalCost),
        marginNow,
        sales30d,
        conversionFreeToPaid: conversion,
        competitorHint,
        recommendation: { min: minPrice, optimal: optimalPrice, max: maxPrice },
    }
}

export async function marginAfter(what, newPrice) {
    const analysis = await analyzePricing(what)
    const fee = newPrice * YOOKASSA_FEE
    const tax = newPrice * TAX_NPD
    const totalCost = analysis.costPerUnit + fee + tax
    const margin = newPrice > 0 ? Math.round(((newPrice - totalCost) / newPrice) * 100) : 0
    return { ...analysis, newPrice, marginAfter: margin }
}
