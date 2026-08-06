import { chatWithAI } from './aiService.js'

const FORMATS = {
  shorts: { label: 'YouTube Shorts', maxLength: 60, aspect: '9:16', tone: 'fast, hook-first' },
  reels: { label: 'Instagram Reels', maxLength: 90, aspect: '9:16', tone: 'visual, trendy' },
  tiktok: { label: 'TikTok', maxLength: 90, aspect: '9:16', tone: 'raw, authentic, trend-aware' },
  telegram: { label: 'Telegram Post', maxLength: 2000, aspect: 'text', tone: 'informative, link-friendly' },
  twitter: { label: 'Twitter/X Thread', maxLength: 280, aspect: 'text', tone: 'concise, punchy' },
  blog: { label: 'Blog Article', maxLength: 2000, aspect: 'long-form', tone: 'SEO-optimized, structured' },
  carousel: { label: 'Instagram Carousel', maxLength: 150, aspect: '1:1', tone: 'slide-friendly, educational' },
  email: { label: 'Email Newsletter', maxLength: 1500, aspect: 'long-form', tone: 'personal, conversion-focused' },
  push: { label: 'Push Notification', maxLength: 60, aspect: 'text', tone: 'urgent, actionable' },
  story: { label: 'Stories', maxLength: 15, aspect: '9:16', tone: 'casual, interactive' },
}

function buildPrompt(format, content, context = {}) {
  const meta = FORMATS[format]
  const { niche = 'контент', language = 'ru', tone = meta.tone } = context
  return `Адаптируй контент для формата "${meta.label}".
Ниша: ${niche}
Язык: ${language}
Тон: ${tone}
Ограничение: макс. ${meta.maxLength} слов/секунд, соотношение ${meta.aspect}.

Исходный контент:
${content}

Верни ТОЛЬКО результат адаптации без лишних комментариев.`
}

export async function repurpose(content, selectedFormats, context = {}) {
  if (!content || !Array.isArray(selectedFormats) || selectedFormats.length === 0) {
    throw new Error('content and selectedFormats are required')
  }

  const results = {}
  for (const format of selectedFormats) {
    if (!FORMATS[format]) {
      results[format] = { error: `Unknown format: ${format}` }
      continue
    }
    try {
      const prompt = buildPrompt(format, content, context)
      const response = await chatWithAI(prompt, [], {
        userRole: context.userRole || 'creator',
        userId: context.userId,
      })
      results[format] = {
        text: response.text || response,
        meta: FORMATS[format],
      }
    } catch (err) {
      console.error(`[repurposingEngine] ${format} failed:`, err.message)
      results[format] = { error: err.message }
    }
  }

  return results
}

export function listFormats() {
  return Object.entries(FORMATS).map(([id, meta]) => ({ id, ...meta }))
}

export default { repurpose, listFormats }
