// [KEYS-UNIVERSAL З3/З5] Универсальный слот «Свой провайдер».
// Живая валидация тест-запросом (OpenAI-совместимый /models), вызов в ротации чата,
// мёртвый ключ (401/402/403) → авто-отключение + TG-алерт владельцу (HTML-экранирование).
// Hot-reload: TTL-кэш 30с + мгновенный сброс при save/update/delete из роутов.
import axios from 'axios'
import CustomProvider from '../models/CustomProvider.js'

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const CACHE_TTL_MS = 30 * 1000 // ≤60с hot-reload по требованию батча
let chatCache = { at: 0, list: [] }

export function invalidateCustomProviderCache() {
    chatCache = { at: 0, list: [] }
}

// Активные валидные слоты, привязанные к функции 'chat'
export async function getCustomChatProviders() {
    if (Date.now() - chatCache.at < CACHE_TTL_MS) return chatCache.list
    try {
        const list = await CustomProvider.find({ isActive: true, isValid: true, functions: 'chat' }).lean()
        chatCache = { at: Date.now(), list }
    } catch (e) {
        console.warn('[custom-provider] cache load failed:', e.message)
    }
    return chatCache.list
}

function normalizeBaseUrl(raw) {
    const u = String(raw || '').trim().replace(/\/+$/, '')
    if (!/^https:\/\//i.test(u)) return null // только https (SSRF-гигиена)
    return u
}

/**
 * Живая проверка слота: GET {baseUrl}/models с Bearer-ключом (дешёвый эндпоинт
 * OpenAI-совместимых API). 401/402/403 → честная причина, слот НЕ сохраняем молча.
 */
export async function testCustomProvider({ baseUrl, apiKey, model }) {
    const base = normalizeBaseUrl(baseUrl)
    if (!base) return { ok: false, error: 'baseURL должен начинаться с https://' }
    if (!apiKey || String(apiKey).trim().length < 8) return { ok: false, error: 'Ключ слишком короткий' }
    if (!model || !String(model).trim()) return { ok: false, error: 'Укажите модель (например: gpt-4o-mini)' }
    try {
        const r = await axios.get(`${base}/models`, {
            headers: { Authorization: `Bearer ${String(apiKey).trim()}` },
            timeout: 12000,
            validateStatus: () => true,
        })
        if (r.status >= 200 && r.status < 300) return { ok: true, status: r.status }
        const apiMsg = r.data?.error?.message || r.data?.message || ''
        if (r.status === 401 || r.status === 403) return { ok: false, status: r.status, error: `Ключ отклонён провайдером (HTTP ${r.status})${apiMsg ? `: ${apiMsg}` : ''}` }
        if (r.status === 402) return { ok: false, status: r.status, error: `Недостаточно средств у провайдера (HTTP 402)${apiMsg ? `: ${apiMsg}` : ''}` }
        if (r.status === 404) return { ok: false, status: r.status, error: `Эндпоинт /models не найден (HTTP 404) — проверьте baseURL (ожидается OpenAI-совместимый API, например https://api.example.com/v1)` }
        return { ok: false, status: r.status, error: `Провайдер ответил HTTP ${r.status}${apiMsg ? `: ${apiMsg}` : ''}` }
    } catch (e) {
        const reason = e.code === 'ECONNABORTED' ? 'таймаут 12с — провайдер не отвечает' : (e.message || 'сеть недоступна')
        return { ok: false, error: `Не удалось достучаться до провайдера: ${reason}` }
    }
}

/**
 * Вызов слота в ротации чата (OpenAI-совместимый chat/completions).
 * 401/402/403 → авто-отключение слота + TG-алерт, ошибка пробрасывается в tryProviders.
 */
export async function callCustomProvider(cp, prompt) {
    const base = normalizeBaseUrl(cp.baseUrl)
    if (!base) throw new Error('custom provider: bad baseUrl')
    try {
        const r = await axios.post(`${base}/chat/completions`, {
            model: cp.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
        }, {
            headers: { Authorization: `Bearer ${cp.apiKey}`, 'Content-Type': 'application/json' },
            timeout: 45000,
        })
        const text = r.data?.choices?.[0]?.message?.content
        if (!text || !String(text).trim()) throw new Error('Empty response')
        return String(text).trim()
    } catch (e) {
        const status = e.response?.status
        if (status === 401 || status === 402 || status === 403) {
            await disableCustomProvider(cp._id, `HTTP ${status}`)
        }
        throw e
    }
}

// [З5] Мёртвый ключ слота: isActive=false (переживает рестарт), стоп кэша, TG-алерт.
async function disableCustomProvider(id, reason) {
    try {
        await CustomProvider.updateOne(
            { _id: id, isActive: { $ne: false } },
            { $set: { isActive: false, status: 'invalid', lastError: `auto-disabled: ${reason} @ ${new Date().toISOString()}` } }
        )
        invalidateCustomProviderCache()
        const doc = await CustomProvider.findById(id).lean()
        console.warn(`[custom-provider] slot=${doc?.name || id} выведен из ротации (${reason})`)
        const { sendOwnerAlert } = await import('./ownerBot.js')
        await sendOwnerAlert(
            `🔑 Свой провайдер <b>${escapeHtml(doc?.name || id)}</b> отключён автоматически (${escapeHtml(reason)}).\nСлот выведен из ротации, живые провайдеры продолжают работу.\nНовый ключ — Кабинет → API Ключи → Свои провайдеры.`,
            'warning'
        )
    } catch (e) {
        console.warn('[custom-provider] disable failed:', e.message)
    }
}

export default { getCustomChatProviders, callCustomProvider, testCustomProvider, invalidateCustomProviderCache }
