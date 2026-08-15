// [P2.1] FAQ/база знаний: сиды, поиск ответа по ключевым словам, owner-редактирование из TG.
import FaqArticle from '../models/FaqArticle.js'

const SEED = [
  {
    question: 'Как подключить YouTube-канал?',
    answer: 'Кабинет → Настройки → YouTube → «Подключить». Откроется окно Google — выберите канал и разрешите доступ. После этого видео из Планировщика публикуются автоматически. Если кнопка не работает — напишите нам, проверим.',
    keywords: ['подключить', 'youtube', 'ютуб', 'канал', 'привязать'],
  },
  {
    question: 'Где мой чек об оплате?',
    answer: 'Чек приходит на email сразу после оплаты (отправитель — платёжный сервис). Проверьте папку «Спам». История платежей и повторная отправка чека — Кабинет → Настройки → Платежи.',
    keywords: ['чек', 'квитанция', 'платёж', 'оплата', 'receipt'],
  },
  {
    question: 'Как сменить тариф?',
    answer: 'Кабинет → Настройки → Подписка → выберите тариф и нажмите «Оплатить». Новый тариф действует сразу после оплаты, лимиты обновляются автоматически.',
    keywords: ['тариф', 'сменить', 'подписка', 'апгрейд', 'pro', 'agency'],
  },
  {
    question: 'Какие лимиты на бесплатном тарифе?',
    answer: 'Free: 20 генераций в день, 2 YouTube-загрузки в день, 1 канал, 10 постов в планировщике. Актуальные лимиты всегда — в Настройки → Подписка или командой «Тарифы» здесь.',
    keywords: ['лимит', 'лимиты', 'бесплатн', 'free', 'ограничени', 'квота'],
  },
  {
    question: 'Как вернуть деньги?',
    answer: 'Напишите нам здесь или в кабинете (Поддержка) с email оплаты — владелец рассматривает возвраты вручную, обычно в течение 1–2 дней. Запрос записывается автоматически — повторять не придётся.',
    keywords: ['возврат', 'вернуть', 'деньги', 'refund', 'отменить оплату'],
  },
  {
    question: 'Как подключить Telegram-уведомления?',
    answer: 'Кабинет → Настройки → Профиль → «Подключить Telegram» — откроется этот бот со ссылкой привязки. Нажмите Start — аккаунт свяжется, и уведомления будут приходить сюда.',
    keywords: ['telegram', 'телеграм', 'уведомления', 'привязать', 'бот'],
  },
  {
    question: 'Почему видео не опубликовалось?',
    answer: 'Частые причины: истёк доступ YouTube (переподключите канал в Настройках), дневная квота загрузок исчерпана (обнуляется в 10:00 МСК), ошибка в файле. Точная причина видна в Планировщике у failed-поста; кнопка «Повторить» ставит его снова в очередь.',
    keywords: ['не опубликовалось', 'не публикуется', 'ошибка публикации', 'failed', 'видео не вышло'],
  },
  {
    question: 'Как работает Планировщик?',
    answer: 'Планировщик → «Новый пост»: добавьте видео/текст, выберите дату и канал — публикация пройдёт автоматически. Посты можно перетаскивать по календарю, дублировать и приостанавливать.',
    keywords: ['планировщик', 'календарь', 'запланировать', 'пост', 'отложенный'],
  },
  {
    question: 'Что умеет OMEGA?',
    answer: 'Генерирует сценарии, хуки, обложки и контент-планы, анализирует нишу, помогает с публикациями и отвечает на вопросы здесь. Попробуйте: «придумай 3 хука для кофейни».',
    keywords: ['omega', 'омега', 'умеешь', 'возможности', 'что ты'],
  },
  {
    question: 'Как удалить аккаунт?',
    answer: 'Кабинет → Настройки → Безопасность → «Удалить аккаунт» (экспорт данных доступен там же). Если что-то пошло не так — напишите, постараемся всё исправить до удаления.',
    keywords: ['удалить', 'аккаунт', 'профиль', 'gdpr', 'стереть'],
  },
  {
    question: 'Сколько стоит Pro?',
    answer: 'Pro — 990₽/мес (основателям 693₽), Agency — 4990₽/мес (основателям 3493₽). Годовая оплата — со скидкой 20%. Актуальные цены: кнопка «💎 Тарифы» или лендинг.',
    keywords: ['цена', 'стоит', 'сколько', 'pro', 'цены', 'стоимость'],
  },
  {
    question: 'Не приходят уведомления в Telegram',
    answer: 'Проверьте: Настройки → Профиль → Telegram подключён (зелёный статус), уведомления включены в Настройки → Уведомления. Если всё включено — отвяжите и привяжите заново, обычно помогает.',
    keywords: ['не приходят', 'уведомления', 'не работает бот', 'нет сообщений'],
  },
]

const CACHE_TTL_MS = 60 * 1000
let cache = { articles: null, at: 0 }

async function getArticles() {
  if (cache.articles && Date.now() - cache.at < CACHE_TTL_MS) return cache.articles
  const count = await FaqArticle.countDocuments()
  if (count === 0) await FaqArticle.insertMany(SEED)
  cache = { articles: await FaqArticle.find({ active: true }).lean(), at: Date.now() }
  return cache.articles
}

export function invalidateFaqCache() {
  cache = { articles: null, at: 0 }
}

const STOP_WORDS = new Set(['и', 'в', 'на', 'с', 'как', 'что', 'где', 'я', 'мне', 'мой', 'моя', 'у', 'не', 'а', 'the', 'a', 'my', 'i', 'to', 'how', 'is'])

function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

// Поиск статьи: доля покрытых ключевых слов вопроса. Возвращает { article, score } или null.
export async function findFaqAnswer(text, minScore = 2) {
  const tokens = tokenize(text)
  if (!tokens.length) return null
  const articles = await getArticles()
  let best = null
  for (const article of articles) {
    let score = 0
    for (const kw of article.keywords) {
      const kwParts = tokenize(kw)
      if (kwParts.some(part => tokens.some(t => t.startsWith(part) || part.startsWith(t)))) score++
    }
    if (score >= minScore && (!best || score > best.score)) best = { article, score }
  }
  return best
}

// Кандидаты для контекста AI (top-N по совпадению, любой score>0)
export async function findFaqCandidates(text, limit = 3) {
  const tokens = tokenize(text)
  if (!tokens.length) return []
  const articles = await getArticles()
  return articles
    .map(article => {
      let score = 0
      for (const kw of article.keywords) {
        const kwParts = tokenize(kw)
        if (kwParts.some(part => tokens.some(t => t.startsWith(part) || part.startsWith(t)))) score++
      }
      return { article, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.article)
}

// Owner: «добавь в FAQ: вопрос | ответ | ключ1,ключ2» (keywords опциональны)
export async function addFaqFromOwner(raw) {
  const parts = String(raw || '').split('|').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return { ok: false, error: 'format' }
  const [question, answer] = parts
  const keywords = parts[2]
    ? parts[2].split(',').map(s => s.trim()).filter(Boolean)
    : tokenize(question).slice(0, 6)
  const doc = await FaqArticle.create({ question, answer, keywords, createdBy: 'owner' })
  invalidateFaqCache()
  return { ok: true, article: doc }
}

export async function listFaq(limit = 30) {
  return getArticles().then(a => a.slice(0, limit))
}

export { SEED as FAQ_SEED }
