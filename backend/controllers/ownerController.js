import {
    INITIAL_STAFF,
    INITIAL_CABINETS,
    INITIAL_SERVERS,
    INITIAL_PAYMENTS,
    INITIAL_AUDIT_LOGS,
    INITIAL_SUBSCRIPTIONS,
    INITIAL_INTEGRATIONS,
    INITIAL_PROMOS,
    INITIAL_NEWS,
    INITIAL_AI_ANALYTICS,
} from '../data/ownerMockData.js'

import {
    Payment,
    Campaign,
    SubscriptionPlan,
    AuditLog,
    Server,
    Integration,
    AIAgent,
    Promo,
    News,
    ChatMessage,
    Banner,
    AdRequest,
    Notification,
} from '../models/index.js'

// ============================================
// HELPERS
// ============================================

function handleError(res, err, fallback) {
    console.error('[ownerController]', err.message)
    if (fallback) {
        return res.json({ status: 'success', data: fallback, source: 'fallback' })
    }
    return res.status(500).json({ status: 'error', message: err.message })
}

async function safeFind(model, filter = {}, fallback = []) {
    try {
        if (!model) return fallback
        const docs = await model.find(filter).sort({ createdAt: -1 }).lean()
        return docs.length > 0 ? docs : fallback
    } catch {
        return fallback
    }
}

function getFinanceStats(payments = []) {
    const income = payments.filter(p => p.type === 'income').reduce((a, b) => a + (b.amount || 0), 0)
    const expense = payments.filter(p => p.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0)
    return { income, expense, profit: income - expense }
}

// ============================================
// OVERVIEW
// ============================================
export async function getOverview(req, res) {
    try {
        const payments = await safeFind(Payment, {}, INITIAL_PAYMENTS)
        const subscriptions = await safeFind(SubscriptionPlan, {}, INITIAL_SUBSCRIPTIONS)
        const servers = await safeFind(Server, {}, INITIAL_SERVERS)
        const auditLogs = await safeFind(AuditLog, {}, INITIAL_AUDIT_LOGS)
        const staff = await safeFind(null, {}, INITIAL_STAFF)

        const totalUsers = subscriptions.reduce((a, b) => a + (b.users || 0), 0)
        const mrr = subscriptions.reduce((a, b) => a + ((b.price || 0) * (b.users || 0)), 0)
        const activeServers = servers.filter(s => s.status === 'online').length
        const { income, expense, profit } = getFinanceStats(payments)

        res.json({
            status: 'success',
            data: {
                totalUsers,
                mrr,
                activeServers,
                totalServers: servers.length,
                totalStaff: staff.length,
                activeCabinets: INITIAL_CABINETS.filter(c => c.status === 'active').length,
                income,
                expense,
                profit,
                recentActivity: auditLogs.slice(0, 5),
            },
        })
    } catch (err) {
        handleError(res, err, {
            totalUsers: 0,
            mrr: 0,
            activeServers: 0,
            totalServers: 0,
            totalStaff: 0,
            activeCabinets: 0,
            income: 0,
            expense: 0,
            profit: 0,
            recentActivity: [],
        })
    }
}

// ============================================
// FINANCE
// ============================================
export async function getFinance(req, res) {
    try {
        const payments = await safeFind(Payment, {}, INITIAL_PAYMENTS)
        const stats = getFinanceStats(payments)
        res.json({ status: 'success', data: { payments, ...stats } })
    } catch (err) {
        handleError(res, err, { payments: INITIAL_PAYMENTS, ...getFinanceStats(INITIAL_PAYMENTS) })
    }
}

// ============================================
// TEAM
// ============================================
export async function getTeam(req, res) {
    try {
        const staff = await safeFind(null, {}, INITIAL_STAFF)
        const cabinets = await safeFind(null, {}, INITIAL_CABINETS)
        res.json({ status: 'success', data: { staff, cabinets } })
    } catch (err) {
        handleError(res, err, { staff: INITIAL_STAFF, cabinets: INITIAL_CABINETS })
    }
}

// ============================================
// SERVERS
// ============================================
export async function getServers(req, res) {
    try {
        const servers = await safeFind(Server, {}, INITIAL_SERVERS)
        res.json({ status: 'success', data: { servers } })
    } catch (err) {
        handleError(res, err, { servers: INITIAL_SERVERS })
    }
}

// ============================================
// INTEGRATIONS
// ============================================
export async function getIntegrations(req, res) {
    try {
        const integrations = await safeFind(Integration, {}, INITIAL_INTEGRATIONS)
        res.json({ status: 'success', data: { integrations } })
    } catch (err) {
        handleError(res, err, { integrations: INITIAL_INTEGRATIONS })
    }
}

// ============================================
// AUDIT
// ============================================
export async function getAudit(req, res) {
    try {
        const { type, severity, limit = 50, page = 1 } = req.query
        const filter = {}
        if (type) filter.type = type
        if (severity) filter.severity = severity

        const logs = await safeFind(AuditLog, filter, INITIAL_AUDIT_LOGS)
        const start = (page - 1) * limit
        const paginated = logs.slice(start, start + Number(limit))

        res.json({
            status: 'success',
            data: {
                logs: paginated,
                total: logs.length,
                page: Number(page),
                limit: Number(limit),
            },
        })
    } catch (err) {
        handleError(res, err, { logs: INITIAL_AUDIT_LOGS.slice(0, 50), total: INITIAL_AUDIT_LOGS.length, page: 1, limit: 50 })
    }
}

// ============================================
// AGENTS
// ============================================
export async function getAgents(req, res) {
    try {
        const agents = await safeFind(AIAgent, {}, INITIAL_AI_ANALYTICS.agents || [])
        res.json({ status: 'success', data: { agents } })
    } catch (err) {
        handleError(res, err, { agents: [] })
    }
}

// ============================================
// PROMOS
// ============================================
export async function getPromos(req, res) {
    try {
        const promos = await safeFind(Promo, {}, INITIAL_PROMOS)
        res.json({ status: 'success', data: { promos } })
    } catch (err) {
        handleError(res, err, { promos: INITIAL_PROMOS })
    }
}

// ============================================
// NEWS
// ============================================
export async function getNews(req, res) {
    try {
        const news = await safeFind(News, {}, INITIAL_NEWS)
        res.json({ status: 'success', data: { news } })
    } catch (err) {
        handleError(res, err, { news: INITIAL_NEWS })
    }
}

// ============================================
// SUBSCRIPTIONS
// ============================================
export async function getSubscriptions(req, res) {
    try {
        const subscriptions = await safeFind(SubscriptionPlan, {}, INITIAL_SUBSCRIPTIONS)
        res.json({ status: 'success', data: { subscriptions } })
    } catch (err) {
        handleError(res, err, { subscriptions: INITIAL_SUBSCRIPTIONS })
    }
}

// ============================================
// GENERIC CRUD
// ============================================
const ENTITY_MAP = {
    payments: Payment,
    campaigns: Campaign,
    subscriptions: SubscriptionPlan,
    audit: AuditLog,
    servers: Server,
    integrations: Integration,
    agents: AIAgent,
    promos: Promo,
    news: News,
    chat: ChatMessage,
    banners: Banner,
    adrequests: AdRequest,
    notifications: Notification,
}

export async function createEntity(req, res) {
    try {
        const { entity } = req.params
        const Model = ENTITY_MAP[entity]
        if (!Model) return res.status(400).json({ status: 'error', message: `Unknown entity: ${entity}` })

        const doc = new Model(req.body)
        await doc.save()
        res.json({ status: 'success', data: doc })
    } catch (err) {
        handleError(res, err)
    }
}

export async function updateEntity(req, res) {
    try {
        const { entity, id } = req.params
        const Model = ENTITY_MAP[entity]
        if (!Model) return res.status(400).json({ status: 'error', message: `Unknown entity: ${entity}` })

        const doc = await Model.findByIdAndUpdate(id, req.body, { new: true })
        if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: doc })
    } catch (err) {
        handleError(res, err)
    }
}

export async function deleteEntity(req, res) {
    try {
        const { entity, id } = req.params
        const Model = ENTITY_MAP[entity]
        if (!Model) return res.status(400).json({ status: 'error', message: `Unknown entity: ${entity}` })

        const doc = await Model.findByIdAndDelete(id)
        if (!doc) return res.status(404).json({ status: 'error', message: 'Not found' })
        res.json({ status: 'success', data: { deleted: true } })
    } catch (err) {
        handleError(res, err)
    }
}
