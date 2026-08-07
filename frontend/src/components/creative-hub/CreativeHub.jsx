// ============================================
// CreativeHub — v6.0 unified creative cockpit
// ============================================
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import useOmegaChat from '../../hooks/useOmegaChat.js'
import OmegaChat from '../omega/OmegaChat.jsx'
import {
    LayoutDashboard,
    MessageSquare,
    BarChart2,
    TrendingUp,
    Menu,
    Zap,
    Plus,
    Sparkles,
    X,
    ChevronUp,
    Target,
    Calendar,
    ImageIcon,
    PieChart,
} from 'lucide-react'

// [v6.0] added: role badge metadata (mirrors OmegaChat v5.9 style)
function getRoleMeta(role) {
    switch (role) {
        case 'owner': return { emoji: '👑', label: 'Owner', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }
        case 'admin': return { emoji: '🛡', label: 'Admin', color: 'text-red-400 bg-red-400/10 border-red-400/20' }
        case 'staff': return { emoji: '🎧', label: 'Staff', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' }
        case 'advertiser': return { emoji: '📢', label: 'Advertiser', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' }
        case 'creator': return { emoji: '🎨', label: 'Creator', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' }
        case 'business': return { emoji: '🏢', label: 'Business', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' }
        default: return { emoji: '👤', label: 'Client', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
    }
}

// [v6.0] added: role-based access map for Creative Hub tabs
const HUB_ACCESS = {
    owner: ['chat', 'analyzer', 'viral'],
    admin: ['chat', 'analyzer', 'viral'],
    staff: ['chat', 'analyzer'],
    advertiser: ['chat', 'analyzer', 'viral'],
    creator: ['chat', 'analyzer', 'viral'],
    business: ['chat', 'analyzer', 'viral'],
    client: ['chat'],
    guest: ['chat'],
}

// [v6.0] added: mode metadata
const MODE_META = {
    chat: {
        label: 'AI Chat',
        icon: MessageSquare,
        subtitle: 'Универсальный ассистент OMEGA',
        placeholder: 'Спроси что угодно...',
    },
    analyzer: {
        label: 'Content Analyzer',
        icon: BarChart2,
        subtitle: 'Анализ контента, ниши и конкурентов',
        placeholder: 'Вставь текст, ссылку или опиши нишу...',
    },
    viral: {
        label: 'Viral Studio',
        icon: TrendingUp,
        subtitle: 'Генерация хуков, постов и вирусных идей',
        placeholder: 'Введи тему или ссылку на тренд...',
    },
}

// [v6.0] added: creative toolbar templates
const TOOLBAR_TEMPLATES = [
    { id: 'post', emoji: '✍️', label: 'Пост', prompt: 'Напиши вирусный пост для соцсетей на тему: ' },
    { id: 'hook', emoji: '🔥', label: 'Хук', prompt: 'Придумай 10 цепляющих хуков для: ' },
    { id: 'cover', emoji: '🎨', label: 'Обложка', prompt: 'Создай концепцию обложки для: ' },
    { id: 'plan', emoji: '📅', label: 'План', prompt: 'Составь контент-план на неделю для: ' },
    { id: 'analyze', emoji: '🔍', label: 'Анализ', prompt: 'Проанализируй контент: ' },
    { id: 'stats', emoji: '📊', label: 'Статистика', prompt: 'Собери статистику и метрики по: ' },
]

// [v6.0] added: quick suggestion chips per mode
function getSuggestions(mode) {
    const chat = [
        { label: 'Идеи для Reels', prompt: 'Подбери 5 идей для Reels в моей нише' },
        { label: 'Вирусный пост', prompt: 'Создай вирусный пост на актуальную тему' },
        { label: 'Оптимизировать хук', prompt: 'Сделай этот заголовок более цепляющим' },
    ]
    const analyzer = [
        { label: 'Анализ ниши', prompt: 'Проанализируй мою нишу и конкурентов' },
        { label: 'Проверить текст', prompt: 'Проанализируй текст на вовлечённость' },
        { label: 'Тренды', prompt: 'Какие тренды актуальны для моей аудитории' },
    ]
    const viral = [
        { label: 'Трендовый хук', prompt: 'Создай хук на основе актуального тренда' },
        { label: 'Обложка Shorts', prompt: 'Создай концепцию обложки для Shorts' },
        { label: 'План публикаций', prompt: 'Составь вирусный план на неделю' },
    ]
    if (mode === 'analyzer') return analyzer
    if (mode === 'viral') return viral
    return chat
}

export default function CreativeHub() {
    const { user } = useAuth()
    const role = user?.role || 'client'
    const roleMeta = getRoleMeta(role)
    const allowedModes = useMemo(() => HUB_ACCESS[role] || HUB_ACCESS.client, [role])

    const [mode, setMode] = useState(() => allowedModes.includes('chat') ? 'chat' : allowedModes[0] || 'chat')
    const [mobilePanel, setMobilePanel] = useState(null) // 'sessions' | 'menu' | null
    const [showInsightsSheet, setShowInsightsSheet] = useState(false)

    // [v6.0] added: session list (stub; real persistence would live in backend/storage)
    const [sessions, setSessions] = useState([
        { id: '1', title: 'Новый чат', mode: 'chat', updatedAt: 'только что' },
        { id: '2', title: 'Анализ ниши', mode: 'analyzer', updatedAt: '2 мин назад' },
        { id: '3', title: 'Вирусная идея', mode: 'viral', updatedAt: 'вчера' },
    ])
    const [activeSessionId, setActiveSessionId] = useState('1')

    const chat = useOmegaChat()
    const meta = MODE_META[mode]
    const ModeIcon = meta.icon
    const suggestions = useMemo(() => getSuggestions(mode), [mode])

    // [v6.0] added: reset mode to allowed default if role changes
    useEffect(() => {
        if (!allowedModes.includes(mode)) {
            setMode(allowedModes.includes('chat') ? 'chat' : allowedModes[0] || 'chat')
        }
    }, [allowedModes, mode])

    const handleModeChange = useCallback((next) => {
        if (!allowedModes.includes(next)) return
        setMode(next)
        setMobilePanel(null)
    }, [allowedModes])

    const handleNewSession = useCallback(() => {
        const id = Date.now().toString()
        setSessions(prev => [
            { id, title: 'Новый чат', mode, updatedAt: 'только что' },
            ...prev,
        ])
        setActiveSessionId(id)
        chat.clearHistory()
        setMobilePanel(null)
    }, [chat, mode])

    const handleSelectSession = useCallback((s) => {
        setActiveSessionId(s.id)
        handleModeChange(s.mode)
        chat.clearHistory()
    }, [chat, handleModeChange])

    const handleToolbar = useCallback((basePrompt) => {
        const topic = chat.input.trim()
        if (topic) {
            chat.sendMessage(`${basePrompt}${topic}`)
        } else {
            chat.setInput(basePrompt)
        }
    }, [chat])

    const handleSuggestion = useCallback((prompt) => {
        chat.setInput(prompt)
        chat.sendMessage(prompt)
    }, [chat])

    const handleAutoPilot = useCallback(() => {
        chat.sendMessage('Запусти AutoPilot для текущего проекта')
    }, [chat])

    // [v6.0] added: swipe detection for mobile sessions/insights
    const touchStartRef = useRef(null)
    const handleTouchStart = useCallback((e) => {
        const t = e.touches[0]
        touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
    }, [])
    const handleTouchEnd = useCallback((e) => {
        const start = touchStartRef.current
        if (!start) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        const width = window.innerWidth
        const height = window.innerHeight

        if (absDx > absDy && absDx > 60) {
            if (start.x < 30 && dx > 0) setMobilePanel('sessions')
            else if (start.x > width - 30 && dx < 0) setShowInsightsSheet(true)
        }
        if (absDy > absDx && dy < -60 && start.y > height - 40) {
            setShowInsightsSheet(true)
        }
        touchStartRef.current = null
    }, [])

    // [v6.0] added: mode switcher tabs
    const ModeTabs = () => (
        <div className="flex flex-col gap-2">
            {(['chat', 'analyzer', 'viral']).map((key) => {
                if (!allowedModes.includes(key)) return null
                const m = MODE_META[key]
                const Icon = m.icon
                const active = mode === key
                return (
                    <button
                        key={key}
                        onClick={() => handleModeChange(key)}
                        className={[
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            active
                                ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30'
                                : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent',
                        ].join(' ')}
                    >
                        <Icon size={18} />
                        {m.label}
                    </button>
                )
            })}
        </div>
    )

    // [v6.0] added: sessions list card
    const SessionsCard = () => (
        <div className="glass-card flex flex-col gap-3 p-4 h-[55%] overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-100">Сессии</h3>
                <button
                    onClick={handleNewSession}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                    title="Новый чат"
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {sessions.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => handleSelectSession(s)}
                        className={[
                            'w-full text-left px-3 py-2.5 rounded-xl border transition-all',
                            activeSessionId === s.id
                                ? 'bg-white/10 border-white/20 text-gray-100'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20',
                        ].join(' ')}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{s.title}</span>
                            <span className="text-[10px] text-gray-500">{s.updatedAt}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{MODE_META[s.mode].label}</div>
                    </button>
                ))}
            </div>
        </div>
    )

    // [v6.0] added: insights stat cards and previews
    const InsightsColumn = () => (
        <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* stat cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3">
                    <div className="text-xs text-gray-400 mb-1">Вовлечённость</div>
                    <div className="text-xl font-bold text-gray-100">4.2%</div>
                    <div className="text-[10px] text-emerald-400 mt-1">+0.8% за неделю</div>
                </div>
                <div className="glass-card p-3">
                    <div className="text-xs text-gray-400 mb-1">Охваты</div>
                    <div className="text-xl font-bold text-gray-100">12.4K</div>
                    <div className="text-[10px] text-emerald-400 mt-1">+1.2K сегодня</div>
                </div>
            </div>

            {/* hooks */}
            <div className="glass-card p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    <Target size={16} className="text-violet-400" />
                    <h3 className="text-sm font-semibold text-gray-100">Хуки</h3>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                    {['5 ошибок, которые убивают ваш охват', 'Этот трюк изменил мои Reels', 'Почему ваш контент не залипает'].map((h, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200">
                            {h}
                        </div>
                    ))}
                </div>
            </div>

            {/* plan */}
            <div className="glass-card p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-semibold text-gray-100">План</h3>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                    {['Пн — разбор тренда', 'Ср — вирусный хук', 'Пт — карусель-гайд'].map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            {p}
                        </div>
                    ))}
                </div>
            </div>

            {/* preview placeholder */}
            <div className="glass-card p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-gray-100">Превью</h3>
                </div>
                <div className="h-24 rounded-xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-xs text-gray-400">
                    Preview placeholder
                </div>
            </div>
        </div>
    )

    return (
        <div className="dark min-h-screen luxury-mesh-bg text-[var(--text)] overflow-hidden">
            {/* [v6.0] added: top header */}
            <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-100">Creative Hub</h1>
                        <p className="text-[10px] text-gray-400 hidden sm:block">Версия 6.0 · OMEGA Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${roleMeta.color}`}>
                        <span>{roleMeta.emoji}</span>
                        <span>{roleMeta.label}</span>
                    </span>
                    {role === 'owner' && (
                        <button
                            onClick={handleAutoPilot}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-medium hover:bg-yellow-500/20 transition-colors"
                        >
                            <Zap size={14} />
                            ⚡ AutoPilot
                        </button>
                    )}
                </div>
            </header>

            {/* [v6.0] added: main responsive grid */}
            <main
                className="relative grid grid-cols-1 sm:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_320px] gap-4 p-4 h-[calc(100vh-64px)] pb-24 sm:pb-4"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* [v6.0] added: left column — desktop/tablet only */}
                <aside className="hidden sm:flex flex-col gap-4 h-full overflow-hidden">
                    <SessionsCard />
                    <div className="glass-card p-4 flex-1 overflow-hidden flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-100 mb-3">Режимы</h3>
                        <ModeTabs />
                    </div>
                </aside>

                {/* [v6.0] added: middle column — universal AI chat */}
                <section className="flex flex-col h-full overflow-hidden min-w-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                                <ModeIcon size={18} className="text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-100">{meta.label}</h2>
                                <p className="text-xs text-gray-400">{meta.subtitle}</p>
                            </div>
                        </div>

                        {/* [v6.0] added: suggestion chips */}
                        <div className="hidden md:flex items-center gap-2">
                            {suggestions.slice(0, 2).map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestion(s.prompt)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-violet-500/30 transition-all whitespace-nowrap"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 rounded-2xl border border-white/10 overflow-x-hidden shadow-2xl shadow-violet-900/10">
                        <OmegaChat {...chat} variant="fullscreen" />
                    </div>

                    {/* [v6.0] added: AI Creative Toolbar */}
                    <div className="mt-3 glass-card p-2 sm:p-3">
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {TOOLBAR_TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleToolbar(t.prompt)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-200 transition-all whitespace-nowrap flex-shrink-0"
                                >
                                    <span>{t.emoji}</span>
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* [v6.0] added: right column — desktop only */}
                <aside className="hidden lg:flex h-full overflow-hidden">
                    <InsightsColumn />
                </aside>
            </main>

            {/* [v6.0] added: insights toggle for tablet/mobile */}
            <button
                onClick={() => setShowInsightsSheet(true)}
                className="fixed bottom-20 left-4 z-30 lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium shadow-lg shadow-violet-600/30 sm:bottom-4 sm:left-auto sm:right-4"
            >
                <PieChart size={14} />
                Insights
            </button>

            {/* [v6.0] added: insights bottom sheet */}
            {showInsightsSheet && (
                <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setShowInsightsSheet(false)}>
                    <div
                        className="absolute bottom-16 sm:bottom-0 left-0 right-0 sm:max-w-2xl sm:mx-auto max-h-[70vh] bg-[var(--bg-secondary)]/95 border border-white/10 rounded-t-2xl p-4 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-100">Insights</h3>
                            <button
                                onClick={() => setShowInsightsSheet(false)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                            >
                                <ChevronUp size={16} />
                            </button>
                        </div>
                        <InsightsColumn />
                    </div>
                </div>
            )}

            {/* [v6.0] added: mobile bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-t border-white/10 z-50 sm:hidden safe-bottom">
                <div className="grid grid-cols-5 h-full">
                    <button
                        onClick={() => setMobilePanel(p => p === 'sessions' ? null : 'sessions')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mobilePanel === 'sessions' ? 'text-violet-400' : 'text-gray-400'}`}
                    >
                        <LayoutDashboard size={20} />
                        Hub
                    </button>
                    <button
                        onClick={() => handleModeChange('chat')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mode === 'chat' ? 'text-violet-400' : 'text-gray-400'}`}
                    >
                        <MessageSquare size={20} />
                        Chat
                    </button>
                    <button
                        onClick={() => handleModeChange('analyzer')}
                        disabled={!allowedModes.includes('analyzer')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mode === 'analyzer' ? 'text-violet-400' : 'text-gray-400'} ${!allowedModes.includes('analyzer') ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                        <BarChart2 size={20} />
                        Analyzer
                    </button>
                    <button
                        onClick={() => handleModeChange('viral')}
                        disabled={!allowedModes.includes('viral')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mode === 'viral' ? 'text-violet-400' : 'text-gray-400'} ${!allowedModes.includes('viral') ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                        <TrendingUp size={20} />
                        Viral
                    </button>
                    <button
                        onClick={() => setMobilePanel(p => p === 'menu' ? null : 'menu')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mobilePanel === 'menu' ? 'text-violet-400' : 'text-gray-400'}`}
                    >
                        <Menu size={20} />
                        Menu
                    </button>
                </div>
            </nav>

            {/* [v6.0] added: mobile FAB for new chat */}
            <button
                onClick={handleNewSession}
                className="fixed bottom-20 right-4 z-40 sm:hidden w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 hover:scale-105 transition-transform"
                title="Новый чат"
            >
                <Plus size={22} />
            </button>

            {/* [v6.0] added: mobile sessions drawer */}
            {mobilePanel === 'sessions' && (
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMobilePanel(null)}>
                    <div className="absolute inset-y-0 left-0 w-[280px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">Creative Hub</h2>
                            <button onClick={() => setMobilePanel(null)} className="p-1.5 rounded-lg bg-white/5 text-gray-300"><X size={18} /></button>
                        </div>
                        <SessionsCard />
                        <div className="glass-card p-4 flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-sm font-semibold text-gray-100 mb-3">Режимы</h3>
                            <ModeTabs />
                        </div>
                    </div>
                </div>
            )}

            {/* [v6.0] added: mobile menu drawer */}
            {mobilePanel === 'menu' && (
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMobilePanel(null)}>
                    <div className="absolute inset-y-0 right-0 w-[260px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-l border-white/10 p-4 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">Меню</h2>
                            <button onClick={() => setMobilePanel(null)} className="p-1.5 rounded-lg bg-white/5 text-gray-300"><X size={18} /></button>
                        </div>
                        <div className="glass-card p-4">
                            <div className="text-xs text-gray-400 mb-2">Роль</div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${roleMeta.color}`}>
                                <span>{roleMeta.emoji}</span>
                                <span>{roleMeta.label}</span>
                            </span>
                        </div>
                        {role === 'owner' && (
                            <button
                                onClick={() => { handleAutoPilot(); setMobilePanel(null) }}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm font-medium"
                            >
                                <Zap size={16} />
                                ⚡ AutoPilot
                            </button>
                        )}
                        <button
                            onClick={() => { setShowInsightsSheet(true); setMobilePanel(null) }}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-sm font-medium"
                        >
                            <PieChart size={16} />
                            Insights
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
