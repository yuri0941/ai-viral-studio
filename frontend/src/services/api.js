// ============================================
// API Service — обёртки для backend эндпоинтов
// ============================================

const API_BASE = '/api'

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
    chat: (message, history = []) => request('/omega/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
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
}

export default { ownerApi, omegaApi }

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
// Email API
// ============================================
export const emailApi = {
    status: () => request('/email/status'),
    test: () => request('/email/test', { method: 'POST' }),
    trialEnding: () => request('/email/trial-ending', { method: 'POST' }),
}
