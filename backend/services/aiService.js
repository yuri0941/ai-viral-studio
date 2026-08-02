import Groq from 'groq-sdk'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ApiKey, AIProviderSetting } from '../models/index.js'
import { emergencyStop } from '../routes/admin.js'
import { searchVectorMemory, addToVectorMemory } from './vectorStore.js'

// ============ HELPERS ============
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let cachedKeys = null
async function loadApiKeys() {
    if (cachedKeys) return cachedKeys
    try {
        const docs = await ApiKey.find({ isActive: true }).lean()
        cachedKeys = Object.fromEntries(docs.map(d => [d.provider, d.key]))
    } catch (err) {
        console.warn('⚠️ Failed to load API keys from DB:', err.message)
        cachedKeys = {}
    }
    return cachedKeys
}

export function invalidateApiKeysCache() {
    cachedKeys = null
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

function cacheKey(message, lang = 'ru') {
    return `${lang}:${hashString(message.trim().toLowerCase())}`
}

function getCached(message, lang) {
    const key = cacheKey(message, lang)
    const entry = responseCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
        responseCache.delete(key)
        return null
    }
    return entry.value
}

function setCached(message, lang, value) {
    const key = cacheKey(message, lang)
    responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ============ SMART DEMO TEMPLATES ============
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

// [P16-HOTFIX-v2] built-in demo templates ensure OMEGA always replies usefully even without API keys
const DEMO_TEMPLATES = [
    {
        id: 'greeting',
        tags: ['привет', 'здравствуй', 'hello', 'hi', 'ку', 'start'],
        response: 'Привет! Я OMEGA, ваш AI-ассистент по SMM. Готова помочь с идеями, скриптами, хуками и аналитикой. О чём поговорим?'
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

function smartDemoReply(message, lang = 'ru') {
    const lower = message.toLowerCase()
    const allTemplates = [...DEMO_TEMPLATES, ...TEMPLATES]
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
        return scored[0].response
    }
    const generic = allTemplates.find(t => t.id === 'generic')
    return generic?.response || 'Я готова помочь с контент-стратегией, скриптами, хуками и аналитикой. Опиши задачу подробнее.'
}

const getKey = async (provider) => {
    const keys = await loadApiKeys()
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`]
    return keys[provider] || envKey || ''
}

// [P16-FINAL] added: explicit provider key resolver used by owner dashboard / setup flows
export async function getProviderKey(provider, ownerId) {
    // Owner-scoped keys can be extended here; for now fall back to global env key.
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`] || ''
    if (envKey) return envKey
    const keys = await loadApiKeys()
    return keys[provider] || ''
}

// ============ PROVIDER REGISTRY & STATUS ============
// [P16-FINAL] added: unified provider registry matching PROVIDER_CHAIN.
// Providers with a valid env key are enabled by default; Pollinations is always enabled (no key).
// Legacy providers are kept for UI compatibility but disabled by default.
const PROVIDER_META = {
    groq: { name: 'Groq', enabledByDefault: true, requiresKey: true },
    mistral: { name: 'Mistral AI', enabledByDefault: true, requiresKey: true },
    cohere: { name: 'Cohere', enabledByDefault: true, requiresKey: true },
    together: { name: 'Together AI', enabledByDefault: true, requiresKey: true },
    deepseek: { name: 'DeepSeek', enabledByDefault: true, requiresKey: true },
    fireworks: { name: 'Fireworks AI', enabledByDefault: true, requiresKey: true },
    cerebras: { name: 'Cerebras', enabledByDefault: true, requiresKey: true },
    cloudflare: { name: 'Cloudflare Workers AI', enabledByDefault: true, requiresKey: true },
    openrouter: { name: 'OpenRouter', enabledByDefault: true, requiresKey: true },
    github: { name: 'GitHub Models', enabledByDefault: true, requiresKey: true },
    pollinations: { name: 'Pollinations AI', enabledByDefault: true, requiresKey: false },
    // Legacy providers (kept for UI/status compatibility, not part of PROVIDER_CHAIN)
    workersai: { name: 'Cloudflare Workers AI (legacy)', enabledByDefault: false, requiresKey: true },
    huggingface: { name: 'HuggingFace', enabledByDefault: false, requiresKey: true },
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

const isEnabled = async (provider) => {
    // [P16-FIX] Pollinations never requires a key
    if (provider === 'pollinations') return true

    const meta = PROVIDER_META[provider] || { enabledByDefault: false, requiresKey: true }
    try {
        const setting = await AIProviderSetting.findOne({ provider }).lean()
        if (setting && setting.enabled === false) return false
        if (setting && setting.enabled === true) {
            // If explicitly enabled, also require a key when needed
            if (meta.requiresKey) {
                const key = await getKey(provider)
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
        const key = await getKey(provider)
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
            const key = await getKey(id)
            const setting = settingsMap[id]
            const statusEntry = providerStatusMap.get(id) || { status: 'missing', lastError: '', lastCheckedAt: null }
            let status = statusEntry.status
            let enabled = setting ? setting.enabled : meta.enabledByDefault

            if (!enabled) {
                status = 'disabled'
            } else if (!key && meta.requiresKey) {
                status = 'missing'
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
async function chatWithGroq(prompt) {
    const key = process.env.GROQ_API_KEY
    if (!key || key.length < 20) {
        console.log('[Groq] No valid key, skipping')
        throw new Error('No valid Groq key')
    }
    console.log('🚀 Calling Groq...')
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 15000 })
    return res.data.choices[0].message.content
}

async function chatWithMistral(prompt) {
    const key = process.env.MISTRAL_API_KEY
    if (!key) throw new Error('No Mistral key')
    console.log('🚀 Calling Mistral...')
    const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithCohere(prompt) {
    const key = process.env.COHERE_API_KEY
    if (!key) throw new Error('No Cohere key')
    console.log('🚀 Calling Cohere...')
    const res = await axios.post('https://api.cohere.ai/v1/chat', {
        model: process.env.COHERE_MODEL || 'command-r-plus',
        message: prompt
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.text
}

async function chatWithTogether(prompt) {
    const key = process.env.TOGETHER_API_KEY
    if (!key) throw new Error('No Together key')
    console.log('🚀 Calling Together...')
    const res = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithDeepSeek(prompt) {
    const key = process.env.DEEPSEEK_API_KEY
    if (!key) throw new Error('No DeepSeek key')
    console.log('🚀 Calling DeepSeek...')
    const res = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithFireworks(prompt) {
    const key = process.env.FIREWORKS_API_KEY
    if (!key) throw new Error('No Fireworks key')
    console.log('🚀 Calling Fireworks...')
    const res = await axios.post('https://api.fireworks.ai/inference/v1/chat/completions', {
        model: process.env.FIREWORKS_MODEL || 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithCerebras(prompt) {
    const key = process.env.CEREBRAS_API_KEY
    if (!key) throw new Error('No Cerebras key')
    console.log('🚀 Calling Cerebras...')
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithCloudflare(prompt) {
    const key = process.env.CLOUDFLARE_API_KEY
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const model = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
    if (!key || !accountId) throw new Error('No Cloudflare key or account ID')
    console.log('🚀 Calling Cloudflare...')
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.result.response
}

async function chatWithOpenRouter(prompt) {
    const key = process.env.OPENROUTER_API_KEY
    if (!key) throw new Error('No OpenRouter key')
    console.log('🚀 Calling OpenRouter...')
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
    }, { headers: { 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://ai-viral-studio.ru', 'X-Title': 'AI Viral Studio', 'Content-Type': 'application/json' }, timeout: 20000 })
    return res.data.choices[0].message.content
}

async function chatWithPollinationsText(prompt) {
    console.log('🚀 Calling Pollinations text...')
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt.substring(0, 1500))}?seed=${Math.floor(Math.random() * 100000)}&json=false`
    const res = await axios.get(url, { timeout: 15000 })
    return res.data
}

async function chatWithGitHubModels(prompt) {
    const key = process.env.GITHUB_API_KEY
    if (!key || key.length < 20) {
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

// ============ PROVIDER CHAIN ============
// [P16-FINAL] added: 10+ providers, priority by speed/reliability, Pollinations no-key fallback last
const PROVIDER_CHAIN = [
    { id: 'groq', name: 'Groq', handler: chatWithGroq, model: 'llama-3.3-70b-versatile' },
    { id: 'mistral', name: 'Mistral', handler: chatWithMistral, model: 'mistral-large-latest' },
    { id: 'cohere', name: 'Cohere', handler: chatWithCohere, model: 'command-r-plus' },
    { id: 'together', name: 'Together', handler: chatWithTogether, model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
    { id: 'deepseek', name: 'DeepSeek', handler: chatWithDeepSeek, model: 'deepseek-chat' },
    { id: 'fireworks', name: 'Fireworks', handler: chatWithFireworks, model: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
    { id: 'cerebras', name: 'Cerebras', handler: chatWithCerebras, model: 'llama-3.3-70b' },
    { id: 'cloudflare', name: 'Cloudflare', handler: chatWithCloudflare, model: process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
    { id: 'openrouter', name: 'OpenRouter', handler: chatWithOpenRouter, model: 'meta-llama/llama-3.3-70b-instruct' },
    { id: 'github', name: 'GitHub Models', handler: chatWithGitHubModels, model: process.env.GITHUB_MODEL || 'meta-llama-3.1-8b-instruct' },
    { id: 'pollinations', name: 'Pollinations', handler: chatWithPollinationsText, model: 'anonymous' },
]

const SKIP_STATUSES = [401, 403, 404]

const tryProviders = async (messages) => {
    const errors = []
    const prompt = buildPrompt(messages)

    for (const provider of PROVIDER_CHAIN) {
        const enabled = await isEnabled(provider.id)
        if (!enabled) {
            console.log(`⏭️ ${provider.name} skipped (disabled or no key)`)
            setProviderStatus(provider.id, 'disabled', '')
            continue
        }
        try {
            console.log(`🤖 Trying ${provider.name}...`)
            const text = await provider.handler(prompt)
            if (!text || !String(text).trim()) throw new Error('Empty response')
            console.log(`✅ ${provider.name} success!`)
            setProviderStatus(provider.id, 'active', '')
            return { reply: String(text).trim(), provider: provider.id, usage: null }
        } catch (error) {
            const status = error.response?.status
            console.error(`❌ ${provider.name} failed (status ${status || 'N/A'}):`, error.message)
            if (error.response?.data) {
                console.error(`   Data:`, JSON.stringify(error.response.data).substring(0, 300))
            }
            setProviderStatus(provider.id, 'error', status || error.message)
            errors.push(`${provider.name}: ${error.message}`)
            if (SKIP_STATUSES.includes(status)) {
                console.log(`⏭️ ${provider.name} skipped`)
            }
            await sleep(200)
        }
    }

    // [P16-FINAL] All providers failed — return Smart Demo Mode response so OMEGA always replies
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const demoReply = smartDemoReply(lastUserMessage, 'ru')
    console.log('🧠 All providers failed — falling back to Smart Demo Mode')
    return { reply: demoReply, provider: 'demo', demo: true, errors }
}

// ============ EXPORTS ============
import { getJSON, setJSON, cacheKey as redisCacheKey } from '../config/redis.js'

export const chatWithAI = async (message, history = [], lang = 'ru', options = {}) => {
    if (emergencyStop) {
        return { success: true, reply: '⛔ OMEGA временно остановлена владельцем. Попробуйте позже.', provider: 'system' }
    }

    const { userId } = options

    const localCached = getCached(message, lang)
    if (localCached) {
        console.log('♻️ Returning local cached response')
        return { success: true, ...localCached, cached: true }
    }

    try {
        const redisKey = redisCacheKey('ai:response', { message, lang, historyHash: JSON.stringify(history).slice(0, 200) })
        const redisCached = await getJSON(redisKey)
        if (redisCached) {
            console.log('♻️ Returning Redis cached response')
            setCached(message, lang, redisCached)
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

        const messages = [
            { role: 'system', content: `${memoryContext}${SYSTEM_PROMPT}` },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: 'user', content: message }
        ]
        const result = await tryProviders(messages)
        const value = { reply: result.reply, provider: result.provider, usage: result.usage }
        setCached(message, lang, value)
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
        const reply = smartDemoReply(message, lang)
        return {
            success: true,
            demo: true,
            reply,
            provider: 'demo',
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
        const result = await tryProviders(messages)
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

export const streamChat = async (message, history = [], onChunk) => {
    const key = await getKey('groq')
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
            model: process.env.GROQ_MODEL && !process.env.GROQ_MODEL.includes('llama-3.1-70b-versatile')
                ? process.env.GROQ_MODEL
                : 'llama-3.3-70b-versatile',
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
