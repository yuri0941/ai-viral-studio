// [REAL-DATA] Owner Dashboard API — только реальные данные из БД.
// Мок-фолбэки (ownerFallbackData) удалены: нет данных → честные 0 / пустые массивы.

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
import User from '../models/User.js'
import PlanConfig from '../models/PlanConfig.js'
import { calcMRR, getFunnel } from '../services/metricsService.js'
import { getExpensesSummary } from '../services/expenseTracker.js'

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

import { getJSON, setJSON, cacheKey } from '../config/redis.js'

async function safeFind(model, filter = {}, limit = 100) {
    try {
        if (!model) return []
        return await model.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
    } catch {
        return []
    }
}

const PLAN_COLORS = {
    free: '#6b7280',
    starter: '#2563eb',
    creator: '#2563eb',
    pro: '#8b5cf6',
    business: '#0ea5e9',
    agency: '#00ff41',
    enterprise: '#f0883e',
}

function mapPayment(p) {
    return {
        id: p._id,
        date: p.createdAt,
        amount: p.amount || 0,
        currency: p.currency || 'RUB',
        type: 'income',
        source: p.description || p.planId || 'Платёж',
        status: p.status === 'succeeded' ? 'completed' : p.status,
    }
}

// ============================================
// OVERVIEW — реальные агрегаты: User / Subscription (MRR) / Payment / InfraExpense
// ============================================
export async function getOverview(req, res) {
    try {
        const cache = await getJSON(cacheKey('owner:overview', 'global'))
        if (cache) return res.json({ status: 'success', data: cache, cached: true })

        const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
        const [totalUsers, totalStaff, totalServers, activeServers, incomeAgg, auditLogs, { mrr, paying }, funnel7d, expenses] = await Promise.all([
            User.countDocuments({ status: { $ne: 'deleted' }, isTestAccount: { $ne: true } }),
            User.countDocuments({ role: { $in: ['admin', 'staff', 'developer'] }, status: { $ne: 'deleted' } }),
            Server ? Server.countDocuments().catch(() => 0) : 0,
            Server ? Server.countDocuments({ status: 'online' }).catch(() => 0) : 0,
            Payment.aggregate([
                { $match: { status: 'succeeded', createdAt: { $gte: since30 } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]).catch(() => []),
            safeFind(AuditLog, {}, 5),
            calcMRR(),
            getFunnel(7),
            getExpensesSummary().catch(() => null),
        ])

        const income = Math.round(incomeAgg?.[0]?.total || 0)
        const expense = Math.round(expenses?.infraTotalRub || 0)
        const aiCostUsdMonth = expenses?.ai?.month?.costUsd || 0

        const data = {
            totalUsers,
            mrr,
            paying,
            activeServers,
            totalServers,
            totalStaff,
            activeCabinets: 0,
            income,
            expense,
            profit: income - expense,
            aiCostUsdMonth,
            aiCallsMonth: expenses?.ai?.month?.calls || 0,
            funnel7d,
            recentActivity: auditLogs,
        }

        await setJSON(cacheKey('owner:overview', 'global'), data, 120)

        res.json({ status: 'success', data })
    } catch (err) {
        handleError(res, err, {
            totalUsers: 0,
            mrr: 0,
            paying: 0,
            activeServers: 0,
            totalServers: 0,
            totalStaff: 0,
            activeCabinets: 0,
            income: 0,
            expense: 0,
            profit: 0,
            aiCostUsdMonth: 0,
            funnel7d: null,
            recentActivity: [],
        })
    }
}

// ============================================
// FINANCE — реальные платежи (Payment) + расходы инфраструктуры (InfraExpense)
// ============================================
export async function getFinance(req, res) {
    try {
        const [payments, expenses] = await Promise.all([
            safeFind(Payment, {}, 200),
            getExpensesSummary().catch(() => null),
        ])
        const mapped = payments.map(mapPayment)
        const income = mapped.filter(p => p.status === 'completed').reduce((a, b) => a + b.amount, 0)
        const expense = Math.round(expenses?.infraTotalRub || 0)
        res.json({
            status: 'success',
            data: {
                payments: mapped,
                income,
                expense,
                profit: income - expense,
                aiCostUsdMonth: expenses?.ai?.month?.costUsd || 0,
                infra: expenses?.infra || [],
            },
        })
    } catch (err) {
        handleError(res, err, { payments: [], income: 0, expense: 0, profit: 0, aiCostUsdMonth: 0, infra: [] })
    }
}

// ============================================
// TEAM — staff = реальные пользователи со staff-ролями; кабинетов в БД нет → []
// ============================================
export async function getTeam(req, res) {
    try {
        const users = await User.find({ role: { $in: ['admin', 'staff', 'developer'] }, status: { $ne: 'deleted' } })
            .sort({ createdAt: -1 }).limit(100).lean()
        const staff = users.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.role,
            status: u.isActive ? 'active' : 'paused',
            tasksCompleted: 0,
            load: 0,
            skills: [],
            joined: u.createdAt,
            lastActive: u.lastLoginAt || u.updatedAt || '',
            avatar: (u.name || '?').slice(0, 1).toUpperCase(),
        }))
        res.json({ status: 'success', data: { staff, cabinets: [] } })
    } catch (err) {
        handleError(res, err, { staff: [], cabinets: [] })
    }
}

// ============================================
// SERVERS — только реальные записи Server; нет → []
// ============================================
export async function getServers(req, res) {
    try {
        const servers = await safeFind(Server, {})
        res.json({ status: 'success', data: { servers } })
    } catch (err) {
        handleError(res, err, { servers: [] })
    }
}

// ============================================
// INTEGRATIONS — только реальные записи Integration; нет → []
// ============================================
export async function getIntegrations(req, res) {
    try {
        const integrations = await safeFind(Integration, {})
        res.json({ status: 'success', data: { integrations } })
    } catch (err) {
        handleError(res, err, { integrations: [] })
    }
}

// ============================================
// AUDIT — реальные AuditLog; нет → []
// ============================================
export async function getAudit(req, res) {
    try {
        const { type, severity, limit = 50, page = 1 } = req.query
        const filter = {}
        if (type) filter.type = type
        if (severity) filter.severity = severity

        const logs = await safeFind(AuditLog, filter, 500)
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
        handleError(res, err, { logs: [], total: 0, page: 1, limit: 50 })
    }
}

// ============================================
// AGENTS — реальные AIAgent; нет → []
// ============================================
export async function getAgents(req, res) {
    try {
        const agents = await safeFind(AIAgent, {})
        res.json({ status: 'success', data: { agents } })
    } catch (err) {
        handleError(res, err, { agents: [] })
    }
}

// ============================================
// PROMOS — реальные Promo; нет → []
// ============================================
export async function getPromos(req, res) {
    try {
        const promos = await safeFind(Promo, {})
        res.json({ status: 'success', data: { promos } })
    } catch (err) {
        handleError(res, err, { promos: [] })
    }
}

// ============================================
// NEWS — реальные News; нет → []
// ============================================
export async function getNews(req, res) {
    try {
        const news = await safeFind(News, {})
        res.json({ status: 'success', data: { news } })
    } catch (err) {
        handleError(res, err, { news: [] })
    }
}

// ============================================
// SUBSCRIPTIONS — реальные PlanConfig + фактические счётчики пользователей по тарифам
// ============================================
export async function getSubscriptions(req, res) {
    try {
        const [plans, counts] = await Promise.all([
            PlanConfig.getAll(),
            User.aggregate([
                { $match: { status: { $ne: 'deleted' }, isTestAccount: { $ne: true } } },
                { $group: { _id: '$subscription', users: { $sum: 1 } } },
            ]).catch(() => []),
        ])
        const countByPlan = Object.fromEntries((counts || []).map(c => [c._id || 'free', c.users]))
        const subscriptions = plans.map(p => ({
            id: p.plan,
            name: (p.plan || '').replace(/^./, c => c.toUpperCase()),
            price: p.price ?? 0,
            currency: p.currency || 'RUB',
            users: countByPlan[p.plan] || 0,
            color: PLAN_COLORS[p.plan] || '#2563eb',
            features: p.featureList?.ru?.length ? p.featureList.ru : [],
        }))
        res.json({ status: 'success', data: { subscriptions } })
    } catch (err) {
        handleError(res, err, { subscriptions: [] })
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
