import { useState, useEffect, useCallback, useRef } from 'react'
import { generateId, debounce, exportToCSV, exportToJSON } from '../utils/helpers'
import { ownerApi, request } from '../../../services/api'

// [REAL-DATA] Никаких моков: стартовое состояние — пустое, источник истины — API.
// API отдаёт авторитетные массивы (включая пустые) — они заменяют localStorage-кэш.

const STORAGE_KEYS = {
    staff: 'owner_employees',
    cabinets: 'owner_cabinets',
    subscriptions: 'owner_subscriptions',
    servers: 'owner_servers',
    payments: 'owner_payments',
    audit: 'owner_audit_logs',
    promos: 'owner_promos',
    news: 'owner_news',
    referrals: 'owner_referrals',
    campaigns: 'owner_campaigns',
    security: 'owner_security',
    integrations: 'owner_integrations',
    aiAnalytics: 'owner_ai_analytics',
    logs: 'owner_system_logs',
    company: 'owner_company',
    withdraw: 'owner_withdraw_requisites',
    agents: 'owner_ai_agents',
    chats: 'owner_chats',
    activeTab: 'owner_active_tab',
    notifications: 'owner_notifications',
}

const EMPTY_SECURITY = {
    twoFactorEnabled: false,
    activeSessions: [],
    loginHistory: [],
    alerts: [],
}

const EMPTY_WITHDRAW_REQUISITES = {
    legal: { companyName: '', inn: '', kpp: '', rs: '', bik: '', bank: '' },
    ip: { fullName: '', inn: '', ogrnip: '', rs: '', bik: '', bank: '' },
    card: { cardNumber: '', cardHolder: '', bank: '' },
    international: { iban: '', swift: '', bankName: '', bankAddress: '', country: '', beneficiaryName: '' },
    crypto: { walletAddress: '', network: 'TRC20', currency: 'USDT' },
    paypal: { email: '' }
}

// [REAL-DATA] Ключи, для которых localStorage-кэш запрещён — там раньше лежали моки.
// Эти сущности живут только в state и наполняются из API.
const NO_CACHE_KEYS = new Set([
    'staff', 'cabinets', 'subscriptions', 'servers', 'payments', 'audit',
    'promos', 'news', 'referrals', 'campaigns', 'security', 'integrations',
    'aiAnalytics', 'logs', 'agents',
])

function loadFromStorage(key, fallback) {
    if (NO_CACHE_KEYS.has(key)) return fallback
    try {
        const saved = localStorage.getItem(STORAGE_KEYS[key])
        return saved ? JSON.parse(saved) : fallback
    } catch {
        return fallback
    }
}

function saveToStorage(key, data) {
    if (NO_CACHE_KEYS.has(key)) return
    try {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
    } catch (e) {
        console.warn(`Failed to save ${key}:`, e)
    }
}

function normalizeSubscriptions(subs) {
    if (!Array.isArray(subs)) return []
    return subs.map(s => s.name === 'Free' ? { ...s, price: 0 } : s)
}

// ============================================
// USE OWNER DATA — единый мозг дашборда
// ============================================
export function useOwnerData() {
    // --- Core Data (честные пустые старты; наполняются из API) ---
    const [staff, setStaff] = useState([])
    const [cabinets, setCabinets] = useState([])
    const [subscriptions, setSubscriptions] = useState([])
    const [servers, setServers] = useState([])
    const [payments, setPayments] = useState([])
    const [auditLogs, setAuditLogs] = useState([])
    const [promos, setPromos] = useState([])
    const [news, setNews] = useState([])
    const [referrals, setReferrals] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [security, setSecurity] = useState(EMPTY_SECURITY)
    const [integrations, setIntegrations] = useState([])
    const [aiAnalytics, setAiAnalytics] = useState(null)
    const [systemLogs, setSystemLogs] = useState([])
    const [company, setCompany] = useState(() => loadFromStorage('company', null))
    const [withdrawRequisites, setWithdrawRequisites] = useState(() => loadFromStorage('withdraw', EMPTY_WITHDRAW_REQUISITES))
    const [agents, setAgents] = useState([])
    const [chats, setChats] = useState(() => loadFromStorage('chats', []))
    const [notifications, setNotifications] = useState(() => loadFromStorage('notifications', []))

    // --- UI State ---
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('owner_active_tab') || 'overview')
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [toasts, setToasts] = useState([])
    const [modal, setModal] = useState(null) // { type: 'addStaff' | 'editStaff' | ... , data? }
    const [showPassword, setShowPassword] = useState(false)
    const [editingPrice, setEditingPrice] = useState(null)
    const [isYearly, setIsYearly] = useState(false)

    // ============================================
    // API LOAD — API авторитетен: пришёл пустой массив → показываем пусто
    // ============================================
    const loadFromApi = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [
                overviewRes,
                financeRes,
                teamRes,
                serversRes,
                subscriptionsRes,
                integrationsRes,
                auditRes,
                promosRes,
                newsRes,
                agentsRes,
            ] = await Promise.allSettled([
                ownerApi.overview(),
                ownerApi.finance(),
                ownerApi.team(),
                ownerApi.servers(),
                ownerApi.subscriptions(),
                ownerApi.integrations(),
                ownerApi.audit(),
                ownerApi.promos(),
                ownerApi.news(),
                ownerApi.agents(),
            ])

            if (overviewRes.status === 'fulfilled') {
                const d = overviewRes.value.data
                setAuditLogs(Array.isArray(d.recentActivity) ? d.recentActivity : [])
            }
            if (financeRes.status === 'fulfilled') {
                const d = financeRes.value.data
                setPayments(Array.isArray(d.payments) ? d.payments : [])
            }
            if (teamRes.status === 'fulfilled') {
                const d = teamRes.value.data
                setStaff(Array.isArray(d.staff) ? d.staff : [])
                setCabinets(Array.isArray(d.cabinets) ? d.cabinets : [])
            }
            if (serversRes.status === 'fulfilled') {
                const d = serversRes.value.data
                setServers(Array.isArray(d.servers) ? d.servers : [])
            }
            if (subscriptionsRes.status === 'fulfilled') {
                const d = subscriptionsRes.value.data
                setSubscriptions(normalizeSubscriptions(d.subscriptions))
            }
            if (integrationsRes.status === 'fulfilled') {
                const d = integrationsRes.value.data
                setIntegrations(Array.isArray(d.integrations) ? d.integrations : [])
            }
            if (auditRes.status === 'fulfilled') {
                const d = auditRes.value.data
                setAuditLogs(Array.isArray(d.logs) ? d.logs : [])
            }
            if (promosRes.status === 'fulfilled') {
                const d = promosRes.value.data
                setPromos(Array.isArray(d.promos) ? d.promos : [])
            }
            if (newsRes.status === 'fulfilled') {
                const d = newsRes.value.data
                setNews(Array.isArray(d.news) ? d.news : [])
            }
            if (agentsRes.status === 'fulfilled') {
                const d = agentsRes.value.data
                // [REAL-DATA] документы Mongo имеют _id — нормализуем в id для карточек
                setAgents(Array.isArray(d.agents) ? d.agents.map(a => ({ ...a, id: a.id || a._id })) : [])
            }
        } catch (err) {
            setError(err.message)
            console.warn('[useOwnerData] API load failed:', err.message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadFromApi()
    }, [loadFromApi])

    const refetch = useCallback(() => loadFromApi(), [loadFromApi])

    // --- Chat State ---
    const [activeChat, setActiveChat] = useState(null) // { type: 'staff'|'ai'|'client', id }
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')

    // ============================================
    // PERSISTENCE (только немоковые ключи — см. NO_CACHE_KEYS)
    // ============================================
    useEffect(() => { saveToStorage('staff', staff) }, [staff])
    useEffect(() => { saveToStorage('cabinets', cabinets) }, [cabinets])
    useEffect(() => { saveToStorage('subscriptions', subscriptions) }, [subscriptions])
    useEffect(() => { saveToStorage('servers', servers) }, [servers])
    useEffect(() => { saveToStorage('payments', payments) }, [payments])
    useEffect(() => { saveToStorage('audit', auditLogs) }, [auditLogs])
    useEffect(() => { saveToStorage('promos', promos) }, [promos])
    useEffect(() => { saveToStorage('news', news) }, [news])
    useEffect(() => { saveToStorage('referrals', referrals) }, [referrals])
    useEffect(() => { saveToStorage('campaigns', campaigns) }, [campaigns])
    useEffect(() => { saveToStorage('security', security) }, [security])
    useEffect(() => { saveToStorage('integrations', integrations) }, [integrations])
    useEffect(() => { saveToStorage('aiAnalytics', aiAnalytics) }, [aiAnalytics])
    useEffect(() => { saveToStorage('logs', systemLogs) }, [systemLogs])
    useEffect(() => { saveToStorage('company', company) }, [company])
    useEffect(() => { saveToStorage('withdraw', withdrawRequisites) }, [withdrawRequisites])
    useEffect(() => { saveToStorage('agents', agents) }, [agents])
    useEffect(() => { saveToStorage('chats', chats) }, [chats])
    useEffect(() => { saveToStorage('notifications', notifications) }, [notifications])
    useEffect(() => { localStorage.setItem('owner_active_tab', activeTab) }, [activeTab])

    // ============================================
    // TOAST SYSTEM
    // ============================================
    const showToast = useCallback((message, type = 'success') => {
        const id = generateId()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }, [])

    // ============================================
    // AUDIT (объявлено рано — используется в deps колбэков ниже)
    // ============================================
    const addAuditLog = useCallback((action, type = 'system', severity = 'low') => {
        const log = {
            id: generateId(),
            action,
            user: 'owner@ai-viral.com',
            timestamp: new Date().toISOString(),
            type,
            severity
        }
        setAuditLogs(prev => [log, ...prev].slice(0, 1000)) // Keep last 1000
    }, [])

    // ============================================
    // STAFF CRUD
    // ============================================
    // [STAFF-DOP] создание реального staff-аккаунта через backend (POST /owner/staff).
    // Возвращает { staff, tempPassword } — модалка показывает пароль один раз. При ошибке бросает Error.
    const addStaff = useCallback(async (data) => {
        const res = await ownerApi.createStaff({ email: data.email, name: data.name, role: data.role, password: data.password || undefined })
        const created = res?.staff || {}
        const newStaff = {
            ...data,
            id: created.id || generateId(),
            email: created.email || data.email,
            name: created.name || data.name,
            role: created.role || data.role,
            joined: new Date().toISOString(),
            tasksCompleted: 0,
            load: 0,
        }
        setStaff(prev => [...prev, newStaff])
        addAuditLog(`Добавлен сотрудник: ${newStaff.name} (${newStaff.role})`, 'staff', 'low')
        showToast(`Сотрудник ${newStaff.name} добавлен`)
        return { staff: created, tempPassword: res?.tempPassword }
    }, [showToast])

    // [REAL-DATA-2] редактирования/удаления staff на сервере нет (удаление данных — approve-зона) — честный ответ
    const updateStaff = useCallback(() => {
        showToast('Редактирование сотрудника на сервере не поддерживается — пока только создание', 'error')
    }, [showToast])

    const removeStaff = useCallback(() => {
        showToast('Удаление аккаунта сотрудника выполняется вручную через поддержку — авто-удаление отключено', 'error')
    }, [showToast])

    // ============================================
    // CABINETS CRUD
    // ============================================
    // [REAL-DATA-2] серверных операций над кабинетами нет — честные ответы вместо локального флипа
    const updateCabinetStatus = useCallback(() => {
        showToast('Смена статуса кабинета на сервере не поддерживается', 'error')
    }, [showToast])

    const impersonateCabinet = useCallback(() => {
        showToast('Вход в чужой кабинет отключён — используйте view-as в шапке (предпросмотр роли)', 'error')
    }, [showToast])

    // [REAL-DATA-2] локальный updateSubPrice удалён (мёртвый + фейк): цены тарифов — только PlanConfig (ownerApi.changePrice)

    // ============================================
    // CAMPAIGN CRUD — [REAL-DATA-2] реальный generic CRUD /owner/campaigns (Campaign)
    // ============================================
    const addCampaign = useCallback(async (data) => {
        try {
            const res = await ownerApi.create('campaigns', { ...data, status: 'pending_review' })
            const doc = res?.data
            if (doc) setCampaigns(prev => [...prev, { ...doc, id: doc.id || doc._id }])
            addAuditLog(`Создана кампания: ${data.name}`, 'finance', 'high')
            showToast('Кампания создана и отправлена на проверку')
        } catch (e) {
            showToast(`Кампания не создана: ${e.message}`, 'error')
        }
    }, [showToast, addAuditLog])

    const updateCampaignStatus = useCallback(async (id, status) => {
        try {
            await ownerApi.update('campaigns', id, { status })
            setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c))
            showToast(`Статус кампании: ${status}`)
        } catch (e) {
            showToast(`Статус не обновлён: ${e.message}`, 'error')
        }
    }, [showToast])

    const addNegotiation = useCallback(async (campaignId, message) => {
        const campaign = campaigns.find(c => c.id === campaignId)
        if (!campaign) return
        const negotiations = [...(campaign.negotiations || []), { message, from: 'owner', time: new Date().toISOString() }]
        try {
            await ownerApi.update('campaigns', campaignId, { negotiations })
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, negotiations } : c))
        } catch (e) {
            showToast(`Сообщение не отправлено: ${e.message}`, 'error')
        }
    }, [campaigns, showToast])

    // ============================================
    // PROMO CRUD — [REAL-DATA-2] реальный generic CRUD /owner/promos (Promo)
    // ============================================
    const addPromo = useCallback(async (data) => {
        try {
            const res = await ownerApi.create('promos', data)
            const doc = res?.data
            if (doc) setPromos(prev => [...prev, { ...doc, id: doc.id || doc._id }])
            showToast('Промокод создан')
        } catch (e) {
            showToast(`Промокод не создан: ${e.message}`, 'error')
        }
    }, [showToast])

    const removePromo = useCallback(async (id) => {
        try {
            await ownerApi.remove('promos', id)
            setPromos(prev => prev.filter(p => p.id !== id))
            showToast('Промокод удалён')
        } catch (e) {
            showToast(`Промокод не удалён: ${e.message}`, 'error')
        }
    }, [showToast])

    // ============================================
    // NEWS CRUD — [REAL-DATA-2] реальный generic CRUD /owner/news (News)
    // ============================================
    const addNews = useCallback(async (data) => {
        try {
            const res = await ownerApi.create('news', data)
            const doc = res?.data
            if (doc) setNews(prev => [...prev, { ...doc, id: doc.id || doc._id }])
            showToast('Новость создана')
        } catch (e) {
            showToast(`Новость не создана: ${e.message}`, 'error')
        }
    }, [showToast])

    const publishNews = useCallback(async (id) => {
        try {
            await ownerApi.update('news', id, { status: 'published' })
            setNews(prev => prev.map(n => n.id === id ? { ...n, status: 'published' } : n))
            showToast('Новость опубликована')
        } catch (e) {
            showToast(`Новость не опубликована: ${e.message}`, 'error')
        }
    }, [showToast])

    // ============================================
    // AI AGENTS CRUD
    // ============================================
    // AI AGENTS CRUD — [REAL-DATA-2] реальный generic CRUD /owner/agents (AIAgent), не локальный стейт
    // ============================================
    const toggleAgent = useCallback(async (agentId) => {
        const agent = agents.find(a => a.id === agentId)
        if (!agent) return
        const next = agent.status === 'active' ? 'paused' : 'active'
        try {
            await request(`/owner/agents/${agentId}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: next } : a))
            showToast('Статус агента обновлён')
        } catch (e) {
            showToast(`Не удалось обновить агента: ${e.message}`, 'error')
        }
    }, [agents, showToast])

    const addAgent = useCallback(async (data) => {
        try {
            const res = await request('/owner/agents', { method: 'POST', body: JSON.stringify({ ...data, status: 'active' }) })
            const doc = res?.data
            if (doc) setAgents(prev => [...prev, { ...doc, id: doc.id || doc._id }])
            addAuditLog(`Добавлен AI-агент: ${data.name}`, 'config', 'medium')
            showToast(`Агент ${data.name} создан`)
        } catch (e) {
            showToast(`Агент не создан: ${e.message}`, 'error')
        }
    }, [showToast, addAuditLog])

    const removeAgent = useCallback(async (agentId) => {
        try {
            await request(`/owner/agents/${agentId}`, { method: 'DELETE' })
            setAgents(prev => prev.filter(a => a.id !== agentId))
            showToast('Агент удалён')
        } catch (e) {
            showToast(`Не удалось удалить агента: ${e.message}`, 'error')
        }
    }, [showToast])

    // ============================================
    // CHAT SYSTEM
    // ============================================
    const startChat = useCallback((type, id, name) => {
        const chatId = `${type}_${id}`
        setActiveChat({ type, id, name, chatId })

        setChats(prev => {
            const exists = prev.find(c => c.chatId === chatId)
            if (exists) return prev
            return [...prev, { chatId, type, id, name, messages: [], unread: 0, lastMessage: '' }]
        })

        // Load messages
        const chat = chats.find(c => c.chatId === chatId)
        setChatMessages(chat?.messages || [])
    }, [chats])

    const sendMessage = useCallback((chatId, text, from = 'owner') => {
        const message = { id: generateId(), text, from, time: new Date().toISOString() }

        setChats(prev => prev.map(c => {
            if (c.chatId !== chatId) return c
            return { ...c, messages: [...c.messages, message], lastMessage: text, lastTime: new Date().toISOString() }
        }))

        setChatMessages(prev => [...prev, message])

        // [REAL-DATA] ответ AI-агента — реальный вызов /omega/chat, не симуляция setTimeout
        const chat = chats.find(c => c.chatId === chatId)
        if (chat?.type === 'ai') {
            const agent = agents.find(a => a.id === chat.id)
            request('/omega/chat', {
                method: 'POST',
                body: JSON.stringify({ message: `[${agent?.name || 'AI'}] ${text}` }),
            }).then(res => {
                const replyText = res?.data?.response || res?.reply || res?.data?.reply
                if (!replyText) return
                const reply = {
                    id: generateId(),
                    text: `🤖 ${agent?.name || 'AI'}: ${replyText}`,
                    from: 'ai',
                    time: new Date().toISOString()
                }
                setChats(prev => prev.map(c => {
                    if (c.chatId !== chatId) return c
                    return { ...c, messages: [...c.messages, reply], lastMessage: reply.text }
                }))
                setChatMessages(prev => [...prev, reply])
            }).catch(() => {
                showToast('AI не ответил — проверьте ключи провайдеров', 'error')
            })
        }
    }, [chats, agents, showToast])

    // ============================================
    // SECURITY
    // ============================================
    const terminateSession = useCallback((sessionId) => {
        setSecurity(prev => ({
            ...prev,
            activeSessions: prev.activeSessions.filter(s => s.id !== sessionId)
        }))
        addAuditLog(`Сессия #${sessionId} завершена`, 'security', 'high')
        showToast('Сессия завершена')
    }, [showToast])

    const toggle2FA = useCallback(() => {
        // [REAL-DATA] серверной 2FA нет — честный ответ вместо фейкового переключателя
        showToast('Двухфакторная защита пока не подключена на сервере — переключатель ничего не меняет', 'error')
    }, [showToast])

    // ============================================
    // INTEGRATIONS
    // ============================================
    // [REAL-DATA-2] серверного переключателя интеграций нет — честный ответ вместо локального флипа
    const toggleIntegration = useCallback(() => {
        showToast('Переключение интеграции на сервере не поддерживается — статус меняется реальным подключением (OAuth/ключи)', 'error')
    }, [showToast])

    // ============================================
    // FINANCE
    // ============================================
    const resetDemoData = useCallback(() => {
        if (!window.confirm('Сбросить локальный кэш дашборда?')) return
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
        window.location.reload()
    }, [])

    // ============================================
    // AUDIT — очистка (addAuditLog объявлен выше, рядом с showToast)
    // ============================================
    const clearOldLogs = useCallback((days) => {
        const cutoff = new Date(Date.now() - days * 86400000)
        setSystemLogs(prev => prev.filter(l => new Date(l.timestamp) > cutoff))
        showToast(`Логи старше ${days} дней очищены`)
    }, [showToast])

    // [REAL-DATA-2] мёртвые local-only CRUD (tasks/apiKeys/email/approvals/addPayment) удалены:
    // ни одной живой кнопки-открывателя; реальные ключи — ApiKeysTab, задачи — локальный трекер TasksTab.

    // ============================================
    // SEARCH & FILTER
    // ============================================
    const debouncedSearch = useRef(debounce((q) => setSearchQuery(q), 300)).current

    // ============================================
    // EXPORT
    // ============================================
    const exportData = useCallback((type, format = 'csv') => {
        const dataMap = {
            staff, cabinets, subscriptions, payments, auditLogs,
            promos, news, referrals, campaigns, systemLogs
        }
        const data = dataMap[type]
        if (!data) return

        if (format === 'csv') {
            exportToCSV(data, `${type}.csv`)
        } else {
            exportToJSON(data, `${type}.json`)
        }
        showToast(`Экспорт ${type} завершён`)
    }, [staff, cabinets, subscriptions, payments, auditLogs, promos, news, referrals, campaigns, systemLogs, showToast])

    // ============================================
    // RETURN
    // ============================================
    return {
        // Data
        staff, cabinets, subscriptions, servers, payments,
        auditLogs, promos, news, referrals, campaigns,
        security, integrations, aiAnalytics, systemLogs,
        company, withdrawRequisites, agents, chats, notifications,

        // UI State
        activeTab, setActiveTab,
        searchQuery, setSearchQuery: debouncedSearch,
        isLoading, setIsLoading,
        error,
        toasts, setToasts,
        modal, setModal,
        showPassword, setShowPassword,
        editingPrice, setEditingPrice,
        isYearly, setIsYearly,

        // Chat
        activeChat, setActiveChat,
        chatMessages, setChatMessages,
        chatInput, setChatInput,

        // Actions
        addStaff, updateStaff, removeStaff,
        updateCabinetStatus, impersonateCabinet,
        addCampaign, updateCampaignStatus, addNegotiation,
        addPromo, removePromo,
        addNews, publishNews,
        toggleAgent, addAgent, removeAgent,
        startChat, sendMessage,
        terminateSession, toggle2FA,
        toggleIntegration,
        resetDemoData,
        addAuditLog,
        clearOldLogs,
        exportData,
        showToast,
        refetch,
    }
}
