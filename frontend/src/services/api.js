// ============================================
// API Service — обёртки для backend эндпоинтов
// ============================================

import axios from 'axios'
import { API_URL } from '../config.js'

const API_BASE = API_URL

// [HOTFIX-2026-08-08] detect mobile user-agents for retry logic
const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
)

// [v6.4] added: axios instance with Authorization interceptor
const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt')
        : null
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// [MEGA-HOTFIX-2026-08-08] unified retry interceptor: 429 / 5xx / network errors with exponential backoff
api.interceptors.response.use(
    response => response,
    async error => {
        const { config, response } = error
        const status = response?.status

        // [OWNER-REMOTE-CONTROL] maintenance mode: notify app, never retry
        if (status === 503 && response?.data?.maintenance === true) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('avs:maintenance'))
            }
            return Promise.reject(error)
        }

        const isRetryable = error.code === 'ERR_NETWORK' || status === 429 || (status >= 500 && status < 600)

        if (!config || !isRetryable) return Promise.reject(error)

        config.__retryCount = config.__retryCount || 0
        const MAX_RETRY = 5
        if (config.__retryCount >= MAX_RETRY) {
            console.error(`[API] Max retries reached for ${config.url}: ${status || error.code}`)
            return Promise.reject(error)
        }

        config.__retryCount++
        const delay = Math.min(2000 * Math.pow(2, config.__retryCount - 1), 30000)
        console.log(`[API] ${status || error.code} on ${config.url} — retry ${config.__retryCount}/${MAX_RETRY} in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return api(config)
    }
)

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    // [HOTFIX-2026-08-04] added — always send Authorization header
    return { Authorization: `Bearer ${token || ''}` }
}

// [fix/json-parse-400] id залогиненного пользователя из кэша сессии (user_profile), без падений
function getSessionUserId() {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('user_profile') : null
        const user = raw ? JSON.parse(raw) : null
        return user?._id || user?.id || null
    } catch {
        return null
    }
}

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    // [LANDING-RESTORE] опция timeout (мс): fetch прерывается через AbortSignal.timeout —
    // публичные данные лендинга не висят вечно на спящем/упавшем API
    const { noRetry = false, timeout, ...fetchOptions } = options
    const retryCount = options.__retryCount || 0
    const MAX_RETRY = 5

    console.log('[API] Request:', url, options.method || 'GET')

    let res
    try {
        res = await fetch(url, {
            ...fetchOptions,
            ...(timeout ? { signal: AbortSignal.timeout(timeout) } : {}),
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        })
    } catch (err) {
        // [MEGA-HOTFIX-2026-08-08] retry network failures with exponential backoff
        if (!noRetry && retryCount < MAX_RETRY) {
            const delay = Math.min(2000 * Math.pow(2, retryCount), 30000)
            console.warn(`[API] Network error on ${path}, retry ${retryCount + 1}/${MAX_RETRY} in ${delay}ms:`, err.message)
            await new Promise(r => setTimeout(r, delay))
            return request(path, { ...options, __retryCount: retryCount + 1 })
        }
        throw err
    }

    // [OWNER-REMOTE-CONTROL] техработы: 503 { maintenance: true } → полноэкранная заглушка, БЕЗ retry
    if (res.status === 503) {
        const body = await res.clone().json().catch(() => null)
        if (body?.maintenance === true) {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('avs:maintenance'))
            const error = new Error(body.error || 'Maintenance')
            error.status = 503
            error.maintenance = true
            throw error
        }
    }

    // [MEGA-HOTFIX-2026-08-08] retry 429 / 5xx before parsing body
    // [v9.9.19.7.1] one-time code endpoints (e.g. VK callback) must never retry
    const isRetryable = !noRetry && (res.status === 429 || (res.status >= 500 && res.status < 600))
    if (isRetryable && retryCount < MAX_RETRY) {
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000)
        console.warn(`[API] ${res.status} on ${path}, retry ${retryCount + 1}/${MAX_RETRY} in ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
        return request(path, { ...options, __retryCount: retryCount + 1 })
    }

    // 🔴 ЗАЩИТА: если сервер отдал HTML (404/502/503), не пытаемся парсить как JSON
    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text()
        console.error(`[API] Non-JSON from ${path}:`, text.slice(0, 150))
        throw new Error(`Сервер вернул HTML (${res.status}). Endpoint не существует или backend недоступен.`)
    }

    console.log('[API] Response status:', res.status)

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        const message = err.error || `HTTP ${res.status}`
        const error = new Error(message)
        error.status = res.status
        error.details = err.details || null
        error.hint = err.hint || null
        error.missing = err.missing || null
        // [CLIENT-JOURNEY-QA] тело data (quota/upsell) — для UpsellModal и гейтов тарифов
        error.data = err.data || null
        // [DOP-4] только настоящий 401 по статусу (regex по тексту ловил ложные срабатывания)
        if (res.status === 401) {
            console.warn('[API] 401 Unauthorized — redirecting to login')
            forceLogout()
        }
        throw error
    }

    return res.json()
}

// [DOP-4] Единая точка принудительного logout по 401.
// Выкидывает ТОЛЬКО при реальном статусе 401 и только если токен был
// (фоновый запрос без токена не должен сносить сессию); с публичных страниц — без редиректа.
function forceLogout() {
    if (typeof window === 'undefined') return
    const hadToken = !!localStorage.getItem('token')
    localStorage.removeItem('token')
    localStorage.removeItem('authToken')
    localStorage.removeItem('jwt')
    localStorage.removeItem('user_profile')
    const publicPaths = ['/', '/login', '/register', '/signup']
    if (hadToken && !publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login'
    }
}

// [19.17.5-UPLOAD-SCHEDULER] multipart/form-data requests (no JSON Content-Type)
async function requestForm(path, formData, options = {}) {
    const url = `${API_BASE}${path}`
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    console.log('[API] FormData request:', url, options.method || 'POST')

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        body: formData,
    })

    const contentType = res.headers.get('content-type')
    const data = contentType && contentType.includes('application/json')
        ? await res.json().catch(() => ({}))
        : {}

    if (!res.ok) {
        const message = data.error || data.message || `HTTP ${res.status}`
        const error = new Error(message)
        error.status = res.status
        error.code = data.code || null
        if (res.status === 401) forceLogout()
        throw error
    }

    return data
}

// ============================================
// Owner API
// ============================================
export const ownerApi = {
    overview: () => request('/owner/overview'),
    finance: () => request('/owner/finance'),
    team: () => request('/owner/team'),
    servers: () => request('/owner/servers'),
    integrations: () => request('/owner/integrations'),
    audit: (params = {}) => {
        const query = new URLSearchParams(params).toString()
        return request(`/owner/audit${query ? '?' + query : ''}`)
    },
    agents: () => request('/owner/agents'),
    promos: () => request('/owner/promos'),
    news: () => request('/owner/news'),
    subscriptions: () => request('/owner/subscriptions'),
    teamActivity: () => request('/owner/team-activity'),
    aiProviderStatus: () => request('/owner/ai-providers/status'),
    toggleAiProvider: (id, enabled) => request(`/owner/ai-providers/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
    }),
    adPricing: () => request('/owner/ad-pricing'),
    saveAdPricing: (data) => request('/owner/ad-pricing', {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    // [25-TARIFF-GATES] pricing management
    pricing: () => request('/owner/pricing'),
    pricingAnalysis: (what) => request(`/owner/pricing/analysis?what=${encodeURIComponent(what)}`),
    changePrice: (data) => request('/owner/pricing/change', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    pricingHistory: () => request('/owner/pricing/history'),
    // [PLANCONFIG-ADMIN] AI-советчик тарифов (реальные данные + рекомендации OMEGA)
    pricingAdvisor: () => request('/owner/pricing/advisor'),

    create: (entity, data) => request(`/owner/${entity}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (entity, id, data) => request(`/owner/${entity}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    remove: (entity, id) => request(`/owner/${entity}/${id}`, {
        method: 'DELETE',
    }),
}

// ============================================
// Owner Remote Control API [OWNER-REMOTE-CONTROL]
// ============================================
export const ownerControlApi = {
    flags: () => request('/owner/control/flags'),
    updateFlags: (patch) => request('/owner/control/flags', {
        method: 'PUT',
        body: JSON.stringify(patch),
    }),
    metrics: () => request('/owner/control/metrics'),
    refund: (identifier) => request('/owner/control/refund', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
    }),
    // [OWNER-OMEGA] продление подписки (паритет с TG «продли email на N дней»)
    extendPreview: (email) => request('/owner/control/extend-preview', {
        method: 'POST',
        body: JSON.stringify({ email }),
    }),
    extendSubscription: (userId, days) => request('/owner/control/extend-subscription', {
        method: 'POST',
        body: JSON.stringify({ userId, days }),
    }),
    telegramOwner: () => request('/owner/telegram-owner'),
    telegramSendCode: (chatId) => request('/owner/telegram-owner/send-code', {
        method: 'POST',
        body: JSON.stringify({ chatId }),
    }),
    telegramConfirm: (chatId, code) => request('/owner/telegram-owner/confirm', {
        method: 'POST',
        body: JSON.stringify({ chatId, code }),
    }),
}

// ============================================
// [OWNER-OMEGA] Сбор расходов лайт
// ============================================
export const ownerExpensesApi = {
    summary: () => request('/owner/expenses/summary'),
    upsertInfra: (payload) => request('/owner/expenses/infra', {
        method: 'PUT',
        body: JSON.stringify(payload),
    }),
    removeInfra: (service) => request(`/owner/expenses/infra/${encodeURIComponent(service)}`, { method: 'DELETE' }),
}

// ============================================
// [OWNER-OMEGA] Changelog-редактор (модалка обновлений)
// ============================================
export const ownerChangelogApi = {
    list: () => request('/owner/changelog'),
    create: (payload) => request('/owner/changelog', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    update: (id, payload) => request(`/owner/changelog/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    }),
    remove: (id) => request(`/owner/changelog/${id}`, { method: 'DELETE' }),
}

// ============================================
// OMEGA API
// ============================================
export const omegaApi = {
    status: () => request('/omega/status'),
    // [fix/json-parse-400] userId по умолчанию — из сессии (user_profile), а не null:
    // большинство вызовов (ChatTab владельца, виджет клиента, onboarding) userId не передают
    chat: (message, history = [], lang = 'ru', role = 'guest', userId) => request('/omega/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history, lang, userRole: role, userId: userId || getSessionUserId() }),
    }),
    getMemory: (query, limit) => {
        const params = new URLSearchParams()
        if (query) params.set('query', query)
        if (limit) params.set('limit', String(limit))
        return request(`/omega/memory${params.toString() ? '?' + params.toString() : ''}`)
    },
    createMemory: (data) => request('/omega/memory', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    skills: () => request('/omega/skills'),
    learnSkill: (skillId, ownerId) => request('/omega/skills/learn', {
        method: 'POST',
        body: JSON.stringify({ skillId, ownerId }),
    }),
    command: (command, params = {}) => request('/omega/command', {
        method: 'POST',
        body: JSON.stringify({ command, params }),
    }),
    rate: (memoryId, rating) => request('/omega/rate', {
        method: 'POST',
        body: JSON.stringify({ memoryId, rating }),
    }),
    templates: () => request('/omega/templates'),
    generateTemplate: (templateId, variables, autoExpand = true) => request('/omega/templates/' + templateId + '/generate', {
        method: 'POST',
        body: JSON.stringify({ templateId, variables, autoExpand }),
    }),
    analyzeBrandVoice: (texts, niche) => request('/omega/brand-voice/analyze', {
        method: 'POST',
        body: JSON.stringify({ texts, niche }),
    }),
    getBrandVoice: () => request('/omega/brand-voice'),
    toggleBrandVoice: (enabled) => request('/omega/brand-voice/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
    }),
    bestTime: (data) => request('/omega/best-time', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    scoutTrends: (niche, force = false) => {
        const params = new URLSearchParams()
        if (niche) params.set('niche', niche)
        if (force) params.set('force', 'true')
        return request(`/omega/scout/trends${params.toString() ? '?' + params.toString() : ''}`)
    },
    generateCover: (data) => request('/omega/generate-cover', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    // [VALUE-2026-08-04] added: structured video analysis endpoint
    analyzeVideo: (url, niche = 'контент', language = 'ru') => request('/omega/analyze-video', {
        method: 'POST',
        body: JSON.stringify({ url, niche, language }),
    }),
    interpret: (csvText, niche = '') => request('/omega/interpret', {
        method: 'POST',
        body: JSON.stringify({ csvText, niche }),
    }),
    visionAnalyze: (imageUrl) => request('/omega/vision/analyze', {
        method: 'POST',
        body: JSON.stringify({ imageUrl }),
    }),
    selfReflection: () => request('/omega/self-reflection'),
    videoGenerate: (data) => request('/omega/video/generate', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
}

// ============================================
// Launch / Waitlist API
// ============================================
export const launchApi = {
    joinWaitlist: (data) => request('/launch/waitlist', { method: 'POST', body: JSON.stringify(data) }),
    waitlistCount: () => request('/launch/waitlist/count'),
    waitlistPosition: (email) => request(`/launch/waitlist/position/${encodeURIComponent(email)}`),
    applyReferral: (email, referralCode) => request('/launch/waitlist/referral', { method: 'POST', body: JSON.stringify({ email, referralCode }) }),
    boost: (email, action) => request('/launch/waitlist/boost', { method: 'POST', body: JSON.stringify({ email, action }) }),
    betaSlots: (opts) => request('/launch/beta/slots', opts),
    foundingMembers: () => request('/launch/waitlist/founding-members'),
}

// ============================================
// [P1.6-PREP] PlanConfig (живые тарифы) + отзывы лендинга
// ============================================
export const planConfigApi = {
    // [LANDING-RESTORE] opts: лендинг передаёт { timeout, noRetry } — тарифы не висят спиннером
    list: (opts) => request('/plan-config', opts),
    update: (plan, payload) => request(`/plan-config/${encodeURIComponent(plan)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    // [PLANCONFIG-ADMIN] история изменений тарифа + откат + founding-настройки
    history: (plan, limit = 20) => request(`/plan-config/history?plan=${encodeURIComponent(plan || '')}&limit=${limit}`),
    rollback: (plan, logId) => request(`/plan-config/${encodeURIComponent(plan)}/rollback`, { method: 'POST', body: JSON.stringify({ logId }) }),
    updateFounding: (payload) => request('/plan-config/founding', { method: 'PUT', body: JSON.stringify(payload) }),
}

export const testimonialsApi = {
    list: (opts) => request('/testimonials', opts),
    listAll: () => request('/testimonials/all'),
    create: (data) => request('/testimonials', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/testimonials/${id}`, { method: 'DELETE' }),
}

// ============================================
// Demo API
// ============================================
export const demoApi = {
    generate: (niche, email) => request('/demo/generate', { method: 'POST', body: JSON.stringify({ niche, email }) }),
}

// ============================================
// Roadmap API
// ============================================
export const roadmapApi = {
    list: () => request('/roadmap'),
    vote: (featureId) => request(`/roadmap/${featureId}/vote`, { method: 'POST' }),
    top: () => request('/roadmap/top'),
}

// ============================================
// White-Label API
// ============================================
export const whiteLabelApi = {
    get: () => request('/white-label/me'),
    save: (data) => request('/white-label/me', { method: 'PUT', body: JSON.stringify(data) }),
    preview: (data) => request('/white-label/preview', { method: 'POST', body: JSON.stringify(data) }),
}

// ============================================
// Workspaces API
// ============================================
export const workspaceApi = {
    list: () => request('/workspaces'),
    create: (data) => request('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/workspaces/${id}`, { method: 'DELETE' }),
    setDefault: (id) => request(`/workspaces/${id}/default`, { method: 'POST' }),
}

// ============================================
// Developer / OMEGA B2B API
// ============================================
export const developerApi = {
    docs: () => request('/v1/omega/docs'),
    keys: () => request('/v1/omega/keys'),
    createKey: (data) => request('/v1/omega/keys', { method: 'POST', body: JSON.stringify(data) }),
    updateKey: (id, data) => request(`/v1/omega/keys/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteKey: (id) => request(`/v1/omega/keys/${id}`, { method: 'DELETE' }),
    addWebhook: (id, data) => request(`/v1/omega/keys/${id}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
    removeWebhook: (id, webhookId) => request(`/v1/omega/keys/${id}/webhooks/${webhookId}`, { method: 'DELETE' }),
}

// ============================================
// Integrations API
// ============================================
export const integrationsApi = {
    status: () => request('/integrations/status'),
    sendWhatsApp: (data) => request('/integrations/whatsapp/send', { method: 'POST', body: JSON.stringify(data) }),
    sendSlack: (data) => request('/integrations/slack/send', { method: 'POST', body: JSON.stringify(data) }),
    sendDiscord: (data) => request('/integrations/discord/send', { method: 'POST', body: JSON.stringify(data) }),
    createNotionPage: (data) => request('/integrations/notion/page', { method: 'POST', body: JSON.stringify(data) }),
    createClickUpTask: (data) => request('/integrations/clickup/task', { method: 'POST', body: JSON.stringify(data) }),
    createTrelloCard: (data) => request('/integrations/trello/card', { method: 'POST', body: JSON.stringify(data) }),
    getShopifyProducts: (limit = 10) => request(`/integrations/shopify/products?limit=${limit}`),
    webhooks: () => request('/integrations/webhooks'),
    createWebhook: (data) => request('/integrations/webhooks', { method: 'POST', body: JSON.stringify(data) }),
    updateWebhook: (id, data) => request(`/integrations/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteWebhook: (id) => request(`/integrations/webhooks/${id}`, { method: 'DELETE' }),
    triggerWebhooks: (event, payload) => request('/integrations/webhooks/trigger', { method: 'POST', body: JSON.stringify({ event, payload }) }),
}

// ============================================
// Analytics API
// ============================================
export const analyticsApi = {
    vectorStoreStatus: () => request('/analytics/vector-store/status'),
    clearVectorStore: () => request('/analytics/vector-store/clear', { method: 'DELETE' }),
}

// ============================================
// Subscriptions API
// ============================================
export const subscriptionsApi = {
    plans: (currency) => request(`/subscriptions/plans${currency ? `?currency=${currency}` : ''}`),
    current: () => request('/subscriptions/current'),
    history: () => request('/subscriptions/history'),
    create: (data) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    cancel: (id) => request(`/subscriptions/${id}/cancel`, { method: 'DELETE' }),
    trialEnding: () => request('/subscriptions/trial-ending'),
}

// ============================================
// Invoices API
// ============================================
export const invoicesApi = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString()
        return request(`/invoices${query ? '?' + query : ''}`)
    },
    get: (id) => request(`/invoices/${id}`),
    create: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    pay: (id) => request(`/invoices/${id}/pay`, { method: 'POST' }),
    delete: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
}

// ============================================
// Owner Requisites API
// ============================================
export const ownerRequisitesApi = {
    get: () => request('/owner-requisites'),
    save: (data) => request('/owner-requisites', { method: 'POST', body: JSON.stringify(data) }),
    delete: () => request('/owner-requisites', { method: 'DELETE' }),
}

// ============================================
// Owner Legal Info API
// ============================================
export const ownerLegalInfoApi = {
    get: () => request('/owner/legal-info'),
    save: (data) => request('/owner/legal-info', { method: 'PUT', body: JSON.stringify(data) }),
    public: (opts) => request('/owner/legal-info/public', opts),
}

// ============================================
// YooKassa API
// ============================================
export const yookassaApi = {
    paySubscription: (data) => request('/yookassa/pay/subscription', { method: 'POST', body: JSON.stringify(data) }),
    payInvoice: (invoiceId) => request(`/yookassa/pay/invoice/${invoiceId}`, { method: 'POST' }),
    check: (paymentId) => request(`/yookassa/check/${paymentId}`),
}

// ============================================
// Payments history API [19.13-lite-PAYMENTS-NPD]
// ============================================
export const paymentsApi = {
    history: () => request('/payments/history'),
    resendReceipt: (id) => request(`/payments/${id}/resend-receipt`, { method: 'POST' }),
    adminList: (params = {}) => {
        const qs = new URLSearchParams(params).toString()
        return request(`/payments/admin/list${qs ? `?${qs}` : ''}`)
    },
}

// ============================================
// Stripe API (prepared, disabled by default)
// ============================================
export const stripeApi = {
    status: () => request('/stripe/status'),
    paySubscription: (data) => request('/stripe/pay/subscription', { method: 'POST', body: JSON.stringify(data) }),
    payInvoice: (invoiceId) => request(`/stripe/pay/invoice/${invoiceId}`, { method: 'POST' }),
}

// ============================================
// PayPal API (prepared, disabled by default)
// ============================================
export const paypalApi = {
    status: () => request('/paypal/status'),
    createOrder: (data) => request('/paypal/create-order', { method: 'POST', body: JSON.stringify(data) }),
    capture: (orderId) => request('/paypal/capture', { method: 'POST', body: JSON.stringify({ orderId }) }),
}

// ============================================
// Email API
// ============================================
export const emailApi = {
    status: () => request('/email/status'),
    test: () => request('/email/test', { method: 'POST' }),
    trialEnding: () => request('/email/trial-ending', { method: 'POST' }),
}

// ============================================
// Physical World API (P11)
// ============================================
export const physicalApi = {
    qr: {
        list: () => request('/qr'),
        generate: (data) => request('/qr/generate', { method: 'POST', body: JSON.stringify(data) }),
        analytics: (id) => request(`/qr/${id}/analytics`),
        download: (id, format = 'png') => `${API_BASE}/qr/${id}/download?format=${format}`,
        delete: (id) => request(`/qr/${id}`, { method: 'DELETE' }),
    },
    print: {
        list: () => request('/print'),
        order: (data) => request('/print/order', { method: 'POST', body: JSON.stringify(data) }),
        status: (orderId) => request(`/print/status/${orderId}`),
    },
    booking: {
        studios: (params = {}) => {
            const query = new URLSearchParams(params).toString()
            return request(`/booking/studios${query ? '?' + query : ''}`)
        },
        suggestions: (niche) => request(`/booking/suggestions${niche ? `?niche=${encodeURIComponent(niche)}` : ''}`),
        list: () => request('/booking'),
        create: (data) => request('/booking', { method: 'POST', body: JSON.stringify(data) }),
        get: (id) => request(`/booking/${id}`),
    },
    delivery: {
        deepLink: (data) => request('/delivery/deep-link', { method: 'POST', body: JSON.stringify(data) }),
    },
}

export const franchiseApi = {
    ready: () => request('/franchise/ready'),
    list: () => request('/franchise'),
    generate: (data) => request('/franchise/generate', { method: 'POST', body: JSON.stringify(data) }),
    download: (id) => `${API_BASE}/franchise/${id}/download`,
    send: (id, recipients) => request(`/franchise/${id}/send`, { method: 'POST', body: JSON.stringify({ recipients }) }),
}

export const fleetApi = {
    summary: () => request('/fleet/summary'),
    emergencyStop: () => request('/fleet/emergency-stop', { method: 'POST' }),
    emergencyResume: (pin) => request('/admin/emergency-resume', { method: 'POST', body: JSON.stringify({ pin }) }),
}

// ============================================
// Self-Improvement API (P15)
// ============================================
export const selfImprovementApi = {
    templateStats: () => request('/self-improvement/templates/stats'),
    evolveTemplates: () => request('/self-improvement/templates/evolve', { method: 'POST' }),
    abEligible: () => request('/self-improvement/ab-learning/eligible'),
    abPropose: (postId) => request('/self-improvement/ab-learning/propose', { method: 'POST', body: JSON.stringify({ postId }) }),
    abApprove: (postId, choice) => request('/self-improvement/ab-learning/approve', { method: 'POST', body: JSON.stringify({ postId, choice }) }),
    abResolve: () => request('/self-improvement/ab-learning/resolve', { method: 'POST' }),
    churnMe: () => request('/self-improvement/churn/me'),
    churnAtRisk: (limit) => request(`/self-improvement/churn/at-risk${limit ? '?limit=' + limit : ''}`),
    churnOffer: (userId, day) => request(`/self-improvement/churn/offer/${userId}/${day}`),
    churnExitOffer: (userId) => request(`/self-improvement/churn/exit-offer/${userId}`),
    churnStats: () => request('/self-improvement/churn/stats'),
    nicheAggregate: () => request('/self-improvement/niche/aggregate'),
    nicheMe: () => request('/self-improvement/niche/me'),
}

// ============================================
// Monitoring API (P12: Self-Healing + Crisis + Self-Reflection)
// ============================================
export const monitoringApi = {
    selfHealingStatus: () => request('/monitoring/self-healing'),
    toggleAutoHeal: (enabled) => request('/monitoring/self-healing/auto-heal', { method: 'PUT', body: JSON.stringify({ enabled }) }),
    triggerSelfHeal: () => request('/monitoring/self-healing/trigger', { method: 'POST' }),
    listCrises: () => request('/monitoring/crises'),
    crisisSources: () => request('/monitoring/crises/sources'),
    analyzeCrisis: (data) => request('/monitoring/crises/analyze', { method: 'POST', body: JSON.stringify(data) }),
    resolveCrisis: (id, response, autoActions = []) => request(`/monitoring/crises/${id}/resolve`, { method: 'POST', body: JSON.stringify({ response, autoActions }) }),
    rejectCrisis: (id) => request(`/monitoring/crises/${id}/reject`, { method: 'POST' }),
    selfReflectionReport: () => request('/monitoring/self-reflection'),
    sendSelfReflectionReport: () => request('/monitoring/self-reflection/send', { method: 'POST' }),
}

// [v6.5.5] scheduled posts
export const scheduledPostsApi = {
    list: () => request('/scheduled-posts'),
    create: (data) => request('/scheduled-posts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/scheduled-posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id) => request(`/scheduled-posts/${id}`, { method: 'DELETE' }),
    delete: (id) => request(`/scheduled-posts/${id}`, { method: 'DELETE' }),
    pause: (id) => request(`/scheduled-posts/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paused' }) }),
    resume: (id) => request(`/scheduled-posts/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'scheduled' }) }),
    // [v9.9.19.15.10] no retry on publish to avoid duplicate wall.posts
    publish: (id, platforms) => request(`/scheduled-posts/${id}/publish`, { method: 'POST', body: JSON.stringify({ platforms }), noRetry: true }),
    publishNow: (id, platforms) => scheduledPostsApi.publish(id, platforms),
}

// ============================================
// AI Video API [v8.0-PART1]
// ============================================
export const videoApi = {
    create: (data) => request('/video/create', { method: 'POST', body: JSON.stringify(data) }),
    status: (jobId) => request(`/video/status/${jobId}`),
    list: () => request('/video/list'),
}

// ============================================
// Voice API [v8.0-PART1]
// ============================================
export const voiceApi = {
    voices: () => request('/voice/voices'),
    speak: (text, voice = 'ru-RU-female') => request('/voice/speak', { method: 'POST', body: JSON.stringify({ text, voice }) }),
    transcribe: (file) => {
        const formData = new FormData()
        formData.append('audio', file)
        return fetch(`${API_BASE}/voice/transcribe`, { method: 'POST', headers: getAuthHeaders(), body: formData }).then(r => r.json())
    },
    saveSettings: (settings) => request('/voice/users/me/voice-settings', { method: 'PATCH', body: JSON.stringify(settings) }),
}

// ============================================
// Neuro-Sales API [v8.0-PART1]
// ============================================
export const neuroSalesApi = {
    analyze: (text) => request('/analytics/neuro-sales/analyze', { method: 'POST', body: JSON.stringify({ text }) }),
    history: () => request('/analytics/neuro-sales/history'),
}

// ============================================
// YouTube API [v9.9.19.17.4]
// ============================================
export const youtubeApi = {
    status: () => request('/youtube/status'),
    connectUrl: (redirect = '') => request(`/youtube/auth-url${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`),
    disconnect: () => request('/youtube/disconnect', { method: 'POST' }),
    // [19.17.5-UPLOAD-SCHEDULER] upload video (multipart), list, delete, schedule
    upload: (formData) => requestForm('/youtube/upload', formData, { method: 'POST' }),
    videos: () => request('/youtube/videos'),
    deleteVideo: (id) => request(`/youtube/videos/${id}`, { method: 'DELETE' }),
    schedule: (formData) => requestForm('/scheduled-posts/youtube', formData, { method: 'POST' }),
    // [19.17.9-DIRECT-UPLOAD] resumable direct upload (browser → YouTube)
    // noRetry: quota 429 / duplicate 409 must reach the UI immediately, not after 5 backoffs
    createUploadSession: (payload) => request('/youtube/upload-session', { method: 'POST', body: JSON.stringify(payload), noRetry: true }),
    getUploadSession: (id) => request(`/youtube/upload-session/${id}`, { noRetry: true }),
    completeUploadSession: (id, formData) => requestForm(`/youtube/upload-session/${id}/complete`, formData, { method: 'POST' }),
    getProcessing: (id) => request(`/youtube/videos/${id}/processing`, { noRetry: true }),
    playlists: () => request('/youtube/playlists'),
    aiMeta: (payload) => request('/youtube/ai-meta', { method: 'POST', body: JSON.stringify(payload) }),
}

// ============================================
// [19.17.9-DIRECT-UPLOAD] resumable upload helpers (browser → Google directly)
// ============================================
export const YT_DIRECT_CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB — multiple of 256 KB per Google spec
export const YT_DIRECT_MAX_SIZE = 20 * 1024 * 1024 * 1024 // 20 GB
export const YT_DIRECT_MIN_SIZE = 100 * 1024 * 1024 // >100 MB goes direct, ≤100 MB — old multipart path

// SHA-256 of the first + last MB — duplicate guard without reading a 20 GB file whole
export async function computeYtFileHash(file) {
    const MB = 1024 * 1024
    const firstBuf = await file.slice(0, MB).arrayBuffer()
    const lastBuf = file.size > MB ? await file.slice(file.size - MB).arrayBuffer() : new ArrayBuffer(0)
    const merged = new Uint8Array(firstBuf.byteLength + lastBuf.byteLength)
    merged.set(new Uint8Array(firstBuf), 0)
    merged.set(new Uint8Array(lastBuf), firstBuf.byteLength)
    const digest = await crypto.subtle.digest('SHA-256', merged)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Ask Google how many bytes it already has (resume after a break)
export async function queryResumablePosition(uploadUrl, totalSize, signal) {
    const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes */${totalSize}` },
        body: new Blob([]),
        signal,
    })
    if (res.status === 308) {
        const range = res.headers.get('Range') || res.headers.get('range') || ''
        const m = /bytes=0-(\d+)/.exec(range)
        // Range may be hidden by CORS on some setups — null means "unknown, keep client position"
        return m ? Number(m[1]) + 1 : null
    }
    if (res.status === 200 || res.status === 201) return totalSize // already fully uploaded
    return null
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Chunked PUT loop with per-chunk retry. onProgress({uploaded, total, chunkBytes, chunkMs})
export async function uploadFileResumable({ file, uploadUrl, startByte = 0, onProgress, signal }) {
    const total = file.size
    let offset = startByte

    const throwIfAborted = () => {
        if (signal?.aborted) {
            const err = new Error('aborted')
            err.code = 'aborted'
            throw err
        }
    }

    while (offset < total) {
        throwIfAborted()
        let attempts = 0
        let res = null

        while (true) {
            const end = Math.min(offset + YT_DIRECT_CHUNK_SIZE, total) - 1
            const chunk = file.slice(offset, end + 1)
            const chunkStart = Date.now()
            try {
                res = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Range': `bytes ${offset}-${end}/${total}` },
                    body: chunk,
                    signal,
                })
                if (res.status === 308 || res.status === 200 || res.status === 201) {
                    onProgress?.({ uploaded: res.status === 308 ? end + 1 : total, total, chunkBytes: chunk.size, chunkMs: Date.now() - chunkStart })
                }
            } catch (err) {
                if (signal?.aborted) throw err
                res = null // network failure — retry below
            }

            // Retryable: network error or Google 5xx
            if (res == null || res.status >= 500) {
                attempts++
                if (attempts > 5) {
                    if (res == null) throw new Error('network_error')
                    break // fall through to error parsing with the last response
                }
                await sleep(Math.min(2000 * Math.pow(2, attempts), 15000))
                throwIfAborted()
                // The chunk may have partially arrived — re-sync with the server position
                try {
                    const pos = await queryResumablePosition(uploadUrl, total, signal)
                    if (pos != null && pos !== offset) offset = pos
                } catch { /* keep client-side position */ }
                if (offset >= total) return {} // server finished without us seeing the body (rare)
                continue
            }
            break
        }

        if (res.status === 308) {
            offset = Math.min(offset + YT_DIRECT_CHUNK_SIZE, total)
            continue
        }
        if (res.status === 200 || res.status === 201) {
            return await res.json().catch(() => ({}))
        }
        let message = `HTTP ${res.status}`
        let reason = ''
        try {
            const errBody = await res.json()
            message = errBody?.error?.message || message
            reason = errBody?.error?.errors?.[0]?.reason || ''
        } catch { /* non-JSON error body */ }
        const error = new Error(message)
        error.status = res.status
        error.reason = reason
        throw error
    }
    return {}
}

// ============================================
// Default export (kept for compatibility)
// ============================================
export { request }

export default {
    api,
    ownerApi,
    ownerControlApi,
    omegaApi,
    launchApi,
    demoApi,
    roadmapApi,
    whiteLabelApi,
    workspaceApi,
    developerApi,
    integrationsApi,
    analyticsApi,
    subscriptionsApi,
    invoicesApi,
    ownerRequisitesApi,
    ownerLegalInfoApi,
    yookassaApi,
    stripeApi,
    paypalApi,
    emailApi,
    physicalApi,
    franchiseApi,
    fleetApi,
    selfImprovementApi,
    monitoringApi,
    scheduledPostsApi,
    youtubeApi,
}
