import Groq from 'groq-sdk'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ApiKey } from '../models/index.js'
import { emergencyStop } from '../routes/admin.js'

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

function smartDemoReply(message, lang = 'ru') {
    const lower = message.toLowerCase()
    // Match by tags; prefer templates with more matching tags
    const scored = TEMPLATES
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
    const generic = TEMPLATES.find(t => t.id === 'generic')
    return generic?.response || 'Я готова помочь с контент-стратегией, скриптами, хуками и аналитикой. Опиши задачу подробнее.'
}

const getKey = async (provider) => {
    const keys = await loadApiKeys()
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`]
    return keys[provider] || envKey || ''
}

const isEnabled = async (provider) => {
    const key = await getKey(provider)
    // Provider is enabled if a key is available (env flag *_ENABLED is ignored on purpose,
    // so that fallback chain always works on real requests)
    return !!key
}

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

// ============ PROVIDER CALLS ============
async function chatWithGroq(messages) {
    const key = await getKey('groq')
    if (!key) throw new Error('Groq key missing')
    console.log('🚀 Calling Groq...')
    const client = new Groq({ apiKey: key })
    const completion = await client.chat.completions.create({
        messages,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
        max_tokens: parseInt(process.env.GROQ_MAX_TOKENS || '4096'),
        stream: false
    })
    return {
        reply: completion.choices[0]?.message?.content || 'No response',
        provider: 'groq',
        usage: completion.usage
    }
}

async function chatWithOpenRouter(messages) {
    const key = await getKey('openrouter')
    if (!key) throw new Error('OpenRouter key missing')
    console.log('🚀 Calling OpenRouter...')
    const response = await axios.post(
        (process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1') + '/chat/completions',
        {
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            messages,
            temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
            max_tokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '4096')
        },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'AI Viral Studio'
            },
            timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '30000')
        }
    )
    return {
        reply: response.data.choices[0]?.message?.content || 'No response',
        provider: 'openrouter',
        usage: response.data.usage
    }
}

async function chatWithGemini(messages) {
    const key = await getKey('gemini')
    if (!key) throw new Error('Gemini key missing')
    console.log('🚀 Calling Gemini...')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`
    const contents = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }))
    const response = await axios.post(url, { contents }, { timeout: 30000 })
    const text = response.data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 'No response'
    return { reply: text, provider: 'gemini', usage: null }
}

async function chatWithGitHubModels(messages) {
    const key = await getKey('github')
    if (!key) throw new Error('GitHub Models key missing')
    console.log('🚀 Calling GitHub Models...')
    const response = await axios.post(
        'https://models.inference.ai.azure.com/chat/completions',
        {
            model: process.env.GITHUB_MODEL || 'gpt-4o',
            messages,
            temperature: 0.7,
            max_tokens: 4096
        },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )
    return {
        reply: response.data.choices[0]?.message?.content || 'No response',
        provider: 'github',
        usage: response.data.usage
    }
}

async function chatWithMistral(messages) {
    const key = await getKey('mistral')
    if (!key) throw new Error('Mistral key missing')
    console.log('🚀 Calling Mistral...')
    const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
            model: process.env.MISTRAL_MODEL || 'mistral-medium',
            messages,
            temperature: 0.7,
            max_tokens: 4096
        },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )
    return {
        reply: response.data.choices[0]?.message?.content || 'No response',
        provider: 'mistral',
        usage: response.data.usage
    }
}

async function chatWithCohere(messages) {
    const key = await getKey('cohere')
    if (!key) throw new Error('Cohere key missing')
    console.log('🚀 Calling Cohere...')
    const response = await axios.post(
        'https://api.cohere.ai/v1/chat',
        {
            model: process.env.COHERE_MODEL || 'command-r',
            message: messages[messages.length - 1].content,
            chat_history: messages.slice(0, -1).map(m => ({
                role: m.role === 'user' ? 'USER' : 'CHATBOT',
                message: m.content
            })),
            preamble: messages[0].role === 'system' ? messages[0].content : SYSTEM_PROMPT
        },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )
    return {
        reply: response.data.text || 'No response',
        provider: 'cohere',
        usage: response.data.usage
    }
}

async function chatWithDeepSeek(messages) {
    const key = await getKey('deepseek')
    if (!key) throw new Error('DeepSeek key missing')
    console.log('🚀 Calling DeepSeek...')
    const response = await axios.post(
        (process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1') + '/chat/completions',
        {
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            messages,
            temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
            max_tokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '4096')
        },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000')
        }
    )
    return {
        reply: response.data.choices[0]?.message?.content || 'No response',
        provider: 'deepseek',
        usage: response.data.usage
    }
}

async function chatWithHuggingFace(messages) {
    const key = await getKey('huggingface')
    if (!key) throw new Error('HuggingFace key missing')
    const models = [
        process.env.HUGGINGFACE_MODEL_1 || 'meta-llama/Llama-3.2-3B-Instruct',
        process.env.HUGGINGFACE_MODEL_2 || 'mistralai/Mistral-7B-Instruct-v0.3'
    ]
    const prompt = messages.map(m => `${m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant'}: ${m.content}`).join('\n') + '\nassistant:'
    let lastErr = null

    for (const model of models) {
        try {
            console.log(`🚀 Calling HuggingFace (${model})...`)
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 1024,
                        return_full_text: false,
                        temperature: 0.7
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            )
            const generated = Array.isArray(response.data) ? response.data[0]?.generated_text : response.data?.generated_text
            if (!generated) throw new Error('Empty HF response')
            return { reply: generated.trim(), provider: 'huggingface', usage: null }
        } catch (err) {
            lastErr = err
            console.warn(`⚠️ HuggingFace ${model} failed:`, err.message)
            await sleep(300)
        }
    }
    throw lastErr || new Error('HuggingFace all models failed')
}

async function chatWithCloudflare(messages) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const key = await getKey('cloudflare') || process.env.CLOUDFLARE_API_TOKEN
    if (!accountId) throw new Error('Cloudflare account ID missing')
    if (!key) throw new Error('Cloudflare token missing')
    const model = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-8b-instruct'
    console.log('🚀 Calling Cloudflare Workers AI...')
    const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        { messages },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )
    const result = response.data?.result
    const reply = typeof result === 'string' ? result : (result?.response || result?.content || 'No response')
    return { reply, provider: 'cloudflare', usage: null }
}

async function chatWithWorkersAI(messages) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const key = await getKey('cloudflare') || process.env.CLOUDFLARE_API_TOKEN
    if (!accountId) throw new Error('Cloudflare account ID missing')
    if (!key) throw new Error('Cloudflare token missing')
    const model = '@cf/meta/llama-3.1-8b-instruct'
    console.log('🚀 Calling Cloudflare Workers AI (llama-3.1-8b-instruct)...')
    const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        { messages },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )
    const result = response.data?.result
    const reply = typeof result === 'string' ? result : (result?.response || result?.content || 'No response')
    return { reply, provider: 'workersai', usage: null }
}

async function chatWithFireworks(messages) {
    const key = await getKey('fireworks') || process.env.FIREWORKS_API_KEY
    if (!key) throw new Error('Fireworks key missing')
    const model = process.env.FIREWORKS_MODEL || 'accounts/fireworks/models/llama-v3p1-8b-instruct'
    console.log('🚀 Calling Fireworks AI...')
    const response = await axios.post(
        'https://api.fireworks.ai/inference/v1/chat/completions',
        {
            model,
            messages,
            temperature: 0.7,
            max_tokens: 2048
        },
        {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    )
    return {
        reply: response.data.choices[0]?.message?.content || 'No response',
        provider: 'fireworks',
        usage: response.data.usage
    }
}

async function chatWithPollinationsText(messages) {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
    const encoded = encodeURIComponent(prompt)
    const url = `https://text.pollinations.ai/${encoded}?seed=${Math.floor(Math.random() * 1e6)}&system=no%20intro`
    console.log('🚀 Calling Pollinations text...')
    const response = await axios.get(url, { timeout: 60000, responseType: 'text' })
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    if (!text?.trim()) throw new Error('Empty Pollinations response')
    return { reply: text.trim(), provider: 'pollinations', usage: null }
}

// ============ PROVIDER CHAIN ============
const PROVIDER_CHAIN = [
    { id: 'groq', name: 'Groq', fn: chatWithGroq },
    { id: 'openrouter', name: 'OpenRouter', fn: chatWithOpenRouter },
    { id: 'gemini', name: 'Gemini', fn: chatWithGemini },
    { id: 'github', name: 'GitHub Models', fn: chatWithGitHubModels },
    { id: 'huggingface', name: 'HuggingFace', fn: chatWithHuggingFace },
    { id: 'workersai', name: 'Cloudflare Workers AI', fn: chatWithWorkersAI, noKey: false },
    { id: 'cloudflare', name: 'Cloudflare Workers AI (legacy)', fn: chatWithCloudflare },
    { id: 'fireworks', name: 'Fireworks AI', fn: chatWithFireworks },
    { id: 'mistral', name: 'Mistral', fn: chatWithMistral },
    { id: 'cohere', name: 'Cohere', fn: chatWithCohere },
    { id: 'deepseek', name: 'DeepSeek', fn: chatWithDeepSeek },
    { id: 'pollinations', name: 'Pollinations', fn: chatWithPollinationsText, noKey: true },
]

const RETRYABLE_STATUSES = [429, 403, 401, 500, 502, 503, 504]

const isRetryableError = (error) => {
    if (!error.response) return true
    return RETRYABLE_STATUSES.includes(error.response.status)
}

const tryProviders = async (messages) => {
    const errors = []

    for (const provider of PROVIDER_CHAIN) {
        const enabled = provider.noKey || await isEnabled(provider.id)
        if (!enabled) {
            console.log(`⏭️ ${provider.name} skipped (no key or disabled)`)
            continue
        }
        try {
            console.log(`🤖 Trying ${provider.name}...`)
            const result = await provider.fn(messages)
            console.log(`✅ ${provider.name} success!`)
            return { ...result, provider: provider.id }
        } catch (error) {
            const status = error.response?.status
            console.error(`❌ ${provider.name} failed (status ${status || 'N/A'}):`, error.message)
            if (error.response?.data) {
                console.error(`   Data:`, JSON.stringify(error.response.data).substring(0, 300))
            }
            errors.push(`${provider.name}: ${error.message}`)
            if (!isRetryableError(error)) {
                console.log(`🚫 ${provider.name} returned non-retryable error, continuing chain`)
            }
            await sleep(400)
        }
    }

    throw new Error(`All providers failed: ${errors.join('; ') || 'no providers enabled'}`)
}

// ============ EXPORTS ============
export const chatWithAI = async (message, history = [], lang = 'ru') => {
    if (emergencyStop) {
        return { success: true, reply: '⛔ OMEGA временно остановлена владельцем. Попробуйте позже.', provider: 'system' }
    }

    const cached = getCached(message, lang)
    if (cached) {
        console.log('♻️ Returning cached response')
        return { success: true, ...cached, cached: true }
    }

    try {
        const messages = formatMessages(message, history)
        const result = await tryProviders(messages)
        const value = { reply: result.reply, provider: result.provider, usage: result.usage }
        setCached(message, lang, value)
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
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
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
