import ScheduledPost from '../models/ScheduledPost.js'
import { chatWithAI, extractText } from './aiService.js'
import { ApiKey } from '../models/index.js'

async function hasAIProvider() {
  try {
    const keys = await ApiKey.find({ isActive: true }).lean()
    if (keys.length > 0) return true
    // Also check env keys
    const envKeys = ['GROQ_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY']
    return envKeys.some(k => !!process.env[k])
  } catch {
    return false
  }
}

export async function repurposeContent(ownerId, sourceId, options = {}) {
  const hasAI = await hasAIProvider()
  if (!hasAI) {
    return {
      status: 'error',
      message: 'Подключите AI-провайдера для репурпозинга',
    }
  }

  const source = await ScheduledPost.findOne({ _id: sourceId, userId: ownerId }).lean()
  if (!source) {
    return { status: 'error', message: 'Исходный пост не найден' }
  }

  const formats = options.formats || ['reels', 'shorts', 'stories', 'twitter-thread', 'carousel', 'telegram']
  const results = []

  for (const format of formats) {
    const prompt = `Ты — OMEGA Content Repurposer. Возьми исходный контент и адаптируй его в формат "${format}".

Исходный контент:
"""
Заголовок: ${source.title || ''}
Текст: ${source.content || ''}
"""

Создай краткий план/текст для формата "${format}". Ответь ТОЛЬКО JSON:
{
  "title": "заголовок",
  "content": "текст контента",
  "hashtags": ["#тег1", "#тег2"],
  "callToAction": "призыв к действию"
}`

    try {
      const ai = await chatWithAI(prompt, [], 'ru')
      let parsed
      try {
        parsed = JSON.parse(extractText(ai) || '{}')
      } catch {
        parsed = { title: `${format} — ${source.title}`, content: extractText(ai) }
      }

      results.push({
        format,
        title: parsed.title || `${format} — ${source.title}`,
        content: parsed.content || '',
        hashtags: parsed.hashtags || [],
        callToAction: parsed.callToAction || '',
      })
    } catch (err) {
      results.push({
        format,
        title: `${format} — ${source.title}`,
        content: '',
        error: err.message,
      })
    }
  }

  // Optionally schedule the generated variants
  if (options.schedule === true) {
    const scheduledAt = options.scheduledAt || new Date(Date.now() + 60 * 60 * 1000)
    const created = []
    for (const r of results) {
      if (!r.content && !r.title) continue
      const post = await ScheduledPost.create({
        userId: ownerId,
        title: r.title,
        content: r.content,
        platforms: [formatToPlatform(r.format)],
        scheduledAt,
        status: 'scheduled',
      })
      created.push(post)
    }
    return { status: 'ok', formats, results, scheduled: created }
  }

  return { status: 'ok', formats, results }
}

function formatToPlatform(format) {
  const map = {
    reels: 'instagram',
    shorts: 'youtube',
    stories: 'instagram',
    gif: 'telegram',
    'twitter-thread': 'twitter',
    carousel: 'instagram',
    'telegram-post': 'telegram',
  }
  return map[format] || 'telegram'
}

export default { repurposeContent }
