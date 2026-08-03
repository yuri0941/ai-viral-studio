import { chatWithAI } from './aiService.js'

// [P18] added: Neuro-Sales psychotype detection and content generation

const PSYCHOTYPE_WEIGHTS = {
  logic: {
    keywords: ['цена', 'стоимость', 'выгода', 'экономия', 'сравнение', 'факты', 'данные', 'цифры', 'proof', 'guarantee'],
    cta: 'Узнайте точные расчёты и сравните выгоду',
    tone: 'логичный, фактологический',
  },
  emotion: {
    keywords: ['люблю', 'обожаю', 'эмоции', 'вдохновение', 'счастье', 'мечта', ' feelings', 'wow', 'amazing'],
    cta: 'Почувствуйте результат уже сегодня',
    tone: 'эмоциональный, вовлекающий',
  },
  deficit: {
    keywords: ['осталось', 'успеть', 'последний', 'скидка', 'deadline', 'только сегодня', 'fomo', 'urgent'],
    cta: 'Заберите свой бонус до окончания таймера',
    tone: 'дефицитный, срочный',
  },
  social: {
    keywords: ['отзывы', 'рекомендации', 'друзья', 'команда', 'кейсы', 'клиенты', 'proof', 'trusted', 'community'],
    cta: 'Присоединяйтесь к тысячам довольных клиентов',
    tone: 'социальное доказательство',
  },
}

function scorePsychotype(text) {
  const lower = String(text).toLowerCase()
  const scores = {}
  for (const [type, cfg] of Object.entries(PSYCHOTYPE_WEIGHTS)) {
    scores[type] = cfg.keywords.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0)
  }
  return scores
}

export async function detectPsychotype(chatHistory) {
  const text = Array.isArray(chatHistory)
    ? chatHistory.map(m => m.text || m.content || '').join(' ')
    : String(chatHistory || '')

  const scores = scorePsychotype(text)
  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  const psychotype = dominant && dominant[1] > 0 ? dominant[0] : 'logic'
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1
  const confidence = Math.min(95, Math.round((dominant?.[1] || 0) / total * 100) + 30)

  // Optional AI refinement
  let aiNote = ''
  try {
    const prompt = `Определи психотип аудитории по тексту: "${text.slice(0, 800)}". Выбери один из: logic, emotion, deficit, social. Кратко объясни почему. Верни JSON { "psychotype", "reasoning" }.`
    const ai = await chatWithAI(prompt, [], 'ru')
    const match = (ai.reply || '').match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    if (parsed.psychotype && PSYCHOTYPE_WEIGHTS[parsed.psychotype]) {
      aiNote = parsed.reasoning || ''
    }
  } catch (err) {
    // ignore AI failures, keep heuristic result
  }

  return {
    psychotype,
    confidence,
    scores,
    reasoning: aiNote || `Преобладают сигналы типа «${PSYCHOTYPE_WEIGHTS[psychotype].tone}»`,
  }
}

export async function generateSalesContent(psychotype, product, goal) {
  const type = PSYCHOTYPE_WEIGHTS[psychotype] ? psychotype : 'logic'
  const cfg = PSYCHOTYPE_WEIGHTS[type]

  try {
    const prompt = `Напиши продающий текст для продукта "${product}" с целью "${goal}" для аудитории с психотипом "${type}". Верни JSON { "headline", "body", "cta" }.`
    const ai = await chatWithAI(prompt, [], 'ru')
    const match = (ai.reply || '').match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return {
      psychotype: type,
      product,
      goal,
      headline: parsed.headline || `Решение для ${product}`,
      body: parsed.body || `Предлагаем ${product}, адаптированный под ваш запрос.`,
      cta: parsed.cta || cfg.cta,
    }
  } catch (err) {
    return {
      psychotype: type,
      product,
      goal,
      headline: `Решение для ${product}`,
      body: `Предлагаем ${product}, адаптированный под ваш запрос.`,
      cta: cfg.cta,
    }
  }
}

export default { detectPsychotype, generateSalesContent }
