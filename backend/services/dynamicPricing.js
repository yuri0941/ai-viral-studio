import User from '../models/User.js'
import Subscription from '../models/Subscription.js'
import { AIProviderSetting } from '../models/index.js'

// [P18] added: Dynamic Pricing AI (demand/supply/personal discount)

const ONE_HOUR = 60 * 60 * 1000
const ONE_DAY = 24 * ONE_HOUR

export async function calculateDemandMultiplier() {
  try {
    const hourAgo = new Date(Date.now() - ONE_HOUR)
    const activeUsers = await User.countDocuments({
      $or: [{ updatedAt: { $gte: hourAgo } }, { lastLogin: { $gte: hourAgo } }],
    })
    const newSubs = await Subscription.countDocuments({ createdAt: { $gte: hourAgo } })

    // Base 1.0, grows up to 1.25 when demand is high
    const score = activeUsers + newSubs * 5
    const multiplier = 1 + Math.min(0.25, score / 1000)
    return { multiplier, activeUsers, newSubs }
  } catch (err) {
    console.error('[dynamicPricing:demand]', err.message)
    return { multiplier: 1, activeUsers: 0, newSubs: 0 }
  }
}

export async function calculateSupplyMultiplier() {
  try {
    const settings = await AIProviderSetting.find({}).lean()
    if (!settings.length) return { multiplier: 1, avgLatency: 0, reason: 'no data' }

    const avgLatency = settings.reduce((sum, s) => sum + (s.avgLatencyMs || 0), 0) / settings.length
    // Higher latency = higher price (up to +15%)
    const multiplier = 1 + Math.min(0.15, Math.max(0, (avgLatency - 500) / 10000))
    return { multiplier, avgLatency, reason: avgLatency > 1000 ? 'high latency' : 'normal' }
  } catch (err) {
    console.error('[dynamicPricing:supply]', err.message)
    return { multiplier: 1, avgLatency: 0, reason: 'error' }
  }
}

export async function applyPersonalDiscount(userId) {
  try {
    if (!userId) return { multiplier: 1, reason: null }
    const user = await User.findById(userId).lean()
    if (!user) return { multiplier: 1, reason: null }

    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null
    const daysSinceLogin = lastLogin ? Math.floor((Date.now() - lastLogin) / ONE_DAY) : 999

    if (daysSinceLogin >= 7) return { multiplier: 0.8, reason: 'personal-20' }
    if (daysSinceLogin >= 3) return { multiplier: 0.95, reason: 'personal-5' }
    return { multiplier: 1, reason: null }
  } catch (err) {
    console.error('[dynamicPricing:personal]', err.message)
    return { multiplier: 1, reason: null }
  }
}

export async function adjustPrice(basePrice, plan, userId) {
  if (plan === 'free' || basePrice <= 0) return { finalPrice: 0, multipliers: [] }

  const [demand, supply, personal] = await Promise.all([
    calculateDemandMultiplier(),
    calculateSupplyMultiplier(),
    applyPersonalDiscount(userId),
  ])

  const finalPrice = Math.max(0, Math.round(basePrice * demand.multiplier * supply.multiplier * personal.multiplier))
  return {
    finalPrice,
    basePrice,
    plan,
    multipliers: {
      demand: demand.multiplier,
      supply: supply.multiplier,
      personal: personal.multiplier,
    },
    reasons: [
      demand.multiplier > 1.05 && 'high-demand',
      supply.multiplier > 1.05 && 'high-supply-cost',
      personal.reason,
    ].filter(Boolean),
  }
}

export async function getDynamicPricingStatus(userId) {
  const [demand, supply, personal] = await Promise.all([
    calculateDemandMultiplier(),
    calculateSupplyMultiplier(),
    applyPersonalDiscount(userId),
  ])

  let badge = null
  if (personal.reason === 'personal-20') badge = { type: 'discount', text: '💎 Персональная скидка -20%', color: 'text-emerald-400' }
  else if (demand.multiplier >= 1.1) badge = { type: 'demand', text: '🔥 Высокий спрос — цена +10%', color: 'text-amber-400' }
  else if (supply.multiplier >= 1.1) badge = { type: 'supply', text: '⚡ AI-провайдеры загружены', color: 'text-orange-400' }

  return {
    demand,
    supply,
    personal,
    badge,
  }
}

export default { calculateDemandMultiplier, calculateSupplyMultiplier, applyPersonalDiscount, adjustPrice, getDynamicPricingStatus }
