import Groq from 'groq-sdk'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { ApiKey, AIProviderSetting } from '../models/index.js'
import { getOwnerScope, getDefaultOwnerId } from '../utils/keyScope.js'
import { emergencyStop } from '../routes/admin.js'
import { searchVectorMemory, addToVectorMemory } from './vectorStore.js'
import LocalBrain from '../ai/omega/localBrain.js'

// ============ HELPERS ============
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))



// [HOTFIX-2026-08-08] Groq fallback chain + smaller models to avoid TPD rate limits
// [v9.6.2-TELEGRAM-OWNER] removed llama-3.1-70b-versatile (returns 400)
// [v9.9.19.2-UX-HOTFIX-v4] только сильная модель в основном слоте Groq;
// llama-3.1-8b-instant — ПОСЛЕДНИЙ fallback (groq_lite), не деградируем до слабой модели раньше времени
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',  // рабочая — первая
]

// [P24] fixed: auto-detect user query language
function detectLanguage(text) {
    if (/[а-яё]/i.test(text)) return 'ru'
    if (/[a-z]/i.test(text)) return 'en'
    return 'auto'
}

// ============ CACHE ============
const responseCache = new Map()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function hashString(str) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(36)
}

// [v9.9.19.2-UX-HOTFIX-v4] ключ кэша = hash(userId + message + lang) —
// ответ на чужой вопрос/другого пользователя не должен попадать в кэш-хит
function cacheKey(message, lang = 'ru', userId = '') {
    return `${userId || 'anon'}:${lang}:${hashString(message.trim().toLowerCase())}`
}

function getCached(message, lang, userId = '') {
    const key = cacheKey(message, lang, userId)
    const entry = responseCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
        responseCache.delete(key)
        return null
    }
    return entry.value
}

function setCached(message, lang, value, userId = '') {
    const key = cacheKey(message, lang, userId)
    responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ============ SMART FALLBACK TEMPLATES ============
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let TEMPLATES = []
try {
    const raw = fs.readFileSync(path.join(__dirname, '../data/omegaTemplates.json'), 'utf8')
    const parsed = JSON.parse(raw)
    TEMPLATES = Array.isArray(parsed?.templates) ? parsed.templates : []
} catch (err) {
    console.warn('⚠️ Failed to load omegaTemplates.json:', err.message)
    TEMPLATES = []
}

// [P16-HOTFIX-v2] built-in fallback templates ensure OMEGA always replies usefully even without API keys
// [VALUE-2026-08-04] added: niche-specific hook templates so fallback mode still returns real hooks
const NICHE_TEMPLATES = {
    coffee: [
        '«Этот кофе изменил моё утро — и вот почему»',
        '«3 ошибки при заказе кофе, которые делают все»',
        '«Бариста показал секретный рецепт латте»'
    ],
    beauty: [
        '«Я убрала этот продукт из ухода — и кожа преобразилась»',
        '«3 минуты утром = макияж, который держится весь день»',
        '«Что косметологи молчат о домашнем пилинге»'
    ],
    food: [
        '«Этот рецепт занял 10 минут, а семья просит добавки»',
        '«Ошибка при жарке мяса, которую совершают 90%»',
        '«3 ингредиента, которые превращают обед в ресторанный»'
    ],
    it: [
        '«3 инструмента, которые экономят мне 2 часа в день»',
        '«Почему ваш сайт не продаёт (и как починить за 1 час)»',
        '«Я потратил $0 на рекламу и получил 1000 заявок»'
    ],
    fitness: [
        '«5 упражнений для пресса, которые реально работают»',
        '«Почему cardio не помогает похудеть»',
        '«Что есть до и после тренировки»'
    ],
    travel: [
        '«Город, где отдых стоит в 3 раза дешевле Турции»',
        '«5 вещей, которые я никогда не беру в самолёт»',
        '«Секретные места [города], о которых не пишут путеводители»'
    ],
    auto: [
        '«3 вещи, которые убивают аккумулятор зимой»',
        '«Как снизить расход топлива на 15% без вложений»',
        '«Обман на СТО: чек-лист, который сэкономит 20 000₽»'
    ],
    realestate: [
        '«3 ошибки при покупке квартиры, которые стоят миллионы»',
        '«Как сдать квартиру в 2 раза быстрее рынка»',
        '«Районы, где цены ещё не взлетели»'
    ],
    education: [
        '«Как выучить язык за 3 месяца вместо 3 лет»',
        '«5 бесплатных курсов, которые меняют карьеру»',
        '«Ошибка в обучении детей, которую допускают родители»'
    ],
    fashion: [
        '«3 вещи, которые дешево выглядят дорого»',
        '«Как собрать капсульный гардероб за выходные»',
        '«Тренд, который носят все инфлюенсеры этой осенью»'
    ],
    pets: [
        '«3 вещи, которые вредят здоровью вашего питомца»',
        '«Как я приучил собаку к команде за 1 день»',
        '«Ветеринары молчат об этих кормах»'
    ],
    kids: [
        '«3 игры, которые развивают ребёнка без телефона»',
        '«Что делать, если ребёнок не слушается с первого раза»',
        '«Лайфхаки для родителей, о которых вы не знали»'
    ],
    finance: [
        '«3 ошибки в управлении деньгами, которые делают все»',
        '«Как я накопил на отпуск, не отказываясь от кофе»',
        '«Финансовый совет, который изменил мою жизнь»'
    ],
    music: [
        '«3 упражнения, чтобы научиться петь за 30 дней»',
        '«Почему ваша песня не набирает прослушивания»',
        '«Секреты звукозаписи, которые используют профи»'
    ],
    art: [
        '«3 техники рисования, которые освоит каждый»',
        '«Как продать свою первую картину онлайн»',
        '«Ошибки начинающих художников и как их избежать»'
    ]
}

const NICHE_KEYWORDS = {
    coffee: ['кофейн', 'кофе', 'латте', 'капучино', 'эспрессо', 'бариста'],
    beauty: ['бьюти', 'космет', 'кожа', 'макияж', 'уход', 'салон'],
    food: ['ресторан', 'еда', 'рецепт', 'кухня', 'кулинар', 'блюдо'],
    it: ['it', 'айти', 'сайт', 'приложение', 'программ', 'digital'],
    fitness: ['фитнес', 'тренировк', 'спорт', 'похуд', 'пресс', 'зал'],
    travel: ['путешеств', 'тур', 'отдых', 'отпуск', 'город', 'отель'],
    auto: ['авто', 'машин', 'сервис', 'сто', 'шин', 'двигатель'],
    realestate: ['недвижимост', 'квартир', 'аренд', 'жильё', 'дом'],
    education: ['обучен', 'курс', 'школ', 'язык', 'репетитор', 'образован'],
    fashion: ['одежд', 'стиль', 'мода', 'гардероб', 'бренд', 'луки'],
    pets: ['питомец', 'собак', 'кошк', 'животн', 'корм', 'ветеринар'],
    kids: ['дет', 'ребёнок', 'родител', 'малыш', 'школ', 'воспитани'],
    finance: ['финанс', 'деньг', 'инвестиц', 'накоплен', 'бюджет', 'эконом'],
    music: ['музык', 'песн', 'пен', 'гитар', 'звукозапис', 'трек'],
    art: ['рисован', 'художн', 'картин', 'творчеств', 'скетч', 'иллюстрац']
}

const FALLBACK_TEMPLATES = [
    {
        id: 'greeting',
        tags: ['привет', 'здравствуй', 'hello', 'hi', 'ку', 'start'],
        response: 'Привет! Я OMEGA, твой AI-ассистент. Чем помочь?'
    },
    {
        id: 'post',
        tags: ['пост', 'запись', 'контент', 'текст', 'написать', 'создать'],
        response: 'Вот идея для поста:\n\n🎯 Хук: «3 вещи, которые [ваша аудитория] делает не так»\n📝 Основная часть: короткий список с примерами.\n👉 CTA: «Сохраните, чтобы не потерять» или «Напишите в комментариях ваш вариант».\n\nЕсли хотите, могу написать полный текст под вашу нишу.'
    },
    {
        id: 'script',
        tags: ['скрипт', 'видео', ' reels', 'shorts', 'tiktok', 'сценарий'],
        response: 'Сценарий для короткого видео (60 сек):\n\n0:00-0:03 — Хук: «Я ошибался 2 года, пока не узнал это»\n0:03-0:20 — Проблема + личная история.\n0:20-0:45 — 3 конкретных совета.\n0:45-0:55 — Подводка к CTA.\n0:55-1:00 — CTA: «Подпишись, если узнал что-то новое».'
    },
    {
        id: 'analytics',
        tags: ['анализ', 'аналитика', 'статистика', 'ctr', 'просмотры', 'подписчики'],
        response: 'Для точного анализа подключите соцсети в разделе Интеграции. Пока могу дать общие рекомендации:\n\n• CTR обложки: ≥5% — хорошо, <3% — меняйте хук.\n• Удержание 30 сек: ≥50% — ролик «цепляет».\n• Лучшее время публикаций: обычно 18:00–21:00 в будни.'
    },
    {
        id: 'hooks',
        tags: ['хук', 'зацепка', 'внимание', 'первая фраза'],
        response: '5 проверенных хуков:\n\n1. «Я потратил X лет, чтобы понять это…»\n2. «Никогда не делайте так с [тема]»\n3. «3 ошибки, которые убивают ваш [результат]»\n4. «Секрет, о котором молчат эксперты»\n5. «Вот почему ваш [процесс] не работает»'
    },
    {
        id: 'trends',
        tags: ['тренд', 'что вирусится', 'тренды', 'вирусный'],
        response: 'Чтобы отслеживать тренды, используйте раздел Scout. Пока вот универсальный приём: ищите 5–10 топовых видео в вашей нише за последние 7 дней и выделяйте повторяющиеся паттерны — формат, длина, хук, CTA.'
    },
    {
        id: 'generic',
        tags: [],
        response: 'Я готова помочь с контент-стратегией, скриптами, хуками и аналитикой. Опишите задачу подробнее — например, нишу, платформу и цель.'
    }
]

function smartFallbackReply(message, lang = 'ru', userRole = 'guest') {
    const lower = message.toLowerCase()

    // [HOTFIX-2026-08-04] added — short greeting, no monologue
    if (lower.includes('привет') || lower.includes('здравствуй') || lower.includes('hello') || lower.includes('hi')) {
        return {
            text: 'Привет! Я OMEGA. Чем помочь?',
            provider: 'smart-fallback',
            source: 'template'
        }
    }
    // [HOTFIX-2026-08-04] added — capabilities list only on explicit request
    if (lower.includes('что ты умеешь') || lower.includes('what can you do') || lower.includes('возможности')) {
        return {
            text: 'Вот чем я могу помочь: идеи и посты, сценарии Shorts/Reels, аналитика и метрики, тренды и хуки, время публикаций, brand voice, автопилот контента. Спроси по любому пункту.',
            provider: 'smart-fallback',
            source: 'template'
        }
    }

    const allTemplates = [...FALLBACK_TEMPLATES, ...TEMPLATES]
    // Match by tags; prefer templates with more matching tags
    const scored = allTemplates
        .filter(t => Array.isArray(t.tags) && t.tags.length)
        .map(t => {
            const matches = t.tags.filter(tag => lower.includes(tag.toLowerCase())).length
            return { ...t, matches }
        })
        .filter(t => t.matches > 0)
        .sort((a, b) => b.matches - a.matches)

    if (scored.length) {
        return { text: scored[0].response, provider: 'smart-fallback', source: 'template' }
    }

    // [VALUE-2026-08-04] added: niche hook generator — returns real hooks by niche
    const nicheKey = Object.keys(NICHE_KEYWORDS).find(key =>
        NICHE_KEYWORDS[key].some(kw => lower.includes(kw))
    )
    if (nicheKey && NICHE_TEMPLATES[nicheKey]) {
        const hooks = NICHE_TEMPLATES[nicheKey]
        const random = hooks[Math.floor(Math.random() * hooks.length)]
        return {
            text: `Вот 3 хука для вашей ниши:\n\n1. ${hooks[0]}\n2. ${hooks[1]}\n3. ${hooks[2]}\n\nХотите — соберу полноценный пост или сценарий Reels под любой из них.`,
            provider: 'smart-fallback',
            source: 'niche-template'
        }
    }

    return { text: 'Опишите свою нишу подробнее, и я подготовлю идеи!', provider: 'smart-fallback', source: 'template' }
}

const getKey = async (provider, ownerId = null) => {
    return getProviderKey(provider, ownerId)
}

// [P17] added: explicit provider key resolver with owner-scoped DB keys and env fallback
const envMap = {
    groq: 'GROQ_API_KEY',
    openai: 'OPENAI_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    gemini: 'GEMINI_API_KEY',
    github: 'GITHUB_API_KEY',
    huggingface: 'HF_API_KEY',
    cloudflare: 'CLOUDFLARE_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    cohere: 'COHERE_API_KEY',
    replicate: 'REPLICATE_API_TOKEN',
    youtube: 'YOUTUBE_API_KEY',
    together: 'TOGETHER_API_KEY',
    fireworks: 'FIREWORKS_API_KEY',
    cerebras: 'CEREBRAS_API_KEY',
    pollinations: null,
    // [v9.9.19-MASTER-AUDIT] расширенная карта — все ключи проекта через getProviderKey
    elevenlabs: 'ELEVENLABS_API_KEY',
    serpapi: 'SERPAPI_KEY',
    vk: 'VK_CLIENT_ID',
    vk_secret: 'VK_CLIENT_SECRET',
    telegram_bot: 'TELEGRAM_BOT_TOKEN',
    telegram_owner_bot: 'TELEGRAM_OWNER_BOT_TOKEN',
    telegram_chat_id: 'TELEGRAM_OWNER_CHAT_ID',
    yookassa_shop_id: 'YOOKASSA_SHOP_ID',
    yookassa_secret: 'YOOKASSA_SECRET_KEY',
    stripe: 'STRIPE_SECRET_KEY',
    stripe_webhook: 'STRIPE_WEBHOOK_SECRET',
    paypal_client_id: 'PAYPAL_CLIENT_ID',
    paypal_secret: 'PAYPAL_CLIENT_SECRET',
    vapid_public: 'VAPID_PUBLIC_KEY',
    vapid_private: 'VAPID_PRIVATE_KEY',
    resend: 'RESEND_API_KEY',
    smtp_host: 'SMTP_HOST',
    smtp_user: 'SMTP_USER',
    smtp_pass: 'SMTP_PASS',
    chroma: 'CHROMA_API_KEY'
}

// Global in-memory cache for API keys (hot-reload support)
global.apiKeyCache = global.apiKeyCache || {}

// [v9.9.19.3-TG-BOTS-FIX] Универсально достаёт текст из ответа AI любого формата.
// chatWithAI() всегда возвращает объект {success, reply, provider, usage} — НИГДЕ не используем его как строку напрямую.
export function extractText(response) {
    if (!response) return ''
    if (typeof response === 'string') return response
    if (typeof response === 'object') {
        const t = response.reply || response.response || response.content || response.text || response.message
        if (typeof t === 'string') return t
        if (t && typeof t === 'object' && typeof t.content === 'string') return t.content
    }
    return String(response)
}

// [v9.9.19.2-UX-HOTFIX-v4] Приоритет источников ключей:
// 1) MongoDB (Кабинет → API Ключи, включённые) — ГЛАВНЫЙ источник
// 2) process.env — запасной вариант, ТОЛЬКО когда ключа в кабинете нет вообще
// Ключ, существующий в кабинете, но ВЫКЛЮЧЕННЫЙ (isActive=false) = явный запрет владельца:
// env НЕ используем, возвращаем null (сервис показывает «ключ выключен в кабинете»).
const KEY_DISABLED = '__disabled_in_cabinet__'
global.apiKeyMissCache = global.apiKeyMissCache || {}
global.apiKeyEnvLogged = global.apiKeyEnvLogged || new Set()

export async function getProviderKey(providerId, ownerId = null) {
    const cached = global.apiKeyCache[providerId]
    if (cached === KEY_DISABLED) return null
    if (cached) return cached

    // Отрицательный кэш (60 сек): не дёргаем MongoDB на каждый вызов для env-only провайдеров
    const missedAt = global.apiKeyMissCache[providerId] || 0
    if (Date.now() - missedAt >= 60000) {
        try {
            let doc = null
            if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
                doc = await ApiKey.findOne({ ownerId, provider: providerId }).lean()
            }
            if (!doc) doc = await ApiKey.findOne({ provider: providerId }).sort({ updatedAt: -1 }).lean()
            if (doc) {
                if (doc.isActive === false) {
                    global.apiKeyCache[providerId] = KEY_DISABLED
                    console.log(`[KEY] provider=${providerId} source=mongodb status=disabled — ключ выключен в кабинете, env не используется`)
                    return null
                }
                const value = doc.key || doc.keyValue
                if (value) {
                    global.apiKeyCache[providerId] = value
                    console.log(`[KEY] provider=${providerId} source=mongodb`)
                    return value
                }
            }
            global.apiKeyMissCache[providerId] = Date.now()
        } catch (err) {
            console.warn('[getProviderKey] MongoDB lookup failed:', err.message)
        }
    }

    // env — запасной вариант (bootstrap-ключи MONGODB_URI/JWT_SECRET/PORT/FRONTEND_URL сюда не входят)
    const envVar = envMap[providerId]
    if (envVar && process.env[envVar]) {
        if (!global.apiKeyEnvLogged.has(providerId)) {
            global.apiKeyEnvLogged.add(providerId)
            console.log(`[KEY] provider=${providerId} source=env (logged once)`)
        }
        return process.env[envVar]
    }
    return null
}

export async function loadApiKeysToMemory() {
    try {
        // [v9.9.19.14.6] unified owner scope: load keys for the default owner
        // plus orphan legacy keys (no ownerId). Single-owner project.
        const ownerId = await getDefaultOwnerId()
        const scope = getOwnerScope(ownerId)
        const keys = await ApiKey.find({ ...scope, isActive: true })
        global.apiKeyCache = {}
        global.apiKeyMissCache = {}
        keys.forEach(k => {
            const value = k.key || k.keyValue
            if (value) global.apiKeyCache[k.provider] = value
        })
        console.log(`[HOT-RELOAD] Loaded ${keys.length} API keys to memory (ownerId=${ownerId || 'none'})`)
    } catch (e) {
        console.error('[HOT-RELOAD] Failed to load keys:', e.message)
    }
}

export function hotReloadApiKey(provider, key) {
    global.apiKeyCache = global.apiKeyCache || {}
    global.apiKeyCache[provider] = key?.trim?.() || key
    if (global.apiKeyMissCache) delete global.apiKeyMissCache[provider]
    keyAlertSent.delete(provider)
    // [v9.9.19.14.4] reset cooldown/state so the provider is retried immediately
    resetKeyHealth(provider)
    setProviderStatus(provider, 'missing', '')
    console.log(`[HOT-RELOAD] key=${provider} source=mongodb`)
    // [v9.9.19.14] write-through в instrumental-слой (как пользоваться инструментами/ключами)
    import('./memoryLayerService.js')
        .then(m => m.addMemoryEntry('instrumental', { type: 'pattern', content: `Ключ ${provider} обновлён через Кабинет (hot-reload, source=mongodb)`, tags: ['key', provider] }))
        .catch(() => {})
}

export function invalidateApiKeysCache() {
    global.apiKeyCache = {}
    global.apiKeyMissCache = {}
}

// ============ KEY HEALTH MONITOR ============
// [v9.9.19.2-UX-HOTFIX-v4] невалидный ключ (401/403, invalid api key, insufficient_quota) при любом вызове:
// ApiKey status='invalid' + lastError + дата, ОДИН алерт владельцу в owner-бот.
// Fallback-цепочка продолжает работать — приложение НЕ падает.
const keyAlertSent = new Set()

function isInvalidKeyError(status, error) {
    if (status === 401 || status === 403) return true
    const msg = `${error?.message || ''} ${JSON.stringify(error?.response?.data || '')}`.toLowerCase()
    return msg.includes('invalid api key') || msg.includes('invalid_api_key') || msg.includes('incorrect api key')
        || msg.includes('insufficient_quota') || msg.includes('authentication failed') || msg.includes('unauthorized')
}

export async function reportKeyFailure(providerId, status, error) {
    const keyProvider = providerId === 'groq_lite' ? 'groq' : providerId
    if (!isInvalidKeyError(status, error)) return
    try {
        const shortError = String(error?.response?.data?.error?.message || error?.message || 'invalid key').slice(0, 200)
        const doc = await ApiKey.findOneAndUpdate(
            { provider: keyProvider },
            { status: 'invalid', isValid: false, lastError: shortError, lastUsed: new Date() },
            { sort: { updatedAt: -1 }, new: true }
        ).lean()
        if (!doc) return // ключа нет в кабинете — нечего помечать
        // [v9.9.19.14] instrumental-слой: ключ протух — fallback-цепочка берёт следующего провайдера
        import('./memoryLayerService.js')
            .then(m => m.addMemoryEntry('instrumental', { type: 'pattern', content: `Ключ ${keyProvider} невалиден (${shortError.slice(0, 80)}) — fallback на следующего провайдера`, tags: ['key', keyProvider, 'invalid'] }))
            .catch(() => {})
        // [v9.9.19.14.4] cooldown: one alert per 30 min per provider
        setCooldown(keyProvider)
        setKeyHealthState(keyProvider, 'invalid', shortError)
        if (keyAlertSent.has(keyProvider)) return
        keyAlertSent.add(keyProvider)
        const { alertOwner } = await import('./ownerBot.js')
        alertOwner?.(`🔑 Ключ ${keyProvider} невалиден: ${shortError}\nFallback-цепочка продолжает работать.\nОбновите ключ в Кабинет → API Ключи.`)
    } catch (e) {
        console.warn('[KEY-HEALTH] report failed:', e.message)
    }
}

// ============ PROVIDER REGISTRY & STATUS ============
// [P16-FINAL] added: unified provider registry matching PROVIDER_CHAIN.
// Providers with a valid env key are enabled by default; Pollinations is always enabled (no key).
// Legacy providers are kept for UI compatibility but disabled by default.
const PROVIDER_META = {
    groq: { name: 'Groq', enabledByDefault: true, requiresKey: true },
    // [v9.9.19.2] последний fallback на слабой модели — только если всё умерло
    groq_lite: { name: 'Groq 8b (last resort)', enabledByDefault: true, requiresKey: true, keyProvider: 'groq' },
    openai: { name: 'OpenAI', enabledByDefault: true, requiresKey: true },
    mistral: { name: 'Mistral AI', enabledByDefault: true, requiresKey: true },
    cohere: { name: 'Cohere', enabledByDefault: true, requiresKey: true },
    together: { name: 'Together AI', enabledByDefault: true, requiresKey: true },
    deepseek: { name: 'DeepSeek', enabledByDefault: true, requiresKey: true },
    fireworks: { name: 'Fireworks AI', enabledByDefault: true, requiresKey: true },
    cerebras: { name: 'Cerebras', enabledByDefault: true, requiresKey: true },
    cloudflare: { name: 'Cloudflare Workers AI', enabledByDefault: true, requiresKey: true },
    openrouter: { name: 'OpenRouter', enabledByDefault: true, requiresKey: true },
    github: { name: 'GitHub Models', enabledByDefault: true, requiresKey: true },
    huggingface: { name: 'HuggingFace', enabledByDefault: true, requiresKey: true },
    pollinations: { name: 'Pollinations AI', enabledByDefault: true, requiresKey: false },
    // Legacy providers (kept for UI/status compatibility, not part of PROVIDER_CHAIN)
    workersai: { name: 'Cloudflare Workers AI (legacy)', enabledByDefault: false, requiresKey: true },
    gemini: { name: 'Google Gemini', enabledByDefault: false, requiresKey: true },
}

const providerStatusMap = new Map()

function setProviderStatus(id, status, lastError = '') {
    providerStatusMap.set(id, {
        status,
        lastError: String(lastError).slice(0, 200),
        lastCheckedAt: new Date().toISOString(),
    })
}

function initProviderStatuses() {
    for (const id of Object.keys(PROVIDER_META)) {
        if (!providerStatusMap.has(id)) {
            setProviderStatus(id, 'missing', '')
        }
    }
}
initProviderStatuses()

const isEnabled = async (provider, ownerId = null) => {
    // [P16-FIX] Pollinations never requires a key
    if (provider === 'pollinations') return true

    const meta = PROVIDER_META[provider] || { enabledByDefault: false, requiresKey: true }
    const keyId = meta.keyProvider || provider
    try {
        const setting = await AIProviderSetting.findOne({ provider }).lean()
        if (setting && setting.enabled === false) return false
        if (setting && setting.enabled === true) {
            // If explicitly enabled, also require a key when needed
            if (meta.requiresKey) {
                const key = await getKey(keyId, ownerId)
                return !!key
            }
            return true
        }
    } catch (err) {
        console.warn(`[aiService] failed to load provider setting for ${provider}:`, err.message)
    }
    // No explicit setting: use default
    if (!meta.enabledByDefault) return false
    if (meta.requiresKey) {
        const key = await getKey(keyId, ownerId)
        return !!key
    }
    return true
}

export async function getProviderStatuses() {
    try {
        const settings = await AIProviderSetting.find({}).lean()
        const settingsMap = Object.fromEntries(settings.map(s => [s.provider, s]))
        const result = []
        for (const [id, meta] of Object.entries(PROVIDER_META)) {
            const key = await getKey(meta.keyProvider || id)
            const setting = settingsMap[id]
            const statusEntry = providerStatusMap.get(id) || { status: 'missing', lastError: '', lastCheckedAt: null }
            let status = statusEntry.status
            let enabled = setting ? setting.enabled : meta.enabledByDefault

            if (!enabled) {
                status = 'disabled'
            } else if (!key && meta.requiresKey) {
                status = 'missing'
            } else if (isOnCooldown(id) || getKeyHealthState(id) === 'invalid') {
                status = 'invalid'
            } else if (status === 'missing') {
                // Key exists (or provider doesn't need one) but not tested yet
                status = 'active'
            }

            result.push({
                id,
                name: meta.name,
                enabled,
                hasKey: !!key,
                status,
                lastError: statusEntry.lastError || '',
                lastCheckedAt: statusEntry.lastCheckedAt || null,
            })
        }
        return result
    } catch (err) {
        console.error('[aiService] getProviderStatuses failed:', err.message)
        return Object.entries(PROVIDER_META).map(([id, meta]) => ({
            id,
            name: meta.name,
            enabled: meta.enabledByDefault,
            hasKey: false,
            status: 'missing',
            lastError: '',
            lastCheckedAt: null,
        }))
    }
}

export async function toggleProviderSetting(provider, enabled) {
    const setting = await AIProviderSetting.findOneAndUpdate(
        { provider },
        { provider, enabled },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    setProviderStatus(provider, enabled ? 'missing' : 'disabled', '')
    return { provider, enabled: setting.enabled }
}

export { isEnabled }

const SYSTEM_PROMPT = `You are AI Viral Studio — an expert content creation assistant specializing in viral social media content.

Your capabilities:
- Generate scripts for TikTok, YouTube Shorts, Instagram Reels
- Create engaging hooks and thumbnails
- Analyze content performance and suggest improvements
- Write SEO-optimized descriptions and tags
- Design content calendars and posting strategies

Rules:
- Always respond in the user's language
- Be concise but creative
- Use emojis where appropriate
- Format responses with clear sections
- Suggest 3 variations when possible`

const formatMessages = (message, history = []) => {
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        })),
        { role: 'user', content: message }
    ]
}

// [P16-FINAL] added: unified prompt builder for all text providers
function buildPrompt(messages) {
    const system = messages.find(m => m.role === 'system')?.content || SYSTEM_PROMPT
    const turns = messages.filter(m => m.role !== 'system')
    const user = turns[turns.length - 1]?.content || ''
    return `${system}\n\nUser: ${user}`.substring(0, 4000)
}

// ============ PROVIDER CALLS ============
async function chatWithGroq(prompt, ownerId = null) {
    const key = await getProviderKey('groq', ownerId)
    if (!key || key.length < 20) {
        console.log('[Groq] No valid key, skipping')
        throw new Error('No valid Groq key')
    }
    console.log('🚀 Calling Groq...')
    // [P24] fixed: use centralized GROQ_MODELS fallback chain
    const models = [process.env.GROQ_MODEL, ...GROQ_MODELS].filter(Boolean)
    const maxTokens = Number(process.env.GROQ_MAX_TOKENS) || 1500
    let lastErr
    for (let i = 0; i < models.length; i++) {
        const model = models[i]
        try {
            const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens
            }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 15000 })
            console.log(`[Groq] ${model} success`)
            return res.data.choices[0].message.content
        } catch (err) {
            lastErr = err
            const status = err.response?.status
            console.log(`[Groq] ${model} failed (status ${status || 'N/A'}):`, err.message)
            // [HOTFIX-2026-08-08] exponential backoff on 429 TPD rate limit
            if (status === 429 && i < models.length - 1) {
                const delay = 2000 * (i + 1)
                console.log(`[Groq] 429 received — retrying next model in ${delay}ms...`)
                await sleep(delay)
            }
        }
    }
    throw lastErr
}

// [v9.9.19.2-UX-HOTFIX-v4] Groq 8b — ПОСЛЕДНИЙ резерв, только если все сильные модели умерли
async function chatWithGroqLite(prompt, ownerId = null) {
    const key = await getProviderKey('groq', ownerId)
    if (!key || key.length < 20) throw new Error('No valid Groq key')
    console.log('🚀 Calling Groq 8b (last resort)...')
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: process.env.GROQ_LITE_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 15000 })
    return res.data.choices[0].message.content
}

async function chatWithMistral(prompt, ownerId = null) {
    const key = await getProviderKey('mistral', ownerId)
    if (!key) throw new Error('No Mistral key')
    console.log('🚀 Calling Mistral...')
    const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithCohere(prompt, ownerId = null) {
    const key = await getProviderKey('cohere', ownerId)
    if (!key) throw new Error('No Cohere key')
    console.log('🚀 Calling Cohere...')
    const res = await axios.post('https://api.cohere.ai/v1/chat', {
        model: process.env.COHERE_MODEL || 'command-r-plus',
        message: prompt
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.text
}

async function chatWithTogether(prompt, ownerId = null) {
    const key = await getProviderKey('together', ownerId)
    if (!key) throw new Error('No Together key')
    console.log('🚀 Calling Together...')
    const res = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithDeepSeek(prompt, ownerId = null) {
    const key = await getProviderKey('deepseek', ownerId)
    if (!key) throw new Error('No DeepSeek key')
    console.log('🚀 Calling DeepSeek...')
    const res = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithFireworks(prompt, ownerId = null) {
    const key = await getProviderKey('fireworks', ownerId)
    if (!key) throw new Error('No Fireworks key')
    console.log('🚀 Calling Fireworks...')
    const res = await axios.post('https://api.fireworks.ai/inference/v1/chat/completions', {
        // [v9.9.19.14.4] centralized model id (see MODEL_IDS)
        model: process.env.FIREWORKS_MODEL || MODEL_IDS.fireworks,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithCerebras(prompt, ownerId = null) {
    const key = await getProviderKey('cerebras', ownerId)
    if (!key) throw new Error('No Cerebras key')
    console.log('🚀 Calling Cerebras...')
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithCloudflare(prompt, ownerId = null) {
    const key = await getProviderKey('cloudflare', ownerId)
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const model = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
    if (!key || !accountId) throw new Error('No Cloudflare key or account ID')
    console.log('🚀 Calling Cloudflare...')
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.result.response
}

async function chatWithOpenRouter(prompt, ownerId = null) {
    const key = await getProviderKey('openrouter', ownerId)
    if (!key) throw new Error('No OpenRouter key')
    console.log('🚀 Calling OpenRouter...')
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        // [v9.9.19.14.4] centralized model id (see MODEL_IDS)
        model: process.env.OPENROUTER_MODEL || MODEL_IDS.openrouter,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://ai-viral-studio.ru', 'X-Title': 'AI Viral Studio', 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithPollinationsText(prompt) {
    console.log('🚀 Calling Pollinations text...')
    // [VALUE-2026-08-04] added: real anonymous text generation, no auth, no key
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?seed=${Math.random()}&json=false&anonymous=true`
    const res = await axios.get(url, { timeout: 15000 })
    return res.data
}

async function chatWithGitHubModels(prompt, ownerId = null) {
    const key = await getProviderKey('github', ownerId)
    // [SOCIAL-v5.1] fixed: stricter GitHub key check
    if (!key || key.length < 10) {
        console.log('[GitHub Models] No valid key, skipping')
        throw new Error('No valid GitHub Models key')
    }
    console.log('🚀 Calling GitHub Models...')
    const res = await axios.post('https://models.inference.ai.azure.com/chat/completions', {
        model: process.env.GITHUB_MODEL || 'meta-llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithOpenAI(prompt, ownerId = null) {
    const key = await getProviderKey('openai', ownerId)
    if (!key || key.length < 20) {
        console.log('[OpenAI] No valid key, skipping')
        throw new Error('No valid OpenAI key')
    }
    console.log('🚀 Calling OpenAI...')
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithHuggingFace(prompt, ownerId = null) {
    const key = await getProviderKey('huggingface', ownerId)
    if (!key || key.length < 10) {
        console.log('[HuggingFace] No valid key, skipping')
        throw new Error('No valid HuggingFace key')
    }
    console.log('🚀 Calling HuggingFace...')
    const model = process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct'
    const res = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        { inputs: prompt, parameters: { max_new_tokens: 1024, return_full_text: false } },
        { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 25000 }
    )
    if (Array.isArray(res.data) && res.data[0]?.generated_text) return res.data[0].generated_text
    if (res.data?.generated_text) return res.data.generated_text
    throw new Error('Unexpected HuggingFace response format')
}

// ============ PROVIDER REGISTRY ============
// [v9.9.19.14.4] centralized model IDs and key URLs — single source of truth
const AI_PROVIDER_URLS = {
    groq: 'https://console.groq.com/keys',
    openrouter: 'https://openrouter.ai/keys',
    openai: 'https://platform.openai.com/api-keys',
    deepseek: 'https://platform.deepseek.com/api_keys',
    cerebras: 'https://cloud.cerebras.ai/platform/#overview',
    together: 'https://api.together.ai/settings/api-keys',
    fireworks: 'https://fireworks.ai/account/api-keys',
    mistral: 'https://console.mistral.ai/api-keys',
    cohere: 'https://dashboard.cohere.com/api-keys',
    cloudflare: 'https://dash.cloudflare.com/profile/api-tokens',
    github: 'https://github.com/settings/tokens',
    huggingface: 'https://huggingface.co/settings/tokens',
}

const MODEL_IDS = {
    groq: 'llama-3.3-70b-versatile',
    groq_lite: 'llama-3.1-8b-instant',
    deepseek: 'deepseek-chat',
    openai: 'gpt-4o-mini',
    // [v9.9.19.14.4] OpenRouter free model id updated 2026-08-11
    openrouter: 'google/gemini-2.0-flash-001',
    cerebras: 'llama-3.3-70b',
    together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    // [v9.9.19.14.4] Fireworks deployed id updated 2026-08-11
    fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    mistral: 'mistral-large-latest',
    cohere: 'command-r-plus',
    cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    github: 'meta-llama-3.1-8b-instruct',
    huggingface: 'meta-llama/Llama-3.3-70B-Instruct',
    pollinations: 'openai',
}

// [v9.9.19.14.4] Key Health cooldown: 30 min after 401/403/invalid format
const KEY_HEALTH_COOLDOWN_MS = 30 * 60 * 1000
global.keyHealthCooldown = global.keyHealthCooldown || new Map()
global.keyHealthLastState = global.keyHealthLastState || new Map()

function getKeyHealthState(providerId) {
    return global.keyHealthLastState.get(providerId) || 'unknown'
}

function setKeyHealthState(providerId, state, reason = '') {
    const prev = getKeyHealthState(providerId)
    global.keyHealthLastState.set(providerId, state)
    if (prev !== state) {
        const reasonShort = String(reason).slice(0, 80)
        console.log(`[KEY-HEALTH] ${providerId}: ${prev}→${state}${reasonShort ? ` (${reasonShort})` : ''}`)
    }
}

function isKeyFormatValid(providerId, key) {
    if (!key || typeof key !== 'string') return false
    const trimmed = key.trim()
    if (trimmed.length < 10) return false
    // provider-specific minimal checks
    if (providerId === 'groq' && !trimmed.startsWith('gsk_')) return false
    if (providerId === 'openai' && !trimmed.startsWith('sk-')) return false
    if (providerId === 'deepseek' && !trimmed.startsWith('sk-')) return false
    if (providerId === 'together' && !trimmed.startsWith('tf_')) return false
    if (providerId === 'cerebras' && !trimmed.startsWith('csk-')) return false
    return true
}

function isOnCooldown(providerId) {
    const until = global.keyHealthCooldown.get(providerId)
    if (!until) return false
    if (Date.now() >= until) {
        global.keyHealthCooldown.delete(providerId)
        return false
    }
    return true
}

function setCooldown(providerId, ms = KEY_HEALTH_COOLDOWN_MS) {
    global.keyHealthCooldown.set(providerId, Date.now() + ms)
}

function resetKeyHealth(providerId) {
    global.keyHealthCooldown.delete(providerId)
    global.keyHealthLastState.delete(providerId)
}

// ============ PROVIDER CHAIN ============
// [v9.9.15-BETA-LAUNCH] all 13 AI providers active with real keys
// [v9.9.19.2-UX-HOTFIX-v4] при 429/ошибке llama-3.3-70b-versatile: deepseek → openai → остальные сильные →
// groq llama-3.1-8b-instant (ПОСЛЕДНИЙ, только если всё умерло) → pollinations
const PROVIDER_CHAIN = [
    { id: 'groq', name: 'Groq', handler: chatWithGroq, model: MODEL_IDS.groq },
    { id: 'deepseek', name: 'DeepSeek', handler: chatWithDeepSeek, model: MODEL_IDS.deepseek },
    { id: 'openai', name: 'OpenAI', handler: chatWithOpenAI, model: MODEL_IDS.openai },
    { id: 'openrouter', name: 'OpenRouter', handler: chatWithOpenRouter, model: MODEL_IDS.openrouter },
    { id: 'cerebras', name: 'Cerebras', handler: chatWithCerebras, model: MODEL_IDS.cerebras },
    { id: 'together', name: 'Together AI', handler: chatWithTogether, model: MODEL_IDS.together },
    { id: 'fireworks', name: 'Fireworks AI', handler: chatWithFireworks, model: MODEL_IDS.fireworks },
    { id: 'mistral', name: 'Mistral AI', handler: chatWithMistral, model: MODEL_IDS.mistral },
    { id: 'cohere', name: 'Cohere', handler: chatWithCohere, model: MODEL_IDS.cohere },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', handler: chatWithCloudflare, model: MODEL_IDS.cloudflare },
    { id: 'github', name: 'GitHub Models', handler: chatWithGitHubModels, model: MODEL_IDS.github },
    { id: 'huggingface', name: 'HuggingFace', handler: chatWithHuggingFace, model: MODEL_IDS.huggingface },
    { id: 'groq_lite', name: 'Groq 8b (last resort)', handler: chatWithGroqLite, model: MODEL_IDS.groq_lite },
    { id: 'pollinations', name: 'Pollinations AI', handler: chatWithPollinationsText, model: MODEL_IDS.pollinations },
]

const SKIP_STATUSES = [401, 403, 404]

const tryProviders = async (messages, ownerId = null) => {
    const errors = []
    const prompt = buildPrompt(messages)

    for (const provider of PROVIDER_CHAIN) {
        // [v9.9.19.14.4] pre-flight checks: disabled, missing key, invalid format, or cooldown
        const meta = PROVIDER_META[provider.id] || { requiresKey: true }
        const keyId = meta.keyProvider || provider.id
        const rawKey = await getKey(keyId, ownerId).catch(() => null)
        const keyValid = meta.requiresKey === false || isKeyFormatValid(keyId, rawKey)

        if (!keyValid) {
            if (rawKey) setKeyHealthState(provider.id, 'invalid', 'format')
            continue // silent skip: no key or bad format
        }
        if (isOnCooldown(provider.id)) {
            continue // silent skip: cooling down after invalid key
        }

        const enabled = await isEnabled(provider.id, ownerId)
        if (!enabled) {
            setProviderStatus(provider.id, 'disabled', '')
            continue
        }

        try {
            // [v9.9.19.14.4] log only when actually trying a live provider
            console.log(`🤖 Trying ${provider.name}...`)
            const text = await provider.handler(prompt, ownerId)
            if (!text || !String(text).trim()) throw new Error('Empty response')
            // [v9.9.19.2] владелец видит, какая модель ответила
            console.log(`[AI] provider=${provider.id} model=${provider.model}`)
            setProviderStatus(provider.id, 'active', '')
            setKeyHealthState(provider.id, 'ok')
            return { reply: String(text).trim(), provider: provider.id, usage: null }
        } catch (error) {
            const status = error.response?.status
            const isKeyErr = isInvalidKeyError(status, error)
            // [v9.9.19.14.4] silent skip for dead/missing keys: one-line debug only
            if (isKeyErr || status === 404) {
                setKeyHealthState(provider.id, 'invalid', error?.response?.data?.error?.message || error.message)
                if (isKeyErr) setCooldown(provider.id)
            }
            // [v9.9.19.14.4] log provider failure compactly, no full dump
            console.log(`⏭️ ${provider.name} failed (status ${status || 'N/A'}): ${error.message}`)
            setProviderStatus(provider.id, isKeyErr ? 'invalid' : 'error', status || error.message)
            // [v9.9.19.2] Key Health Monitor: невалидный ключ → status=invalid + один алерт владельцу
            reportKeyFailure(provider.id, status, error).catch(() => {})
            errors.push(`${provider.name}: ${error.message}`)
            await sleep(200)
        }
    }

    // [P16-FINAL] All providers failed — try Local Brain, then Smart Fallback
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    try {
        const localBrain = new LocalBrain()
        await localBrain.loadModel()
        const local = await localBrain.generate(lastUserMessage, 256, 0.7)
        if (local && typeof local.text === 'string' && local.text.length > 10) {
            console.log(`[LOCAL_BRAIN] used for query: "${lastUserMessage.substring(0, 50)}..."`)
            return { reply: local.text, provider: 'local_brain', source: local.source || local.model, errors }
        }
    } catch (err) {
        console.warn('[LOCAL_BRAIN] fallback failed:', err.message)
    }

    const fallbackReply = smartFallbackReply(lastUserMessage, 'ru')
    console.log('🧠 All providers failed — falling back to Smart Fallback')
    return { reply: fallbackReply.text, provider: 'fallback', fallback: true, errors }
}

// ============ EXPORTS ============
import { getJSON, setJSON, cacheKey as redisCacheKey } from '../config/redis.js'

export { PROVIDER_CHAIN, AI_PROVIDER_URLS, MODEL_IDS }

export function getKeyHealthSummary() {
    const summary = []
    for (const id of Object.keys(PROVIDER_META)) {
        if (id === 'groq_lite' || id === 'workersai') continue
        summary.push({
            id,
            name: PROVIDER_META[id]?.name || id,
            state: getKeyHealthState(id),
            cooldown: isOnCooldown(id),
        })
    }
    return summary
}

export const chatWithAI = async (message, history = [], lang = 'ru', options = {}) => {
    if (emergencyStop) {
        return { success: true, reply: '⛔ OMEGA временно остановлена владельцем. Попробуйте позже.', provider: 'system' }
    }

    const { userId } = options

    const localCached = getCached(message, lang, userId)
    if (localCached) {
        console.debug('♻️ Returning local cached response')
        return { success: true, ...localCached, cached: true }
    }

    try {
        const redisKey = redisCacheKey('ai:response', { userId: userId || 'anon', message, lang, historyHash: JSON.stringify(history).slice(0, 200) })
        const redisCached = await getJSON(redisKey)
        if (redisCached) {
            console.debug('♻️ Returning Redis cached response')
            setCached(message, lang, redisCached, userId)
            return { success: true, ...redisCached, cached: true, source: 'redis' }
        }

        // Retrieve relevant memory context for this user
        let memoryContext = ''
        if (userId) {
            try {
                const memory = await searchVectorMemory({ query: message, userId, limit: 3 })
                if (memory.status === 'success' && memory.results.length > 0) {
                    memoryContext = `Контекст из памяти OMEGA:\n${memory.results.map(r => `- ${r.text}`).join('\n')}\n\n`
                }
            } catch (err) {
                console.error('[chatWithAI] memory search error:', err.message)
            }
        }

        const detectedLang = detectLanguage(message)
        const langPrompt = `Язык запроса: ${detectedLang}. Отвечай строго на этом языке.`
        // [HOTFIX-2026-08-04] added role context
        const extraSystem = options.extraSystem || ''
        const systemParts = [memoryContext, extraSystem, SYSTEM_PROMPT, langPrompt].filter(Boolean)
        const messages = [
            { role: 'system', content: systemParts.join('\n\n') },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: 'user', content: message }
        ]
        const result = await tryProviders(messages, options.ownerId || options.userId || null)
        const value = { reply: result.reply, provider: result.provider, usage: result.usage }
        setCached(message, lang, value, userId)
        await setJSON(redisKey, value, 3600)

        // Persist conversation turn for future RAG lookups
        if (userId) {
            try {
                await addToVectorMemory({
                    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    text: `User: ${message}\nOMEGA: ${result.reply}`,
                    metadata: { type: 'conversation', platform: 'web' },
                    userId,
                })
            } catch (err) {
                console.error('[chatWithAI] memory save error:', err.message)
            }
        }

        return { success: true, ...value }
    } catch (error) {
        console.error('AI Service Error:', error.message)
        // [HOTFIX-2026-08-04] added — pass role to fallback reply
        const reply = smartFallbackReply(message, lang, options.userRole)
        return {
            success: true,
            fallback: true,
            reply: reply.text,
            provider: 'fallback',
            error: error.message
        }
    }
}

export const generateContent = async (type, params) => {
    const prompts = {
        script: `Create a viral ${params.platform || 'TikTok'} script about: ${params.topic}. Duration: ${params.duration || '60 seconds'}. Style: ${params.style || 'engaging and energetic'}.`,
        hook: `Generate 5 attention-grabbing hooks for: ${params.topic}. Platform: ${params.platform || 'TikTok'}. Max 10 words each.`,
        description: `Write an SEO-optimized description for: ${params.title}. Platform: ${params.platform || 'YouTube'}. Include relevant hashtags.`,
        tags: `Generate 15 relevant hashtags for: ${params.topic}. Mix of popular and niche tags. Platform: ${params.platform || 'TikTok'}.`,
        thumbnail: `Describe an eye-catching thumbnail design for: ${params.title}. Style: ${params.style || 'bold and colorful'}. Include text overlay suggestions.`
    }

    const prompt = prompts[type] || prompts.script

    try {
        const messages = [
            { role: 'system', content: 'You are a viral content expert. Be creative and specific.' },
            { role: 'user', content: prompt }
        ]
        const result = await tryProviders(messages, params.ownerId || null)
        return {
            success: true,
            content: result.reply,
            type,
            provider: result.provider
        }
    } catch (error) {
        console.error('Content Generation Error:', error.message)
        return {
            success: false,
            content: 'Ошибка генерации контента.',
            error: error.message,
            provider: null
        }
    }
}

export const streamChat = async (message, history = [], onChunk, ownerId = null) => {
    const key = await getKey('groq', ownerId)
    if (!key) {
        const result = await chatWithAI(message, history)
        if (result.success) onChunk?.(result.reply)
        return result
    }
    try {
        const client = new Groq({ apiKey: key })
        const messages = formatMessages(message, history)
        const stream = await client.chat.completions.create({
            messages,
            model: process.env.GROQ_MODEL || GROQ_MODELS[0],
            temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
            max_tokens: parseInt(process.env.GROQ_MAX_TOKENS || '4096'),
            stream: true
        })
        let fullResponse = ''
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            fullResponse += content
            onChunk?.(content)
        }
        return {
            success: true,
            reply: fullResponse,
            provider: 'groq',
            usage: { total_tokens: Math.ceil(fullResponse.length / 4) }
        }
    } catch (error) {
        console.error('Stream Error:', error.message)
        return chatWithAI(message, history)
    }
}

export const generateImage = async (prompt, options = {}) => {
    const { width = 1024, height = 1024, seed = null, nologo = true } = options
    try {
        const encoded = encodeURIComponent(prompt)
        const params = new URLSearchParams({ width, height, nologo })
        if (seed) params.set('seed', String(seed))
        const url = `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`
        console.log('🎨 Generating image via Pollinations...')
        return { success: true, url, provider: 'pollinations' }
    } catch (error) {
        console.error('Image Generation Error:', error.message)
        return { success: false, error: error.message, provider: null }
    }
}

export default {
    chatWithAI,
    generateContent,
    streamChat,
    generateImage,
    invalidateApiKeysCache
}
