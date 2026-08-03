import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import {
    Headphones, TicketCheck, Clock, Star, Shield, BookOpen, Zap,
    Search, Send, Check, X, AlertCircle, MessageSquare, User,
    ChevronDown, ChevronUp, Tag, ArrowUpRight, Filter,
    AlertTriangle, CheckCircle2, Clock4, Lock, Unlock, Layout, List,
    Bot, Plus, Eye
} from 'lucide-react'
import { VirtualTable } from '../components/shared/VirtualTable'

// [P16-FIX] added: 3D tilt card for kanban
function TiltCard({ children, className = '', onClick }) {
    const ref = useRef(null)
    const handleMove = (e) => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const cx = rect.width / 2
        const cy = rect.height / 2
        const rotateX = ((y - cy) / cy) * -5
        const rotateY = ((x - cx) / cx) * 5
        el.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
    }
    const handleLeave = () => {
        const el = ref.current
        if (el) el.style.transform = 'perspective(500px) rotateX(0) rotateY(0) translateY(0)'
    }
    return (
        <div
            ref={ref}
            onClick={onClick}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className={`tilt-card ${className}`}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {children}
        </div>
    )
}

function StaffDashboardPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [toast, setToast] = useState(null)
    const [activeFilter, setActiveFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [fabOpen, setFabOpen] = useState(false)

    // --- TICKETS STATE ---
    const [tickets, setTickets] = useState([
        {
            id: 1,
            user: 'user1@mail.com',
            subject: 'Не работает AI Chat',
            status: 'open',
            priority: 'high',
            time: '10 мин назад',
            messages: [
                { from: 'user', text: 'Привет! AI Chat перестал отвечать. Пишу запрос, а в ответ тишина. Помогите!', time: '10 мин назад' },
                { from: 'staff', text: 'Здравствуйте! Проверяю подключение к API. Какой провайдер выбран у вас?', time: '8 мин назад' },
                { from: 'user', text: 'Авто (рекомендуется)', time: '7 мин назад' },
            ],
            assignedTo: null
        },
        {
            id: 2,
            user: 'creator99@mail.com',
            subject: 'Ошибка оплаты',
            status: 'open',
            priority: 'medium',
            time: '1 час назад',
            messages: [
                { from: 'user', text: 'Пытаюсь оплатить тариф Pro, но выдаёт ошибку "Payment failed". Карта рабочая.', time: '1 час назад' },
            ],
            assignedTo: null
        },
        {
            id: 3,
            user: 'biz@company.com',
            subject: 'Как подключить YouTube?',
            status: 'in_progress',
            priority: 'low',
            time: '3 часа назад',
            messages: [
                { from: 'user', text: 'Не понимаю как подключить YouTube канал к планировщику. Где найти API ключ?', time: '3 часа назад' },
                { from: 'staff', text: 'Добрый день! Перейдите в Настройки → Соцсети → YouTube. Там будет кнопка "Подключить".', time: '2 часа назад' },
                { from: 'user', text: 'Спасибо! Нашёл. А где взять API ключ?', time: '1 час назад' },
            ],
            assignedTo: 'staff@ai-viral.com'
        },
        {
            id: 4,
            user: 'test@mail.com',
            subject: 'Проблема с входом',
            status: 'closed',
            priority: 'high',
            time: 'Вчера',
            messages: [
                { from: 'user', text: 'Не могу войти в аккаунт. Пишет "Неверный пароль", хотя я уверен что пароль правильный.', time: 'Вчера' },
                { from: 'staff', text: 'Попробуйте сбросить пароль через кнопку "Забыли пароль?" на странице входа.', time: 'Вчера' },
                { from: 'user', text: 'Помогло! Спасибо большое!', time: 'Вчера' },
            ],
            assignedTo: 'staff@ai-viral.com'
        }
    ])

    const [replyText, setReplyText] = useState('')

    // --- MODALS ---
    const [showTicketModal, setShowTicketModal] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [showModerationModal, setShowModerationModal] = useState(false)
    const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)
    const [showEscalationModal, setShowEscalationModal] = useState(false)
    const [escalationForm, setEscalationForm] = useState({ reason: '', priority: 'medium', notes: '' })
    const [viewMode, setViewMode] = useState('table')

    const stats = {
        openTickets: tickets.filter(t => t.status === 'open').length,
        inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
        closedTickets: tickets.filter(t => t.status === 'closed').length,
        resolvedToday: tickets.filter(t => t.status === 'closed').length,
        avgResponse: '15 мин',
        satisfaction: 94
    }

    const changeStatus = (ticketId, newStatus) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus, assignedTo: t.assignedTo || (user?.email || 'staff@ai-viral.com') } : t))
        showToast(t('staff.statusChanged', 'Статус изменён на {{status}}', { status: getStatusLabel(newStatus) }))
    }

    const changePriority = (ticketId, newPriority) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t))
        showToast(t('staff.priorityChanged', 'Приоритет изменён на {{priority}}', { priority: getPriorityLabel(newPriority) }))
    }

    const assignToMe = (ticketId) => {
        const me = user?.email || 'staff@ai-viral.com'
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignedTo: me } : t))
        showToast(t('staff.assignedToMe'))
    }

    const setTicketStatus = (newStatus) => {
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
        setSelectedTicket({ ...selectedTicket, status: newStatus })
        showToast(t('staff.statusChanged', { status: getStatusLabel(newStatus) }))
    }

    const setTicketPriority = (newPriority) => {
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, priority: newPriority } : t))
        setSelectedTicket({ ...selectedTicket, priority: newPriority })
        showToast(t('staff.priorityChanged', { priority: getPriorityLabel(newPriority) }))
    }

    const assignSelectedToMe = () => {
        const me = user?.email || 'staff@ai-viral.com'
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, assignedTo: me } : t))
        setSelectedTicket({ ...selectedTicket, assignedTo: me })
        showToast(t('staff.assignedToMe'))
    }

    const insertQuickReply = (text) => {
        setReplyText(text)
    }

    // --- TOAST ---
    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // --- FILTERS ---
    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = activeFilter === 'all' ? true :
            activeFilter === 'open' ? t.status === 'open' :
                activeFilter === 'in_progress' ? t.status === 'in_progress' :
                    activeFilter === 'closed' ? t.status === 'closed' :
                        activeFilter === 'mine' ? t.assignedTo === (user?.email || 'staff@ai-viral.com') :
                            true
        return matchesSearch && matchesFilter
    })

    // --- STATUS/PRIORITY STYLES ---
    const getStatusStyle = (status) => {
        switch (status) {
            case 'open': return 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20'
            case 'in_progress': return 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] border-[var(--accent-warm)]/20'
            case 'waiting': return 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
            case 'closed': return 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
            default: return 'bg-[var(--border-strong)] text-[var(--text-muted)] border-[var(--border)]'
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'open': return t('staff.open')
            case 'in_progress': return t('staff.inProgress')
            case 'waiting': return t('staff.waiting')
            case 'closed': return t('staff.closed')
            default: return status
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'open': return <AlertCircle size={14} />
            case 'in_progress': return <Clock4 size={14} />
            case 'waiting': return <Clock size={14} />
            case 'closed': return <CheckCircle2 size={14} />
            default: return null
        }
    }

    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'high': return 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20'
            case 'medium': return 'text-[var(--accent-warm)] bg-[var(--accent-warm)]/10 border-[var(--accent-warm)]/20'
            case 'low': return 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20'
            default: return 'text-[var(--text-muted)] bg-[var(--border-strong)] border-[var(--border)]'
        }
    }

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'high': return t('tasks.priorityHigh', 'Высокий')
            case 'medium': return t('tasks.priorityMedium', 'Средний')
            case 'low': return t('tasks.priorityLow', 'Низкий')
            default: return priority
        }
    }

    // [P16-FIX] added: colored left-border priority strips on kanban cards
    const getPriorityBorder = (priority) => {
        switch (priority) {
            case 'high': return 'border-l-red-500'
            case 'medium': return 'border-l-amber-500'
            case 'low': return 'border-l-blue-500'
            default: return 'border-l-gray-500'
        }
    }

    const ticketColumns = useMemo(() => [
        { key: 'id', header: t('staff.id'), width: '70px', cell: (t) => <span className="text-[var(--text-muted)] text-sm">#{t.id}</span> },
        { key: 'user', header: t('staff.user'), width: '1.5fr', cell: (t) => <span className="text-[var(--text)] text-sm">{t.user}</span> },
        { key: 'subject', header: t('staff.subject'), width: '2fr', cell: (t) => <span className="text-[var(--text)] text-sm">{t.subject}</span> },
        {
            key: 'priority',
            header: t('staff.priority'),
            width: '120px',
            cell: (t) => (
                <select
                    value={t.priority}
                    onChange={e => changePriority(t.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs border bg-transparent outline-none ${getPriorityStyle(t.priority)}`}
                >
                    <option value="high" className="bg-[var(--card)]">{t('tasks.priorityHigh', 'Высокий')}</option>
                    <option value="medium" className="bg-[var(--card)]">{t('tasks.priorityMedium', 'Средний')}</option>
                    <option value="low" className="bg-[var(--card)]">{t('tasks.priorityLow', 'Низкий')}</option>
                </select>
            ),
        },
        {
            key: 'status',
            header: t('common.status'),
            width: '130px',
            cell: (t) => (
                <select
                    value={t.status}
                    onChange={e => changeStatus(t.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs border bg-transparent outline-none ${getStatusStyle(t.status)}`}
                >
                    <option value="open" className="bg-[var(--card)]">{t('staff.open')}</option>
                    <option value="in_progress" className="bg-[var(--card)]">{t('staff.inProgress')}</option>
                    <option value="waiting" className="bg-[var(--card)]">{t('staff.waiting')}</option>
                    <option value="closed" className="bg-[var(--card)]">{t('staff.closed')}</option>
                </select>
            ),
        },
        { key: 'assignedTo', header: t('staff.assigned'), width: '110px', cell: (t) => <span className="text-[var(--text)] text-xs">{t.assignedTo ? t.assignedTo.split('@')[0] : t('staff.unassigned')}</span> },
        { key: 'time', header: t('staff.time'), width: '100px', cell: (t) => <span className="text-[var(--text-muted)] text-sm">{t.time}</span> },
        {
            key: 'actions',
            header: t('staff.action'),
            width: '110px',
            sortable: false,
            cell: (t) => (
                <button
                    onClick={() => { setSelectedTicket(t); setReplyText(''); setShowTicketModal(true) }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-xs font-medium hover:bg-[var(--success)]/20 transition-colors flex items-center gap-1"
                >
                    <ArrowUpRight size={12} /> {t('staff.openTicket')}
                </button>
            ),
        },
    ], [changePriority, changeStatus])

    // --- TICKET ACTIONS ---
    const openTicket = (ticket) => {
        setSelectedTicket(ticket)
        setReplyText('')
        setShowTicketModal(true)
    }

    const sendReply = () => {
        if (!replyText.trim()) return
        const updatedTickets = tickets.map(t => {
            if (t.id === selectedTicket.id) {
                return {
                    ...t,
                    messages: [...t.messages, { from: 'staff', text: replyText, time: t('staff.justNow', 'Только что') }],
                    status: t.status === 'closed' ? 'open' : 'waiting',
                    assignedTo: user?.email || 'staff@ai-viral.com'
                }
            }
            return t
        })
        setTickets(updatedTickets)
        setSelectedTicket({
            ...selectedTicket,
            messages: [...selectedTicket.messages, { from: 'staff', text: replyText, time: t('staff.justNow', 'Только что') }],
            status: selectedTicket.status === 'closed' ? 'open' : 'waiting',
            assignedTo: user?.email || 'staff@ai-viral.com'
        })
        setReplyText('')
        showToast(t('staff.replySent'))
    }

    const closeTicket = () => {
        const updatedTickets = tickets.map(t => {
            if (t.id === selectedTicket.id) {
                return { ...t, status: 'closed' }
            }
            return t
        })
        setTickets(updatedTickets)
        setSelectedTicket({ ...selectedTicket, status: 'closed' })
        showToast(t('staff.ticketClosed'))
    }

    const reopenTicket = () => {
        const updatedTickets = tickets.map(t => {
            if (t.id === selectedTicket.id) {
                return { ...t, status: 'open' }
            }
            return t
        })
        setTickets(updatedTickets)
        setSelectedTicket({ ...selectedTicket, status: 'open' })
        showToast(t('staff.ticketReopened'))
    }

    // --- ESCALATION ---
    const handleEscalation = () => {
        if (!escalationForm.reason) {
            showToast(t('staff.escalationReasonRequired', 'Укажите причину эскалации'), 'error')
            return
        }
        setShowEscalationModal(false)
        setEscalationForm({ reason: '', priority: 'medium', notes: '' })
        showToast(t('staff.escalated', 'Тикет передан администратору'))
    }

    // --- KNOWLEDGE BASE ---
    const [kbSearch, setKbSearch] = useState('')
    const [kbCategory, setKbCategory] = useState('all')
    const kbArticles = [
        { id: 1, category: 'auth', title: 'Не могу войти в аккаунт', content: 'Попробуйте сбросить пароль через кнопку "Забыли пароль?". Если не помогает — проверьте правильность email.', views: 234 },
        { id: 2, category: 'payments', title: 'Ошибка оплаты тарифа', content: 'Проверьте баланс карты и лимиты. Попробуйте другой способ оплаты (PayPal, Crypto).', views: 189 },
        { id: 3, category: 'ai', title: 'AI Chat не отвечает', content: 'Проверьте подключение к интернету. Попробуйте переключить провайдера в настройках чата (Groq / OpenRouter).', views: 456 },
        { id: 4, category: 'scheduler', title: 'Как подключить YouTube', content: 'Перейдите в Настройки → Соцсети → YouTube. Нажмите "Подключить" и авторизуйтесь через Google.', views: 312 },
        { id: 5, category: 'scheduler', title: 'Пост не опубликовался', content: 'Проверьте дату и время публикации. Убедитесь что выбрана хотя бы одна платформа.', views: 178 },
        { id: 6, category: 'account', title: 'Как сменить тариф', content: 'Перейдите в Настройки → Подписка. Выберите новый тариф и нажмите "Выбрать".', views: 267 },
    ]

    const kbCategories = [
        { id: 'all', label: t('staff.all'), icon: BookOpen },
        { id: 'auth', label: t('staff.auth', 'Авторизация'), icon: Lock },
        { id: 'payments', label: t('staff.payments', 'Оплата'), icon: Tag },
        { id: 'ai', label: t('staff.aiChat'), icon: MessageSquare },
        { id: 'scheduler', label: t('staff.scheduler', 'Планировщик'), icon: Clock },
        { id: 'account', label: t('staff.account', 'Аккаунт'), icon: User },
    ]

    const filteredKb = kbArticles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
            a.content.toLowerCase().includes(kbSearch.toLowerCase())
        const matchesCategory = kbCategory === 'all' || a.category === kbCategory
        return matchesSearch && matchesCategory
    })

    // --- MODERATION REPORTS ---
    const [reports, setReports] = useState([
        { id: 1, user: 'user1@mail.com', content: 'Нецензурный контент в комментариях', platform: 'YouTube', date: '10 мин назад', status: 'pending' },
        { id: 2, user: 'spammer@bot.ru', content: 'Массовая рассылка спама', platform: 'Telegram', date: '1 час назад', status: 'pending' },
        { id: 3, user: 'creator99@mail.com', content: 'Нарушение авторских прав (музыка)', platform: 'TikTok', date: '3 часа назад', status: 'reviewed' },
    ])

    const handleReportAction = (reportId, action) => {
        if (action === 'ban') {
            setReports(reports.filter(r => r.id !== reportId))
            showToast(t('staff.userBlocked'))
        } else if (action === 'dismiss') {
            setReports(reports.filter(r => r.id !== reportId))
            showToast(t('staff.reportDismissed'))
        } else if (action === 'warn') {
            setReports(reports.map(r => r.id === reportId ? { ...r, status: 'warned' } : r))
            showToast(t('staff.warningSent'))
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg transition-all ${toast.type === 'error' ? 'bg-[var(--danger)]/90 text-[var(--text)]' : 'bg-[var(--success)]/90 text-[var(--text-inverse)]'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Headphones size={28} className="text-[var(--accent)]" />
                    <div>
                        <h1 className="text-3xl font-bold">{t('staff.title')}</h1>
                        <p className="text-[var(--text-muted)] text-sm">{t('staff.subtitle')}</p>
                    </div>
                </div>
                <span className="px-4 py-2 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-sm font-semibold border border-[var(--accent)]/20">
                    {user?.name || 'Staff'}
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                    { label: t('staff.openTickets'), value: stats.openTickets, icon: TicketCheck, color: 'text-[var(--danger)]', bg: 'bg-[var(--danger)]/10' },
                    { label: t('staff.resolvedToday'), value: stats.resolvedToday, icon: CheckCircle2, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
                    { label: t('staff.avgResponse'), value: stats.avgResponse, icon: Clock, color: 'text-[var(--accent-warm)]', bg: 'bg-[var(--accent-warm)]/10' },
                    { label: t('staff.satisfaction'), value: `${stats.satisfaction}%`, icon: Star, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' }
                ].map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className={`${stat.bg} border border-[var(--border-strong)] rounded-2xl p-5 hover:border-[var(--border-strong)] transition-all`}>
                            <Icon size={22} className={`mb-2 ${stat.color}`} />
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* Tickets Table */}
            <div className="bg-[var(--card)] border border-[var(--border-strong)] rounded-2xl overflow-hidden mb-8">
                <div className="p-5 border-b border-[var(--border-strong)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare size={18} className="text-[var(--accent)]" /> {t('staff.tickets')}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: 'all', label: t('staff.all') },
                            { id: 'open', label: t('staff.open') },
                            { id: 'in_progress', label: t('staff.inProgress') },
                            { id: 'waiting', label: t('staff.waiting') },
                            { id: 'closed', label: t('staff.closed') },
                            { id: 'mine', label: t('staff.mine') },
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === filter.id
                                    ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30'
                                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border-strong)] border border-transparent'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                        <div className="h-5 w-px bg-[var(--border-strong)] mx-1" />
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'table' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            title={t('staff.table')}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'kanban' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            title={t('staff.kanban')}
                        >
                            <Layout size={16} />
                        </button>
                    </div>
                </div>
                <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('staff.searchTickets')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                        />
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{t('staff.ticketCount', { count: filteredTickets.length })}</p>
                </div>

                {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                        <VirtualTable
                            data={filteredTickets}
                            columns={ticketColumns}
                            rowHeight={56}
                            maxHeight={500}
                            keyExtractor={(t) => t.id}
                            emptyMessage={
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                    <Search size={32} className="mb-3 opacity-50" />
                                    <p>{t('staff.noTickets')}</p>
                                </div>
                            }
                        />
                    </div>
                )}

                {viewMode === 'kanban' && (
                    <div className="p-4 overflow-x-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[600px]">
                            {[
                                { id: 'open', label: t('staff.open'), border: 'border-l-[var(--danger)]', badge: 'bg-[var(--danger)]/10 text-[var(--danger)]' },
                                { id: 'in_progress', label: t('staff.inProgress'), border: 'border-l-[var(--accent-warm)]', badge: 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]' },
                                { id: 'waiting', label: t('staff.waiting'), border: 'border-l-[var(--accent)]', badge: 'bg-[var(--accent)]/10 text-[var(--accent)]' },
                                { id: 'closed', label: t('staff.closed'), border: 'border-l-[var(--success)]', badge: 'bg-[var(--success)]/10 text-[var(--success)]' },
                            ].map(col => (
                                <div key={col.id} className={`glass flex flex-col max-h-[500px] border-l-4 ${col.border} rounded-2xl overflow-hidden`}>
                                    <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${col.badge}`}>{col.label}</span>
                                        <span className="text-xs text-[var(--text-muted)]">{filteredTickets.filter(t => t.status === col.id).length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {filteredTickets.filter(t => t.status === col.id).map(ticket => {
                                            const priorityColor = ticket.priority === 'high' ? 'bg-red-500' : ticket.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                            return (
                                                <TiltCard
                                                    key={ticket.id}
                                                    onClick={() => openTicket(ticket)}
                                                    className={`w-full text-left luxury-card border-l-4 ${getPriorityBorder(ticket.priority)} p-3 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative group`}
                                                >
                                                    <div className="pl-2">
                                                        <p className="text-sm font-medium text-[var(--text)] mb-1">{ticket.subject}</p>
                                                        <p className="text-xs text-[var(--text-muted)] mb-2">{ticket.user}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full glass text-[10px] text-[var(--text)]">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${priorityColor}`} />
                                                                {getPriorityLabel(ticket.priority)}
                                                            </span>
                                                            <span className="text-[10px] text-[var(--text-muted)]">{ticket.time}</span>
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-1">
                                                            {ticket.assignedTo ? (
                                                                <div className="flex -space-x-1.5">
                                                                    <div className="w-5 h-5 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[9px] text-[var(--primary)] ring-2 ring-[var(--bg)]">
                                                                        {(ticket.assignedTo.split('@')[0] || 'S').slice(0,2).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-[var(--text-muted)]">{t('staff.unassigned')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="p-1.5 rounded-full bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--primary)]">
                                                            <Eye size={12} />
                                                        </div>
                                                    </div>
                                                </TiltCard>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* [P16-FIX] added: FAB with radial menu */}
            <div className="fixed bottom-6 right-6 z-40">
                <div className={`relative transition-all duration-300 ${fabOpen ? 'scale-100' : 'scale-0 opacity-0'}`}>
                    {[
                        { icon: Plus, label: t('staff.newTicket', 'Новый тикет'), color: 'bg-[var(--success)]', onClick: () => showToast(t('staff.creatingTicket', 'Создание тикета...')) },
                        { icon: Bot, label: '@omega', color: 'bg-[var(--primary)]', onClick: () => showToast('OMEGA вызвана') },
                        { icon: Filter, label: t('staff.filter', 'Фильтр'), color: 'bg-[var(--accent)]', onClick: () => showToast(t('staff.filter')) },
                        { icon: ArrowUpRight, label: t('staff.sort', 'Сортировка'), color: 'bg-[var(--accent-warm)]', onClick: () => showToast(t('staff.sort')) },
                    ].map((item, i) => {
                        const angle = (i * 90 + 180) * (Math.PI / 180)
                        const r = fabOpen ? 80 : 0
                        return (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className={`absolute w-11 h-11 rounded-full ${item.color} text-[var(--text-inverse)] shadow-lg flex items-center justify-center transition-all duration-300`}
                                style={{
                                    transform: `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`,
                                    transitionDelay: `${i * 30}ms`
                                }}
                                title={item.label}
                            >
                                <item.icon size={18} />
                            </button>
                        )
                    })}
                </div>
                <button
                    onClick={() => setFabOpen(v => !v)}
                    className={`w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-[var(--text-inverse)] shadow-xl flex items-center justify-center transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`}
                    aria-label={t('staff.quickActions', 'Быстрые действия')}
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: t('staff.moderation'), icon: Shield, desc: t('staff.moderationDesc', '5 жалоб на рассмотрении'), color: 'from-red-500/20 to-red-600/10', border: 'border-[var(--danger)]/20', onClick: () => setShowModerationModal(true) },
                    { label: t('staff.knowledge'), icon: BookOpen, desc: t('staff.knowledgeDesc', 'Ответы на частые вопросы'), color: 'from-blue-500/20 to-blue-600/10', border: 'border-[var(--accent)]/20', onClick: () => setShowKnowledgeModal(true) },
                    { label: t('staff.escalation'), icon: Zap, desc: t('staff.escalationDesc', 'Передать администратору'), color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-[var(--accent-warm)]/20', onClick: () => setShowEscalationModal(true) }
                ].map((action, i) => {
                    const Icon = action.icon
                    return (
                        <button
                            key={i}
                            onClick={action.onClick}
                            className={`group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${action.color} border ${action.border} hover:border-[var(--border-strong)] transition-all hover:scale-[1.02] text-left`}
                        >
                            <Icon size={28} className="mb-3 text-[var(--text)]/80" />
                            <h3 className="text-[var(--text)] font-semibold mb-1">{action.label}</h3>
                            <p className="text-[var(--text-muted)] text-sm">{action.desc}</p>
                        </button>
                    )
                })}
            </div>

            {/* ===== MODALS ===== */}

            {/* Ticket Detail Modal */}
            {showTicketModal && selectedTicket && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="p-5 border-b border-[var(--border-strong)] flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold">{t('staff.ticket')} #{selectedTicket.id}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{selectedTicket.subject}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusStyle(selectedTicket.status)}`}>
                                    {getStatusLabel(selectedTicket.status)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedTicket.status}
                                    onChange={e => setTicketStatus(e.target.value)}
                                    className={`px-2 py-1 rounded-lg text-xs border bg-[var(--surface)] outline-none ${getStatusStyle(selectedTicket.status)}`}
                                >
                                    <option value="open" className="bg-[var(--card)]">{t('staff.open')}</option>
                                    <option value="in_progress" className="bg-[var(--card)]">{t('staff.inProgress')}</option>
                                    <option value="waiting" className="bg-[var(--card)]">{t('staff.waiting')}</option>
                                    <option value="closed" className="bg-[var(--card)]">{t('staff.closed')}</option>
                                </select>
                                <select
                                    value={selectedTicket.priority}
                                    onChange={e => setTicketPriority(e.target.value)}
                                    className={`px-2 py-1 rounded-lg text-xs border bg-[var(--surface)] outline-none ${getPriorityStyle(selectedTicket.priority)}`}
                                >
                                    <option value="high" className="bg-[var(--card)]">{t('tasks.priorityHigh', 'Высокий')}</option>
                                    <option value="medium" className="bg-[var(--card)]">{t('tasks.priorityMedium', 'Средний')}</option>
                                    <option value="low" className="bg-[var(--card)]">{t('tasks.priorityLow', 'Низкий')}</option>
                                </select>
                                <button onClick={() => setShowTicketModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] ml-1"><X size={20} /></button>
                            </div>
                        </div>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4 pb-3 border-b border-[var(--border)]">
                                <User size={14} />
                                <span>{selectedTicket.user}</span>
                                <span className="mx-2">•</span>
                                <Clock size={14} />
                                <span>{selectedTicket.time}</span>
                                {selectedTicket.assignedTo && (
                                    <>
                                        <span className="mx-2">•</span>
                                        <span className="text-[var(--success)]">{t('staff.assigned')}: {selectedTicket.assignedTo}</span>
                                    </>
                                )}
                            </div>
                            {selectedTicket.messages.map((msg, i) => (
                                <div key={i} className={`flex gap-3 ${msg.from === 'staff' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.from === 'staff' ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                                        }`}>
                                        {msg.from === 'staff' ? 'S' : 'U'}
                                    </div>
                                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${msg.from === 'staff'
                                        ? 'bg-[var(--success)]/10 text-[var(--text)] rounded-tr-sm'
                                        : 'bg-[var(--surface)] text-[var(--text)] rounded-tl-sm'
                                        }`}>
                                        <p>{msg.text}</p>
                                        <p className={`text-xs mt-1 ${msg.from === 'staff' ? 'text-[var(--success)]/60' : 'text-[var(--text-muted)]'}`}>{msg.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Reply */}
                        {selectedTicket.status !== 'closed' && (
                            <div className="p-5 border-t border-[var(--border-strong)] flex-shrink-0">
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                    {[
                                        { label: t('staff.quickReplies.greetingLabel', 'Приветствие'), text: t('staff.quickReplies.greeting') },
                                        { label: t('staff.quickReplies.solvedLabel', 'Решено'), text: t('staff.quickReplies.solved') },
                                        { label: t('staff.quickReplies.needDataLabel', 'Нужны данные'), text: t('staff.quickReplies.needData') },
                                    ].map(q => (
                                        <button
                                            key={q.label}
                                            onClick={() => insertQuickReply(q.text)}
                                            className="px-2 py-1 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] text-xs hover:bg-[var(--border-strong)] hover:text-[var(--text)] transition-colors whitespace-nowrap"
                                        >
                                            {q.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && sendReply()}
                                        placeholder={t('staff.writeReply')}
                                        className="flex-1 px-4 py-2.5 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-[var(--success)] outline-none text-sm"
                                    />
                                    <button
                                        onClick={sendReply}
                                        disabled={!replyText.trim()}
                                        className="px-4 py-2.5 bg-[var(--success)] hover:bg-[var(--success)]/80 disabled:bg-[var(--text-muted)] text-[var(--text-inverse)] rounded-lg transition-all flex items-center gap-2"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Actions */}
                        <div className="p-5 border-t border-[var(--border-strong)] flex gap-2 flex-shrink-0">
                            {selectedTicket.status !== 'closed' ? (
                                <button onClick={closeTicket} className="flex-1 px-4 py-2 bg-[var(--success)]/10 text-[var(--success)] rounded-lg hover:bg-[var(--success)]/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} /> {t('staff.closeTicket')}
                                </button>
                            ) : (
                                <button onClick={reopenTicket} className="flex-1 px-4 py-2 bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] rounded-lg hover:bg-[var(--accent-warm)]/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <Unlock size={14} /> {t('staff.reopenTicket')}
                                </button>
                            )}
                            <button onClick={assignSelectedToMe} className="flex-1 px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                <User size={14} /> {t('staff.assignToMe')}
                            </button>
                            <button onClick={() => { setShowTicketModal(false); setShowEscalationModal(true) }} className="flex-1 px-4 py-2 bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] rounded-lg hover:bg-[var(--accent-warm)]/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                <Zap size={14} /> {t('staff.escalate')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Moderation Modal */}
            {showModerationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-[var(--danger)]" /> {t('staff.moderation')}</h2>
                                <button onClick={() => setShowModerationModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-3">
                                {reports.map(report => (
                                    <div key={report.id} className="luxury-card p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-medium">{report.user}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">{report.platform}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${report.status === 'pending' ? 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]' : 'bg-[var(--success)]/10 text-[var(--success)]'}`}>
                                                        {report.status === 'pending' ? t('staff.reportPending') : t('staff.reviewed')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[var(--text-muted)]">{report.content}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{report.date}</p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={() => handleReportAction(report.id, 'warn')} className="px-2 py-1 rounded bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] text-xs hover:bg-[var(--accent-warm)]/20">{t('staff.warn')}</button>
                                                <button onClick={() => handleReportAction(report.id, 'ban')} className="px-2 py-1 rounded bg-[var(--danger)]/10 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/20">{t('staff.ban')}</button>
                                                <button onClick={() => handleReportAction(report.id, 'dismiss')} className="px-2 py-1 rounded bg-[var(--border-strong)] text-[var(--text-muted)] text-xs hover:bg-[var(--surface)]">{t('staff.dismiss')}</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {reports.length === 0 && (
                                    <div className="text-center text-[var(--text-muted)] py-8">
                                        <CheckCircle2 size={32} className="mx-auto mb-3 text-[var(--success)]" />
                                        <p>{t('staff.allProcessed')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Knowledge Base Modal */}
            {showKnowledgeModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-[var(--border-strong)] flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen size={20} className="text-[var(--accent)]" /> {t('staff.knowledge')}</h2>
                                <button onClick={() => setShowKnowledgeModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder={t('staff.searchKnowledge', 'Поиск по базе знаний...')}
                                    value={kbSearch}
                                    onChange={e => setKbSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] focus:border-[var(--success)] outline-none text-sm"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {kbCategories.map(cat => {
                                    const Icon = cat.icon
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setKbCategory(cat.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${kbCategory === cat.id
                                                ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                                                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border-strong)] border border-transparent'
                                                }`}
                                        >
                                            <Icon size={12} /> {cat.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-3">
                                {filteredKb.map(article => (
                                    <div key={article.id} className="luxury-card p-4 hover:border-[var(--border-strong)] transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-medium text-sm">{article.title}</h3>
                                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                <Eye size={12} /> {t('staff.articleViews', { views: article.views })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)]">{article.content}</p>
                                    </div>
                                ))}
                                {filteredKb.length === 0 && (
                                    <div className="text-center text-[var(--text-muted)] py-8">
                                        <Search size={32} className="mx-auto mb-3 opacity-50" />
                                        <p>{t('staff.articlesNotFound')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Escalation Modal */}
            {showEscalationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Zap size={20} className="text-[var(--accent-warm)]" /> {t('staff.escalation')}</h2>
                                <button onClick={() => setShowEscalationModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('staff.reason')}</label>
                                    <select value={escalationForm.reason} onChange={e => setEscalationForm({ ...escalationForm, reason: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-[var(--success)] outline-none">
                                        <option value="">{t('staff.chooseReason', 'Выберите причину...')}</option>
                                        <option value="technical">{t('staff.reasons.technical')}</option>
                                        <option value="payment">{t('staff.reasons.payment')}</option>
                                        <option value="abuse">{t('staff.reasons.abuse')}</option>
                                        <option value="feature">{t('staff.reasons.feature')}</option>
                                        <option value="other">{t('staff.reasons.other')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('staff.priorityLabel')}</label>
                                    <select value={escalationForm.priority} onChange={e => setEscalationForm({ ...escalationForm, priority: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-[var(--success)] outline-none">
                                        <option value="low">{t('tasks.priorityLow', 'Низкий')}</option>
                                        <option value="medium">{t('tasks.priorityMedium', 'Средний')}</option>
                                        <option value="high">{t('tasks.priorityHigh', 'Высокий')}</option>
                                        <option value="critical">{t('staff.critical', 'Критический')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('staff.notes')}</label>
                                    <textarea value={escalationForm.notes} onChange={e => setEscalationForm({ ...escalationForm, notes: e.target.value })} placeholder={t('staff.notesPlaceholder', 'Дополнительная информация...')} rows={3} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-[var(--success)] outline-none resize-none text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowEscalationModal(false)} className="flex-1 px-4 py-2 bg-[var(--surface)] rounded-lg hover:bg-[var(--card-hover)] transition-colors">{t('common.cancel')}</button>
                                <button onClick={handleEscalation} disabled={!escalationForm.reason} className="flex-1 px-4 py-2 bg-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/80 disabled:bg-[var(--text-muted)] text-[var(--text-inverse)] font-medium rounded-lg transition-all">{t('staff.sendToAdmin')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StaffDashboardPage
