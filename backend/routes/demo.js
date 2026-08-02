import express from 'express'
import rateLimit from 'express-rate-limit'
import axios from 'axios'

const router = express.Router()

const API_URL = process.env.BACKEND_URL || 'http://localhost:10000'

// In-memory cache по ниши (TTL 1 час)
const cache = new Map()

function getCacheKey(niche) {
    return `demo:${niche.toLowerCase().trim()}`
}

function getCached(key) {
    const item = cache.get(key)
    if (!item) return null
    if (Date.now() > item.expiresAt) {
        cache.delete(key)
        return null
    }
    return item.value
}

function setCached(key, value, ttlMs = 60 * 60 * 1000) {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

const demoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3,
    message: { success: false, message: 'Демо-лимит исчерпан. Попробуйте через час или встаньте в очередь.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
})

// POST /api/demo/generate — сгенерировать 3 хука для ниши
router.post('/generate', demoLimiter, async (req, res) => {
    try {
        const { niche, email } = req.body
        if (!niche || typeof niche !== 'string') {
            return res.status(400).json({ success: false, message: 'Niche is required' })
        }

        const normalizedNiche = niche.toLowerCase().trim()
        const cacheKey = getCacheKey(normalizedNiche)
        const cached = getCached(cacheKey)
        if (cached) {
            return res.json({ success: true, data: cached, cached: true })
        }

        const prompt = `Ты — OMEGA, AI для вирусного маркетинга. Для ниши "${niche}" сгенерируй 3 коротких вирусных хука (hook) для Reels/Shorts/TikTok. Каждый хук должен быть цепляющим, с конкретикой, без воды. Для каждого хука добавь 15-секундный скрипт видео (2-3 реплики). Ответь строго в JSON формате:
{
  "hooks": [
    { "title": "...", "hook": "...", "script15s": "..." },
    { "title": "...", "hook": "...", "script15s": "..." },
    { "title": "...", "hook": "...", "script15s": "..." }
  ]
}`

        const response = await axios.post(`${API_URL}/api/omega/chat`, {
            message: prompt,
            history: [],
            lang: 'ru',
        })

        let result = response.data?.data?.response || response.data?.reply || response.data?.response
        if (!result) {
            return res.status(502).json({ success: false, message: 'AI не вернул ответ' })
        }

        // Пытаемся извлечь JSON из ответа
        let parsed
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/)
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result)
        } catch (err) {
            // fallback — парсим строки вручную
            const lines = result.split(/\n/).filter(Boolean)
            parsed = {
                hooks: [
                    { title: 'Хук 1', hook: lines[0] || 'Вирусный хук для ' + niche, script15s: '0-5с: вопрос\n5-10с: раскрытие\n10-15с: призыв' },
                    { title: 'Хук 2', hook: lines[1] || 'Ещё один хук для ' + niche, script15s: '0-5с: проблема\n5-10с: решение\n10-15с: CTA' },
                    { title: 'Хук 3', hook: lines[2] || 'Третий хук для ' + niche, script15s: '0-5с: миф\n5-10с: правда\n10-15с: подписка' },
                ],
            }
        }

        if (!parsed.hooks || !Array.isArray(parsed.hooks)) {
            parsed = { hooks: parsed }
        }

        const hooks = parsed.hooks.slice(0, 3).map((h, idx) => ({
            id: idx + 1,
            title: h.title || `Вариант ${idx + 1}`,
            hook: h.hook || h.text || 'Вирусный хук для ' + niche,
            script15s: h.script15s || h.script || '0-5с: вовлечение\n5-10с: суть\n10-15с: призыв к действию',
        }))

        const payload = { niche, hooks }
        setCached(cacheKey, payload)

        res.json({ success: true, data: payload, email })
    } catch (err) {
        console.error('[demo/generate] error:', err.message)
        res.status(500).json({ success: false, message: err.message })
    }
})

export default router
