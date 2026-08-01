import mongoose from 'mongoose'
import ScheduledPost from '../models/ScheduledPost.js'
import { Campaign } from '../models/Campaign.js'
import { Integration } from '../models/Integration.js'
import { chatWithAI } from './aiService.js'

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

export default { getHistoricalData, predictViralScore }
