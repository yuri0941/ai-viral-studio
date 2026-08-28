import { useState, useEffect, useCallback, useRef } from 'react'
import {
    INITIAL_STAFF, INITIAL_CABINETS, INITIAL_SUBSCRIPTIONS,
    INITIAL_SERVERS, INITIAL_PAYMENTS, INITIAL_AUDIT_LOGS,
    INITIAL_PROMOS, INITIAL_NEWS, INITIAL_REFERRALS,
    INITIAL_AD_CAMPAIGNS, INITIAL_SECURITY, INITIAL_INTEGRATIONS,
    INITIAL_AI_ANALYTICS, INITIAL_SYSTEM_LOGS,
    INITIAL_WITHDRAW_REQUISITES, INITIAL_COMPANY,
    AI_AGENTS
} from '../data/initialData'
import { generateId, debounce, exportToCSV, exportToJSON } from '../utils/helpers'
import { ownerApi } from '../../../services/api'

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
    tasks: 'owner_tasks',
    apiKeys: 'owner_api_keys',
    approvalRequests: 'owner_approval_requests',
}

function loadFromStorage(key, fallback) {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS[key])
        return saved ? JSON.parse(saved) : fallback
    } catch {
        return fallback
    }
}

function loadArrayFromStorage(key, fallback) {
    const saved = loadFromStorage(key, fallback)
    return Array.isArray(saved) && saved.length > 0 ? saved : fallback
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
    } catch (e) {
        console.warn(`Failed to save ${key}:`, e)
    }
}

function normalizeSubscriptions(subs) {
    if (!Array.isArray(subs) || subs.length === 0) return INITIAL_SUBSCRIPTIONS
    return subs.map(s => s.name === 'Free' ? { ...s, price: 0 } : s)
}

const INITIAL_TASKS = [
    { id: '1', title: 'Подготовить бриф для TechBrand', status: 'todo', priority: 'high', assignee: 'Анна', due: '2026-07-30', tag: 'реклама' },
    { id: '2', title: 'Обновить цены Pro', status: 'in_progress', priority: 'medium', assignee: 'Иван', due: '2026-07-29', tag: 'finance' },
    { id: '3', title: 'Проверить AI Worker #2', status: 'review', priority: 'high', assignee: 'Дмитрий', due: '2026-07-28', tag: 'infra' },
    { id: '4', title: 'Опубликовать новость о запуске', status: 'done', priority: 'low', assignee: 'Мария', due: '2026-07-27', tag: 'content' },
]

const INITIAL_API_KEYS = [
    { id: 'groq', provider: 'groq', label: 'Groq', env: 'GROQ_API_KEY', value: '', status: 'missing', lastRotated: null },
    { id: 'openrouter', provider: 'openrouter', label: 'OpenRouter', env: 'OPENROUTER_API_KEY', value: '', status: 'missing', lastRotated: null },
    { id: 'deepseek', provider: 'deepseek', label: 'DeepSeek', env: 'DEEPSEEK_API_KEY', value: '', status: 'missing', lastRotated: null },
    { id: 'youtube', provider: 'youtube', label: 'YouTube Data API', env: 'YOUTUBE_API_KEY', value: '', status: 'missing', lastRotated: null },
    { id: 'replicate', provider: 'replicate', label: 'Replicate', env: 'REPLICATE_API_KEY', value: '', status: 'missing', lastRotated: null },
]

// ============================================
// USE OWNER DATA — единый мозг дашборда
// ============================================
export function useOwnerData() {
    // --- Core Data ---
    const [staff, setStaff] = useState(() => loadFromStorage('staff', INITIAL_STAFF))
    const [cabinets, setCabinets] = useState(() => loadFromStorage('cabinets', INITIAL_CABINETS))
    const [subscriptions, setSubscriptions] = useState(() => normalizeSubscriptions(loadFromStorage('subscriptions', INITIAL_SUBSCRIPTIONS)))
    const [servers, setServers] = useState(() => loadFromStorage('servers', INITIAL_SERVERS))
    const [payments, setPayments] = useState(() => loadArrayFromStorage('payments', INITIAL_PAYMENTS))
    const [auditLogs, setAuditLogs] = useState(() => loadFromStorage('audit', INITIAL_AUDIT_LOGS))
    const [promos, setPromos] = useState(() => loadFromStorage('promos', INITIAL_PROMOS))
    const [news, setNews] = useState(() => loadFromStorage('news', INITIAL_NEWS))
    const [referrals, setReferrals] = useState(() => loadFromStorage('referrals', INITIAL_REFERRALS))
    const [campaigns, setCampaigns] = useState(() => loadFromStorage('campaigns', INITIAL_AD_CAMPAIGNS))
    const [security, setSecurity] = useState(() => loadFromStorage('security', INITIAL_SECURITY))
    const [integrations, setIntegrations] = useState(() => loadFromStorage('integrations', INITIAL_INTEGRATIONS))
    const [aiAnalytics, setAiAnalytics] = useState(() => loadFromStorage('aiAnalytics', INITIAL_AI_ANALYTICS))
    const [systemLogs, setSystemLogs] = useState(() => loadFromStorage('logs', INITIAL_SYSTEM_LOGS))
    const [company, setCompany] = useState(() => loadFromStorage('company', INITIAL_COMPANY))
    const [withdrawRequisites, setWithdrawRequisites] = useState(() => loadFromStorage('withdraw', INITIAL_WITHDRAW_REQUISITES))
    const [agents, setAgents] = useState(() => loadFromStorage('agents', AI_AGENTS))
    const [chats, setChats] = useState(() => loadFromStorage('chats', []))
    const [notifications, setNotifications] = useState(() => loadFromStorage('notifications', []))
    const [tasks, setTasks] = useState(() => loadArrayFromStorage('tasks', INITIAL_TASKS))
    const [apiKeys, setApiKeys] = useState(() => loadArrayFromStorage('apiKeys', INITIAL_API_KEYS))
    const [approvalRequests, setApprovalRequests] = useState(() => loadArrayFromStorage('approvalRequests', []))

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
    // API LOAD
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
                if (d.recentActivity && d.recentActivity.length > 0) setAuditLogs(d.recentActivity)
            }
            if (financeRes.status === 'fulfilled') {
                const d = financeRes.value.data
                if (d.payments && d.payments.length > 0) setPayments(d.payments)
            }
            if (teamRes.status === 'fulfilled') {
                const d = teamRes.value.data
                if (d.staff && d.staff.length > 0) setStaff(d.staff)
                if (d.cabinets && d.cabinets.length > 0) setCabinets(d.cabinets)
            }
            if (serversRes.status === 'fulfilled') {
                const d = serversRes.value.data
                if (d.servers && d.servers.length > 0) setServers(d.servers)
            }
            if (subscriptionsRes.status === 'fulfilled') {
                const d = subscriptionsRes.value.data
                if (d.subscriptions && d.subscriptions.length > 0) setSubscriptions(normalizeSubscriptions(d.subscriptions))
            }
            if (integrationsRes.status === 'fulfilled') {
                const d = integrationsRes.value.data
                if (d.integrations && d.integrations.length > 0) setIntegrations(d.integrations)
            }
            if (auditRes.status === 'fulfilled') {
                const d = auditRes.value.data
                if (d.logs && d.logs.length > 0) setAuditLogs(d.logs)
            }
            if (promosRes.status === 'fulfilled') {
                const d = promosRes.value.data
                if (d.promos && d.promos.length > 0) setPromos(d.promos)
            }
            if (newsRes.status === 'fulfilled') {
                const d = newsRes.value.data
                if (d.news && d.news.length > 0) setNews(d.news)
            }
            if (agentsRes.status === 'fulfilled') {
                const d = agentsRes.value.data
                if (d.agents && d.agents.length > 0) setAgents(d.agents)
            }
        } catch (err) {
            setError(err.message)
            console.warn('[useOwnerData] API load failed, using localStorage/initial data:', err.message)
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

    // --- Refs for intervals ---
    const intervalsRef = useRef([])

    // ============================================
    // PERSISTENCE
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
    useEffect(() => { saveToStorage('tasks', tasks) }, [tasks])
    useEffect(() => { saveToStorage('apiKeys', apiKeys) }, [apiKeys])
    useEffect(() => { saveToStorage('approvalRequests', approvalRequests) }, [approvalRequests])
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

    const updateStaff = useCallback((id, data) => {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
        showToast('Данные обновлены')
    }, [showToast])

    const removeStaff = useCallback((id) => {
        setStaff(prev => prev.filter(s => s.id !== id))
        showToast('Сотрудник удалён')
    }, [showToast])

    // ============================================
    // CABINETS CRUD
    // ============================================
    const updateCabinetStatus = useCallback((id, status) => {
        setCabinets(prev => prev.map(c => c.id === id ? { ...c, status, activeNow: status === 'active' } : c))
        addAuditLog(`Кабинет #${id} — статус изменён на ${status}`, 'staff', 'medium')
        showToast(`Статус кабинета обновлён: ${status}`)
    }, [showToast])

    const impersonateCabinet = useCallback((id) => {
        const cabinet = cabinets.find(c => c.id === id)
        if (cabinet) {
            addAuditLog(`Имперсонация кабинета: ${cabinet.name}`, 'security', 'high')
            showToast(`Вход в кабинет: ${cabinet.name}`)
            // Здесь можно добавить редирект или открытие drawer
        }
    }, [cabinets, showToast])

    // ============================================
    // SUBSCRIPTION CRUD
    // ============================================
    const updateSubPrice = useCallback((index, newPrice) => {
        if (subscriptions[index]?.name === 'Free') {
            showToast('Цена тарифа Free не редактируется', 'error')
            return
        }
        setSubscriptions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], price: parseFloat(newPrice) || 0 }
            return updated
        })
        addAuditLog(`Изменена цена ${subscriptions[index]?.name} на $${newPrice}`, 'config', 'medium')
        showToast('Цена обновлена')
    }, [subscriptions, showToast])

    // ============================================
    // CAMPAIGN CRUD
    // ============================================
    const addCampaign = useCallback((data) => {
        const campaign = { ...data, id: generateId(), status: 'pending_review', spent: 0, ctr: 0, cpc: 0, roi: 0, negotiations: [] }
        setCampaigns(prev => [...prev, campaign])
        addAuditLog(`Создана кампания: ${data.name}`, 'finance', 'high')
        showToast('Кампания создана и отправлена на проверку')
    }, [showToast])

    const updateCampaignStatus = useCallback((id, status) => {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c))
        showToast(`Статус кампании: ${status}`)
    }, [showToast])

    const addNegotiation = useCallback((campaignId, message) => {
        setCampaigns(prev => prev.map(c => {
            if (c.id !== campaignId) return c
            return {
                ...c,
                negotiations: [...c.negotiations, { id: generateId(), message, from: 'owner', time: new Date().toISOString() }]
            }
        }))
    }, [])

    // ============================================
    // PROMO CRUD
    // ============================================
    const addPromo = useCallback((data) => {
        setPromos(prev => [...prev, { ...data, id: generateId(), usedCount: 0 }])
        showToast('Промокод создан')
    }, [showToast])

    const removePromo = useCallback((id) => {
        setPromos(prev => prev.filter(p => p.id !== id))
        showToast('Промокод удалён')
    }, [showToast])

    // ============================================
    // NEWS CRUD
    // ============================================
    const addNews = useCallback((data) => {
        setNews(prev => [...prev, { ...data, id: generateId(), views: 0, date: new Date().toISOString() }])
        showToast('Новость создана')
    }, [showToast])

    const publishNews = useCallback((id) => {
        setNews(prev => prev.map(n => n.id === id ? { ...n, status: 'published' } : n))
        showToast('Новость опубликована')
    }, [showToast])

    // ============================================
    // AI AGENTS CRUD
    // ============================================
    const toggleAgent = useCallback((agentId) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a))
        showToast('Статус агента обновлён')
    }, [showToast])

    const updateAgent = useCallback((agentId, data) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...data } : a))
        showToast('Агент обновлён')
    }, [showToast])

    const addAgent = useCallback((data) => {
        const agent = { ...data, id: generateId(), status: 'active' }
        setAgents(prev => [...prev, agent])
        addAuditLog(`Добавлен AI-агент: ${data.name}`, 'config', 'medium')
        showToast(`Агент ${data.name} создан`)
    }, [showToast])

    const removeAgent = useCallback((agentId) => {
        setAgents(prev => prev.filter(a => a.id !== agentId))
        showToast('Агент удалён')
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

        // AI Agent auto-reply simulation
        const chat = chats.find(c => c.chatId === chatId)
        if (chat?.type === 'ai') {
            setTimeout(() => {
                const agent = agents.find(a => a.id === chat.id)
                const reply = {
                    id: generateId(),
                    text: `🤖 ${agent?.name || 'AI'}: Получил запрос "${text}". Анализирую...`,
                    from: 'ai',
                    time: new Date().toISOString()
                }
                setChats(prev => prev.map(c => {
                    if (c.chatId !== chatId) return c
                    return { ...c, messages: [...c.messages, reply], lastMessage: reply.text }
                }))
                setChatMessages(prev => [...prev, reply])
            }, 1500)
        }
    }, [chats, agents])

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
        setSecurity(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))
        showToast('2FA обновлена')
    }, [showToast])

    // ============================================
    // INTEGRATIONS
    // ============================================
    const toggleIntegration = useCallback((id) => {
        setIntegrations(prev => prev.map(i => {
            if (i.id !== id) return i
            const newStatus = i.connected ? 'disconnected' : 'active'
            return { ...i, connected: !i.connected, status: newStatus }
        }))
        showToast('Интеграция обновлена')
    }, [showToast])

    // ============================================
    // FINANCE
    // ============================================
    const addPayment = useCallback((data) => {
        setPayments(prev => [...prev, { ...data, id: generateId() }])
        showToast('Платёж добавлен')
    }, [showToast])

    const resetDemoData = useCallback(() => {
        if (!window.confirm('Сбросить все демо-данные к начальным?')) return
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
        window.location.reload()
    }, [])

    // ============================================
    // AUDIT
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

    const clearOldLogs = useCallback((days) => {
        const cutoff = new Date(Date.now() - days * 86400000)
        setSystemLogs(prev => prev.filter(l => new Date(l.timestamp) > cutoff))
        showToast(`Логи старше ${days} дней очищены`)
    }, [showToast])

    // ============================================
    // TASKS CRUD
    // ============================================
    const addTask = useCallback((data) => {
        const task = { ...data, id: data.id || generateId() }
        setTasks(prev => [...prev, task])
        addAuditLog(`Создана задача: ${task.title}`, 'task', 'low')
        showToast('Задача создана')
    }, [showToast, addAuditLog])

    const updateTask = useCallback((id, data) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    }, [])

    const removeTask = useCallback((id) => {
        setTasks(prev => prev.filter(t => t.id !== id))
        showToast('Задача удалена')
    }, [showToast])

    const moveTask = useCallback((id, status) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    }, [])

    // ============================================
    // API KEYS CRUD
    // ============================================
    const addApiKey = useCallback((data) => {
        const key = {
            ...data,
            id: data.id || generateId(),
            status: data.value ? 'active' : 'missing',
            lastRotated: data.value ? new Date().toISOString() : null,
        }
        setApiKeys(prev => [...prev, key])
        addAuditLog(`Добавлен API-ключ для ${key.label}`, 'security', 'medium')
        showToast(`Ключ ${key.label} добавлен`)
    }, [showToast, addAuditLog])

    const updateApiKey = useCallback((id, data) => {
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, ...data, status: data.value ? 'active' : (k.status || 'missing') } : k))
    }, [])

    const removeApiKey = useCallback((id) => {
        setApiKeys(prev => prev.filter(k => k.id !== id))
        showToast('Ключ удалён')
    }, [showToast])

    const rotateApiKey = useCallback((id) => {
        const k = apiKeys.find(x => x.id === id)
        if (!k) return
        const fakeNewKey = `${k.provider || k.id}_key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        updateApiKey(id, { value: fakeNewKey, lastRotated: new Date().toISOString(), status: 'active' })
        addAuditLog(`API-ключ ${k.label} обновлён`, 'security', 'medium')
        showToast(`Ключ ${k.label} обновлён`)
    }, [apiKeys, updateApiKey, showToast, addAuditLog])

    // ============================================
    // EMAIL
    // ============================================
    const sendEmail = useCallback((data) => {
        addAuditLog(`Отправлен email для ${data.to}: ${data.subject}`, 'communication', 'low')
        showToast(`Email «${data.subject}» отправлен`)
    }, [showToast, addAuditLog])

    // ============================================
    // OMEGA APPROVALS
    // ============================================
    const addApprovalRequest = useCallback((data) => {
        const req = { ...data, id: generateId(), status: 'pending', createdAt: new Date().toISOString() }
        setApprovalRequests(prev => [req, ...prev])
        showToast('Новый запрос от OMEGA')
        return req
    }, [showToast])

    const approveRequest = useCallback((id, comment = '') => {
        setApprovalRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', comment, resolvedAt: new Date().toISOString() } : r))
        addAuditLog(`Запрос OMEGA одобрен: ${id}`, 'omega', 'high')
        showToast('Запрос одобрен')
    }, [showToast, addAuditLog])

    const rejectRequest = useCallback((id, comment = '') => {
        setApprovalRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', comment, resolvedAt: new Date().toISOString() } : r))
        addAuditLog(`Запрос OMEGA отклонён: ${id}`, 'omega', 'high')
        showToast('Запрос отклонён')
    }, [showToast, addAuditLog])

    // ============================================
    // SERVERS (Real-time simulation)
    // ============================================
    useEffect(() => {
        const interval = setInterval(() => {
            setServers(prev => prev.map(s => {
                if (s.status === 'offline') return s
                return {
                    ...s,
                    cpu: Math.min(100, Math.max(5, s.cpu + (Math.random() - 0.5) * 10)),
                    ram: Math.min(100, Math.max(10, s.ram + (Math.random() - 0.5) * 5)),
                }
            }))
        }, 5000)
        intervalsRef.current.push(interval)
        return () => clearInterval(interval)
    }, [])

    // Cleanup
    useEffect(() => {
        return () => intervalsRef.current.forEach(clearInterval)
    }, [])

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
        tasks, apiKeys, approvalRequests,

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
        updateSubPrice,
        addCampaign, updateCampaignStatus, addNegotiation,
        addPromo, removePromo,
        addNews, publishNews,
        toggleAgent, updateAgent, addAgent, removeAgent,
        startChat, sendMessage,
        terminateSession, toggle2FA,
        toggleIntegration,
        addPayment,
        resetDemoData,
        addAuditLog,
        clearOldLogs,
        exportData,
        showToast,
        refetch,

        // Tasks & API keys
        addTask, updateTask, removeTask, moveTask,
        addApiKey, updateApiKey, removeApiKey, rotateApiKey,
        sendEmail,
        addApprovalRequest, approveRequest, rejectRequest,
    }
}