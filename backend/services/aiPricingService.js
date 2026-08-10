import Addon from '../models/Addon.js'
import { chatWithAI, extractText } from './aiService.js'

const MARKET_FALLBACK = {
    'AI Дизайнер': { competitors: [299, 490, 990], avg: 590 },
    'AI Видео': { competitors: [990, 1990, 2990], avg: 1650 },
    'Дополнительные агенты': { competitors: [390, 590, 790], avg: 590 },
    'Аналитика Pro': { competitors: [490, 990, 1490], avg: 990 },
    'Интеграции Pro': { competitors: [290, 490, 790], avg: 520 },
    'White-Label': { competitors: [1990, 4990, 9990], avg: 5660 },
}

function fallbackAnalysis(addon) {
    const market = MARKET_FALLBACK[addon.name] || { competitors: [addon.price], avg: addon.price }
    const recommended = Math.round(market.avg * 0.95)
    return {
        recommendedPrice: recommended,
        recommendedCurrency: addon.currency || 'RUB',
        confidence: 72,
        reasoning: `Рыночная средняя цена для «${addon.name}» — ${market.avg} ${addon.currency || 'RUB'}. Рекомендуется установить цену на 5% ниже среднего для конкурентного преимущества.`,
        competitorPrices: market.competitors.map(p => ({ price: p, currency: addon.currency || 'RUB' })),
    }
}

export async function analyzeAddonMarket(addon, userRole = 'owner') {
    if (!['owner', 'admin', 'staff'].includes(userRole)) {
        return fallbackAnalysis(addon)
    }

    try {
        const prompt = `Проанализируй рынок аддона "${addon.name}" в нише SMM/AI-контент.
Описание: ${addon.description}.
Текущая цена: ${addon.price} ${addon.currency}.
Конкуренты: Canva Pro $12.99/мес, Midjourney ~$10/мес, Pictory $19/мес, Buffer $15/мес, Hootsuite $99/мес.
Рекомендуй оптимальную цену в ${addon.currency}, оцени уверенность 0-100 и кратко обоснуй. Верни JSON: { recommendedPrice: number, confidence: number, reasoning: string, competitorPrices: [{price, currency}] }.`

        const res = await chatWithAI(prompt, [], 'ru', userRole)
        const text = extractText(res)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
                recommendedPrice: Number(parsed.recommendedPrice) || addon.price,
                recommendedCurrency: parsed.recommendedCurrency || addon.currency || 'RUB',
                confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 70)),
                reasoning: parsed.reasoning || fallbackAnalysis(addon).reasoning,
                competitorPrices: Array.isArray(parsed.competitorPrices) ? parsed.competitorPrices : fallbackAnalysis(addon).competitorPrices,
            }
        }
        return fallbackAnalysis(addon)
    } catch (err) {
        console.error('[aiPricingService] analyze failed:', err.message)
        return fallbackAnalysis(addon)
    }
}

export async function generatePricingReport() {
    const addons = await Addon.find({ isActive: true }).lean()
    return addons.map(addon => {
        const ai = addon.ownerPriceConfig?.aiRecommendedPrice
        const current = addon.price
        return {
            id: addon.id,
            name: addon.name,
            currentPrice: current,
            recommendedPrice: ai || current,
            potentialRevenue: ai ? Math.round(ai * 100) : Math.round(current * 100),
            currency: addon.currency,
        }
    })
}
