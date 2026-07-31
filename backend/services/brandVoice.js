import { chatWithAI } from './aiService.js'

const MAX_EXAMPLES = 10

function detectTone(texts) {
  const combined = texts.join(' ').toLowerCase()
  const formalMarkers = ['уважаемый', 'коллеги', 'просим', 'согласно', 'заявка', 'официально', 'благодарим', 'please', 'regards', 'dear', 'sincerely', 'official']
  const friendlyMarkers = ['привет', 'друзья', 'круто', 'спасибо', 'рад', 'давайте', 'рекомендую', 'hello', 'hey', 'guys', 'awesome', 'love', 'enjoy']
  const aggressiveMarkers = ['срочно', 'хватит', 'никогда', 'провал', 'катастрофа', 'ужасно', 'stop', 'now', 'never', 'disaster', 'terrible', 'must']

  const formal = formalMarkers.reduce((sum, m) => sum + (combined.includes(m) ? 1 : 0), 0)
  const friendly = friendlyMarkers.reduce((sum, m) => sum + (combined.includes(m) ? 1 : 0), 0)
  const aggressive = aggressiveMarkers.reduce((sum, m) => sum + (combined.includes(m) ? 1 : 0), 0)

  if (aggressive >= formal && aggressive >= friendly) return 'агрессивный / provocative'
  if (formal >= friendly) return 'формальный / professional'
  return 'дружелюбный / casual'
}

function extractKeywords(texts) {
  const combined = texts.join(' ').toLowerCase()
  // Simple word frequency, excluding common stop words
  const stopWords = new Set([
    'и', 'в', 'на', 'с', 'по', 'для', 'а', 'не', 'как', 'то', 'все', 'из', 'за', 'от', 'до', 'это', 'что', 'он', 'она', 'мы', 'вы', 'они',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'it', 'this', 'that'
  ])
  const words = combined.match(/[a-zа-яё0-9]+/g) || []
  const counts = {}
  for (const word of words) {
    if (word.length < 3 || stopWords.has(word)) continue
    counts[word] = (counts[word] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word)
}

function analyzeSentenceLength(texts) {
  const allSentences = texts.flatMap(t => t.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean))
  if (!allSentences.length) return 'mixed'
  const avgLen = allSentences.reduce((sum, s) => sum + s.length, 0) / allSentences.length
  if (avgLen < 50) return 'short'
  if (avgLen < 120) return 'medium'
  return 'long'
}

function detectEmojiStyle(texts) {
  const combined = texts.join('')
  const emojiCount = (combined.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length
  if (emojiCount === 0) return 'none'
  if (emojiCount < texts.length * 0.5) return 'moderate'
  return 'heavy'
}

export function analyzeBrandVoice(texts) {
  const clean = texts
    .filter(Boolean)
    .map(t => t.trim())
    .slice(0, MAX_EXAMPLES)
  if (!clean.length) return null

  return {
    tone: detectTone(clean),
    keywords: extractKeywords(clean),
    sentenceLength: analyzeSentenceLength(clean),
    emojiStyle: detectEmojiStyle(clean),
    examples: clean.slice(0, 5),
  }
}

export function buildBrandVoicePrompt(brandVoice) {
  if (!brandVoice) return ''
  return `Пиши в стиле: ${brandVoice.tone}. Используй ключевые слова: ${brandVoice.keywords.join(', ')}. Длина предложений: ${brandVoice.sentenceLength}. Эмодзи: ${brandVoice.emojiStyle}.`
}

export async function analyzeBrandVoiceWithAI(texts, niche = '') {
  const clean = texts.filter(Boolean).map(t => t.trim()).slice(0, MAX_EXAMPLES)
  if (!clean.length) return null

  const prompt = `Проанализируй стиль текста из ${clean.length} постов${niche ? ` для ниши ${niche}` : ''}. Верни JSON без Markdown:
{
  "tone": "краткое описание тона (например: дружелюбный, формальный, провокационный)",
  "keywords": ["5-8 частых слов"],
  "sentenceLength": "short | medium | long",
  "emojiStyle": "none | moderate | heavy",
  "description": "1-2 предложения о стиле"
}

Тексты:
${clean.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

  try {
    const result = await chatWithAI(prompt, [], 'ru')
    if (!result?.reply) return analyzeBrandVoice(clean)
    let json = null
    try {
      json = JSON.parse(result.reply)
    } catch {
      const match = result.reply.match(/\{[\s\S]*\}/)
      if (match) json = JSON.parse(match[0])
    }
    if (json) {
      return {
        tone: json.tone || detectTone(clean),
        keywords: Array.isArray(json.keywords) ? json.keywords.slice(0, 8) : extractKeywords(clean),
        sentenceLength: json.sentenceLength || analyzeSentenceLength(clean),
        emojiStyle: json.emojiStyle || detectEmojiStyle(clean),
        description: json.description || '',
        examples: clean.slice(0, 5),
      }
    }
  } catch (err) {
    console.error('[brandVoice] AI analysis failed:', err.message)
  }

  return analyzeBrandVoice(clean)
}

export default { analyzeBrandVoice, buildBrandVoicePrompt, analyzeBrandVoiceWithAI }
