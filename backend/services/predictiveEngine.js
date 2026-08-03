import mongoose from 'mongoose'
import ScheduledPost from '../models/ScheduledPost.js'
import { Campaign } from '../models/Campaign.js'
import { Integration } from '../models/Integration.js'
import Subscription from '../models/Subscription.js'
import User from '../models/User.js'
import { chatWithAI } from './aiService.js'

// [P18] added: predictive engine 2.0 helpers

function daysBetween(a, b) {
  const ms = Math.abs(new Date(b) - new Date(a))
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export async function getHistoricalData(ownerId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [posts, campaigns, integrations] = await Promise.all([
    ScheduledPost.find({ userId: ownerId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
    Campaign.find({ ownerId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
    Integration.find({ ownerId, connected: true }).lean(),
  ])

  const allDates = [
    ...posts.map(p => p.createdAt),
    ...campaigns.map(c => c.createdAt),
  ].filter(Boolean)

  const dataSpanDays = allDates.length > 1 ? daysBetween(Math.min(...allDates), Math.max(...allDates)) : 0

  return {
    posts,
    campaigns,
    integrations,
    dataSpanDays,
    hasEnoughData: dataSpanDays >= 30 || posts.length + campaigns.length >= 30,
  }
}

export async function predictViralScore(ownerId, content) {
  const data = await getHistoricalData(ownerId)

  if (!data.hasEnoughData) {
    return {
      status: 'insufficient_data',
      message: `Для прогнозов нужно минимум 30 дней данных. Сейчас: ${data.dataSpanDays} дней.`,
      action: 'Публикуйте регулярно',
    }
  }

  // Build a compact prompt from historical posts + the new content
  const historySummary = data.posts
    .slice(-20)
    .map(p => `- "${p.title || ''}" (platforms: ${p.platforms?.join(', ') || '—'}, status: ${p.status})`)
    .join('\n')

  const prompt = `Ты — вирусный аналитик OMEGA. Проанализируй исторические публикации и новый пост.

История публикаций (последние 20):
${historySummary || 'нет данных'}

Подключенные платформы: ${data.integrations.map(i => i.provider).join(', ') || 'нет'}

Новый контент:
"""
${content}
"""

Оцени вирусность от 0 до 100. Ответь ТОЛЬКО JSON:
{
  "score": число 0-100,
  "confidence": число 0-100,
  "estimatedViews": "примерный диапазон просмотров",
  "reasoning": "краткое объяснение на русском",
  "suggestions": ["совет 1", "совет 2"]
}`

  try {
    const ai = await chatWithAI(prompt, [], 'ru')
    const aiText = ai.reply || ai.content || ''

    let result
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      result = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')
    } catch {
      result = { score: 50, confidence: 30, estimatedViews: 'не удалось распарсить', reasoning: aiText }
    }

    return {
      status: 'ok',
      score: Math.max(0, Math.min(100, Math.round(result.score || 0))),
      confidence: Math.max(0, Math.min(100, Math.round(result.confidence || 0))),
      estimatedViews: result.estimatedViews || 'N/A',
      reasoning: result.reasoning || '',
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      dataSpanDays: data.dataSpanDays,
    }
  } catch (err) {
    console.error('[predictiveEngine] AI failed:', err.message)
    return {
      status: 'error',
      message: 'AI прогноз временно недоступен',
      error: err.message,
    }
  }
}

// [P18] added: viral score prediction from content + niche
export async function viralScorePrediction(content, niche = 'general') {
  const text = String(content || '').trim()
  const hashtags = (text.match(/#[\wА-Яа-яёЁ]+/g) || []).length
  const emojis = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length
  const words = text.split(/\s+/).filter(Boolean).length
  const hasQuestion = /\?/.test(text) ? 1 : 0
  const hasCTA = /(подпиш|переход|ссылк|скач|куп|закаж|узнай|смотри|читай)/i.test(text) ? 1 : 0

  // Base heuristic 0-100
  let score = 40
  score += Math.min(20, hashtags * 4)
  score += Math.min(15, emojis * 3)
  score += words > 20 && words < 200 ? 10 : 0
  score += hasQuestion * 8
  score += hasCTA * 12
  score = Math.max(0, Math.min(100, Math.round(score)))

  const multiplier = { general: 1, fitness: 1.05, crypto: 1.1, beauty: 1.08, saas: 0.95, education: 0.9 }[niche] || 1
  const adjusted = Math.round(score * multiplier)
  const estimatedReach = Math.round((adjusted / 100) * (5000 + words * 50 + hashtags * 300))

  return {
    score: adjusted,
    confidence: Math.min(95, 50 + Math.round(hashtags * 5 + words * 0.05)),
    estimatedReach,
    niche,
    factors: { hashtags, emojis, words, hasQuestion, hasCTA },
  }
}

// [P18] added: 14-day churn risk based on activity
export async function churnPrediction14(userId) {
  const uid = new mongoose.Types.ObjectId(userId)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const [user, posts, campaigns, subs] = await Promise.all([
    User.findById(uid).lean(),
    ScheduledPost.countDocuments({ userId: uid, createdAt: { $gte: fourteenDaysAgo } }),
    Campaign.countDocuments({ ownerId: uid, createdAt: { $gte: fourteenDaysAgo } }),
    Subscription.findOne({ userId: uid }).sort({ createdAt: -1 }).lean(),
  ])

  if (!user) return { score: 0, riskLevel: 'unknown', reasons: ['User not found'] }

  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null
  const daysSinceLogin = lastLogin ? Math.floor((Date.now() - lastLogin) / (86400000)) : 999
  const activityScore = Math.min(50, (posts + campaigns) * 5)
  const loginScore = daysSinceLogin > 14 ? 0 : daysSinceLogin > 7 ? 15 : 35

  let score = 60 - activityScore - loginScore
  if (subs?.status === 'canceled') score += 25
  score = Math.max(0, Math.min(100, Math.round(score)))

  let riskLevel = 'low'
  if (score >= 70) riskLevel = 'high'
  else if (score >= 40) riskLevel = 'medium'

  return {
    score,
    riskLevel,
    daysSinceLogin,
    recentPosts: posts,
    recentCampaigns: campaigns,
    reasons: [
      daysSinceLogin > 7 && 'Нет входа более 7 дней',
      posts === 0 && 'Нет публикаций за 14 дней',
      campaigns === 0 && 'Нет кампаний за 14 дней',
      subs?.status === 'canceled' && 'Подписка отменена',
    ].filter(Boolean),
    recommendations: [
      'Отправить персональное re-engagement письмо',
      'Предложить персональную скидку -20%',
      'Показать чек-лист по первым шагам',
    ],
  }
}

// [P18] added: best posting time per client/platform from history
export async function bestTimePerClient(userId, platform) {
  const uid = new mongoose.Types.ObjectId(userId)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const query = { userId: uid, createdAt: { $gte: thirtyDaysAgo } }
  if (platform && platform !== 'all') query.platforms = platform

  const posts = await ScheduledPost.find(query).lean()
  if (!posts.length) {
    return {
      bestHour: 18,
      bestDay: 'Tuesday',
      confidence: 30,
      reasoning: 'Недостаточно исторических данных, используем глобальное среднее',
    }
  }

  const hours = posts.map(p => new Date(p.scheduledAt || p.createdAt).getHours())
  const days = posts.map(p => new Date(p.scheduledAt || p.createdAt).getDay())
  const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)
  const avgDayIndex = Math.round(days.reduce((a, b) => a + b, 0) / days.length)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return {
    bestHour: avgHour,
    bestDay: dayNames[avgDayIndex] || 'Tuesday',
    confidence: Math.min(95, 30 + posts.length * 3),
    postCount: posts.length,
    reasoning: `Расчёт на основе ${posts.length} публикаций на ${platform || 'всех платформах'}`,
  }
}

// [P18] added: MRR revenue forecast
export async function revenueForecast(days = 90) {
  const active = await Subscription.find({ status: { $in: ['active', 'trialing'] } }).lean()
  const dailyMRR = active.reduce((sum, s) => sum + (s.price || 0), 0)
  const forecast = []
  let cumulative = dailyMRR
  for (let i = 1; i <= days; i++) {
    const growth = 1 + (i * 0.0015)
    cumulative = Math.round(cumulative * growth)
    forecast.push({ day: i, projectedRevenue: cumulative })
  }

  return {
    currentMRR: dailyMRR,
    projectedTotal: forecast.reduce((a, b) => a + b.projectedRevenue, 0),
    averageDailyGrowth: 0.15,
    days,
    forecast,
  }
}

// [P18] added: auto-budget allocation with predicted ROI
export async function autoBudgeting(freeBudget, platform = 'all') {
  const budget = Number(freeBudget) || 0
  if (budget <= 0) return { budget, allocations: [] }

  const channels = platform === 'all'
    ? [
        { name: 'Instagram', roi: 1.4 },
        { name: 'TikTok', roi: 1.8 },
        { name: 'YouTube', roi: 1.2 },
        { name: 'Telegram', roi: 1.6 },
        { name: 'VK', roi: 1.1 },
      ]
    : [{ name: platform, roi: 1.5 }]

  const totalRoi = channels.reduce((sum, c) => sum + c.roi, 0)
  const allocations = channels.map((c) => ({
    channel: c.name,
    amount: Math.round((c.roi / totalRoi) * budget),
    predictedRoi: Math.round(c.roi * 100 - 100),
    estimatedReturn: Math.round(c.roi * ((c.roi / totalRoi) * budget)),
  }))

  return { budget, platform, allocations, totalEstimatedReturn: allocations.reduce((a, b) => a + b.estimatedReturn, 0) }
}

export default { getHistoricalData, predictViralScore, viralScorePrediction, churnPrediction14, bestTimePerClient, revenueForecast, autoBudgeting }
