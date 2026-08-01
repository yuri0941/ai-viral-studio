// ============================================
// API Service — обёртки для backend эндпоинтов
// ============================================

import { API_URL } from '../config.js'

const API_BASE = API_URL

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers,
        },
        ...options,
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
    }

    return res.json()
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
// OMEGA API
// ============================================
export const omegaApi = {
    status: () => request('/omega/status'),
    chat: (message, history = [], lang = 'ru') => request('/omega/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history, lang }),
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
    public: () => request('/owner/legal-info/public'),
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
        download: (id, format = 'png') => `/api/qr/${id}/download?format=${format}`,
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
    download: (id) => `/api/franchise/${id}/download`,
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

// ============================================
// Default export (kept for compatibility)
// ============================================
export default {
    ownerApi,
    omegaApi,
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
}
