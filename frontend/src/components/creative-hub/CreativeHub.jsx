// ============================================
// CreativeHub — v6.0 unified creative cockpit
// ============================================
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../hooks/useTranslation.js'
import useOmegaChat from '../../hooks/useOmegaChat.js'
import OmegaChat from '../omega/OmegaChat.jsx'
import LuxeHubChat from '../chat-pro/LuxeHubChat.jsx' // [CHAT-PRO З1] режим chat → «Люкс-хаб» (выбор владельца)
import { HouseAdSlot } from '../ads/HouseAdSlot.jsx' // [HOTFIX-FINAL-2 З6]
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
    ChevronRight,
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

// [v6.0] added: mode metadata (labelKey/subtitleKey — i18n, [CHAT-UNIFY])
const MODE_META = {
    chat: {
        labelKey: 'hub.mode.chat',
        icon: MessageSquare,
        subtitleKey: 'hub.sub.chat',
    },
    analyzer: {
        labelKey: 'hub.mode.analyzer',
        icon: BarChart2,
        subtitleKey: 'hub.sub.analyzer',
    },
    viral: {
        labelKey: 'hub.mode.viral',
        icon: TrendingUp,
        subtitleKey: 'hub.sub.viral',
    },
}

// [v6.0] added: creative toolbar templates (prompt — инструкция для OMEGA, остаётся RU; label — i18n)
const TOOLBAR_TEMPLATES = [
    { id: 'post', emoji: '✍️', labelKey: 'hub.toolbar.post', prompt: 'Напиши вирусный пост для соцсетей на тему: ' },
    { id: 'hook', emoji: '🔥', labelKey: 'hub.toolbar.hook', prompt: 'Придумай 10 цепляющих хуков для: ' },
    { id: 'cover', emoji: '🎨', labelKey: 'hub.toolbar.cover', prompt: 'Создай концепцию обложки для: ' },
    { id: 'plan', emoji: '📅', labelKey: 'hub.toolbar.plan', prompt: 'Составь контент-план на неделю для: ' },
    { id: 'analyze', emoji: '🔍', labelKey: 'hub.toolbar.analyze', prompt: 'Проанализируй контент: ' },
    { id: 'stats', emoji: '📊', labelKey: 'hub.toolbar.stats', prompt: 'Собери статистику и метрики по: ' },
]

// [v6.0] added: quick suggestion chips per mode (labelKey — i18n; prompt — RU-инструкция для OMEGA)
function getSuggestions(mode) {
    const chat = [
        { labelKey: 'hub.sug.reelsIdeas', prompt: 'Подбери 5 идей для Reels в моей нише' },
        { labelKey: 'hub.sug.viralPost', prompt: 'Создай вирусный пост на актуальную тему' },
        { labelKey: 'hub.sug.optimizeHook', prompt: 'Сделай этот заголовок более цепляющим' },
    ]
    const analyzer = [
        { labelKey: 'hub.sug.nicheAnalysis', prompt: 'Проанализируй мою нишу и конкурентов' },
        { labelKey: 'hub.sug.checkText', prompt: 'Проанализируй текст на вовлечённость' },
        { labelKey: 'hub.sug.trends', prompt: 'Какие тренды актуальны для моей аудитории' },
    ]
    const viral = [
        { labelKey: 'hub.sug.trendHook', prompt: 'Создай хук на основе актуального тренда' },
        { labelKey: 'hub.sug.shortsCover', prompt: 'Создай концепцию обложки для Shorts' },
        { labelKey: 'hub.sug.postingPlan', prompt: 'Составь вирусный план на неделю' },
    ]
    if (mode === 'analyzer') return analyzer
    if (mode === 'viral') return viral
    return chat
}

export default function CreativeHub() {
    const { user } = useAuth()
    const { t } = useTranslation()
    const { mode: routeMode } = useParams()
    const navigate = useNavigate()
    const role = user?.role || 'client'
    const roleMeta = getRoleMeta(role)
    const allowedModes = useMemo(() => HUB_ACCESS[role] || HUB_ACCESS.client, [role])

    // [CHAT-UNIFY] стартовый режим — из URL (:mode), иначе первый доступный
    const [mode, setMode] = useState(() => {
        if (routeMode && MODE_META[routeMode] && allowedModes.includes(routeMode)) return routeMode
        return allowedModes.includes('chat') ? 'chat' : allowedModes[0] || 'chat'
    })
    const [mobilePanel, setMobilePanel] = useState(null) // 'sessions' | 'menu' | null
    const [showInsightsSheet, setShowInsightsSheet] = useState(false)
    const [insightsCollapsed, setInsightsCollapsed] = useState(false)
    // [CHAT-PRO-REWORK] режим chat = чистый «Люкс-хаб» без панелей; Сессии/Режимы/Инсайты — в шторке
    const [chatDrawerOpen, setChatDrawerOpen] = useState(false)
    // [CHAT-PRO-FIX З1] ВСЕ режимы хаба (chat/analyzer/viral) — единая люкс-компоновка: чистая лента +
    // кольцо баланса справа, без панелей; меняются только шапка/подсказки/плейсхолдер режима.
    // Старые экраны режимов (grid + панели) НЕ удалены (ждут ✅ владельца), но недостижимы: isLuxeLayout всегда true.
    const isLuxeLayout = true
    // [CHAT-PRO-FIX З6] управление сессиями в шторке: ⋯ меню (долгий тап на мобайле) → переименовать/удалить
    const [sessionMenuId, setSessionMenuId] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [renamingId, setRenamingId] = useState(null)
    const [renameText, setRenameText] = useState('')

    // [v6.0] added: session list (stub; real persistence would live in backend/storage)
    const [sessions, setSessions] = useState([
        { id: '1', title: t('hub.newChat'), mode: 'chat', updatedAt: '—' },
        { id: '2', title: t('hub.sug.nicheAnalysis'), mode: 'analyzer', updatedAt: '—' },
        { id: '3', title: t('hub.sug.viralPost'), mode: 'viral', updatedAt: '—' },
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

    // [CHAT-UNIFY] режим Hub живёт в URL (/creative-hub/:mode): боковое меню, back/forward, прямые ссылки.
    // Без этого клик «Анализ контента» менял адрес, но страница не переключалась.
    useEffect(() => {
        if (!routeMode) return
        if (!MODE_META[routeMode]) {
            navigate('/creative-hub/chat', { replace: true })
            return
        }
        if (!allowedModes.includes(routeMode)) {
            navigate(`/creative-hub/${allowedModes.includes('chat') ? 'chat' : allowedModes[0]}`, { replace: true })
            return
        }
        if (routeMode !== mode) setMode(routeMode)
    }, [routeMode, allowedModes, mode, navigate])

    const handleModeChange = useCallback((next) => {
        if (!allowedModes.includes(next)) return
        setMode(next)
        if (routeMode !== next) navigate(`/creative-hub/${next}`)
        setMobilePanel(null)
        setChatDrawerOpen(false)
    }, [allowedModes, routeMode, navigate])

    // [CHAT-PRO-REWORK] Esc закрывает шторку Люкс-хаба
    useEffect(() => {
        if (!chatDrawerOpen) return
        const onKey = (e) => { if (e.key === 'Escape') setChatDrawerOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [chatDrawerOpen])

    const handleNewSession = useCallback(() => {
        const id = Date.now().toString()
        setSessions(prev => [
            { id, title: t('hub.newChat'), mode, updatedAt: '—' },
            ...prev,
        ])
        setActiveSessionId(id)
        chat.clearHistory()
        setMobilePanel(null)
        setChatDrawerOpen(false)
    }, [chat, mode, t])

    const handleSelectSession = useCallback((s) => {
        setActiveSessionId(s.id)
        handleModeChange(s.mode)
        chat.clearHistory()
        setChatDrawerOpen(false)
    }, [chat, handleModeChange])

    // [CHAT-PRO-FIX З6] переименование/удаление сессии — только своих (сессии локальные, свои по построению)
    const handleRenameSession = useCallback((id) => {
        const title = renameText.trim()
        if (title) setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
        setRenamingId(null)
        setSessionMenuId(null)
    }, [renameText])

    const handleDeleteSession = useCallback((id) => {
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id)
            if (id === activeSessionId) {
                const fallback = next[0]
                if (fallback) {
                    setActiveSessionId(fallback.id)
                    handleModeChange(fallback.mode)
                }
                chat.clearHistory()
            }
            return next.length ? next : [{ id: Date.now().toString(), title: t('hub.newChat'), mode, updatedAt: '—' }]
        })
        setConfirmDeleteId(null)
        setSessionMenuId(null)
    }, [activeSessionId, chat, handleModeChange, mode, t])

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
            // [CHAT-PRO-FIX З4] в люкс-компоновке свайп с левого края открывает шторку «Меню чата»
            if (isLuxeLayout) {
                if (start.x < 30 && dx > 0) setChatDrawerOpen(true)
            } else {
                if (start.x < 30 && dx > 0) setMobilePanel('sessions')
                else if (start.x > width - 30 && dx < 0) setShowInsightsSheet(true)
            }
        }
        if (!isLuxeLayout && absDy > absDx && dy < -60 && start.y > height - 40) {
            setShowInsightsSheet(true)
        }
        touchStartRef.current = null
    }, [isLuxeLayout])

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
                        {t(m.labelKey)}
                    </button>
                )
            })}
        </div>
    )

    // [v6.0] added: sessions list card
    // [CHAT-PRO-FIX З6.1] ⋯ меню сессии (и долгий тап на мобайле): «Переименовать» / «Удалить» (с подтверждением)
    const sessionLongPress = useRef(null)
    const sessionTouchStart = (id) => {
        clearTimeout(sessionLongPress.current)
        sessionLongPress.current = setTimeout(() => setSessionMenuId(id), 500)
    }
    const sessionTouchEnd = () => clearTimeout(sessionLongPress.current)

    const SessionsCard = () => (
        <div className="glass-card flex flex-col gap-3 p-4 h-[55%] overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-100">{t('hub.sessions')}</h3>
                <button
                    onClick={handleNewSession}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                    title={t('hub.newChat')}
                    aria-label={t('hub.newChat')}
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {sessions.map((s) => (
                    <div
                        key={s.id}
                        className={[
                            'relative w-full text-left px-3 py-2.5 rounded-xl border transition-all',
                            activeSessionId === s.id
                                ? 'bg-white/10 border-white/20 text-gray-100'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20',
                        ].join(' ')}
                        onTouchStart={() => sessionTouchStart(s.id)}
                        onTouchEnd={sessionTouchEnd}
                        onTouchMove={sessionTouchEnd}
                        onContextMenu={(e) => { e.preventDefault(); setSessionMenuId(s.id) }}
                    >
                        {renamingId === s.id ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    autoFocus
                                    value={renameText}
                                    onChange={(e) => setRenameText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSession(s.id); if (e.key === 'Escape') setRenamingId(null) }}
                                    aria-label={t('chatPro.rename')}
                                    className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-100 outline-none"
                                />
                                <button onClick={() => handleRenameSession(s.id)} aria-label={t('chatPro.save')} className="min-w-[32px] min-h-[32px] rounded-lg bg-violet-500/20 text-violet-200 text-xs px-2">{t('chatPro.save')}</button>
                            </div>
                        ) : (
                            <button className="w-full text-left" onClick={() => handleSelectSession(s)}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium truncate">{s.title}</span>
                                    <span className="text-[10px] text-gray-500">{s.updatedAt}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{t(MODE_META[s.mode].labelKey)}</div>
                            </button>
                        )}
                        <button
                            onClick={() => setSessionMenuId(sessionMenuId === s.id ? null : s.id)}
                            aria-label={t('chatPro.sessionActions')}
                            aria-expanded={sessionMenuId === s.id}
                            className="absolute top-1.5 right-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            ⋯
                        </button>
                        {sessionMenuId === s.id && renamingId !== s.id && (
                            <div className="absolute right-2 top-10 z-10 rounded-xl border border-white/10 bg-[#1a1a24] shadow-xl p-1.5 flex flex-col gap-1 min-w-[170px]" role="menu">
                                <button role="menuitem" onClick={() => { setRenamingId(s.id); setRenameText(s.title) }} className="px-3 py-2 rounded-lg text-left text-sm text-gray-200 hover:bg-white/10">{t('chatPro.rename')}</button>
                                {confirmDeleteId === s.id ? (
                                    <div className="px-3 py-2 text-xs text-gray-300">
                                        <div className="mb-2">{t('chatPro.confirmDeleteSession')}</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDeleteSession(s.id)} className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300">{t('chatPro.yesDelete')}</button>
                                            <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300">{t('common.cancel', 'Отмена')}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button role="menuitem" onClick={() => setConfirmDeleteId(s.id)} className="px-3 py-2 rounded-lg text-left text-sm text-rose-300 hover:bg-rose-500/10">{t('chatPro.delete')}</button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )

    // [chat-hotfix] unified insights panel: tabs + honest empty states (no stub data)
    const INSIGHTS_TABS = [
        { id: 'metrics', icon: PieChart, labelKey: 'hub.tab.metrics', emptyKey: 'hub.empty.metrics' },
        { id: 'hooks', icon: Target, labelKey: 'hub.tab.hooks', emptyKey: 'hub.empty.hooks' },
        { id: 'plan', icon: Calendar, labelKey: 'hub.tab.plan', emptyKey: 'hub.empty.plan' },
        { id: 'preview', icon: ImageIcon, labelKey: 'hub.tab.preview', emptyKey: 'hub.empty.preview' },
    ]

    const InsightsPanel = () => {
        const [activeTab, setActiveTab] = useState('metrics')
        const current = INSIGHTS_TABS.find(tab => tab.id === activeTab) || INSIGHTS_TABS[0]
        const EmptyIcon = current.icon
        return (
            <div className="glass-card flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex items-center gap-1 p-2 border-b border-white/10">
                    {INSIGHTS_TABS.map((tab) => {
                        const TabIcon = tab.icon
                        const active = tab.id === activeTab
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={[
                                    'flex-1 flex items-center justify-center gap-1.5 px-2 min-h-[40px] rounded-lg text-xs font-medium transition-all',
                                    active
                                        ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30'
                                        : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent',
                                ].join(' ')}
                            >
                                <TabIcon size={14} />
                                <span className="hidden 2xl:inline">{t(tab.labelKey)}</span>
                            </button>
                        )
                    })}
                </div>
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <EmptyIcon size={20} className="text-violet-300" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-200">{t(current.labelKey)}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">{t(current.emptyKey)}</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`${isLuxeLayout ? 'chat-pro-page flex flex-col flex-1 min-h-0 w-full' : 'dark luxury-mesh-bg min-h-screen'} text-[var(--text)] overflow-hidden`}>
            {/* [v6.0] added: top header (в режиме chat скрыт — его функции (роль, AutoPilot) переехали в шторку Люкс-хаба) */}
            {!isLuxeLayout && (
            <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-100">{t('hub.title')}</h1>
                        <p className="text-[10px] text-gray-400 hidden sm:block">{t('hub.version')}</p>
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
            )}

            {/* [v6.0] added: main responsive grid (в режиме chat — одна центрированная колонка эталона, max-w 1060,
                flex-1 min-h-0: высота ровно по вьюпорту от шелла, страница не скроллится) */}
            <main
                className={isLuxeLayout
                    ? 'relative p-4 max-w-[1060px] mx-auto w-full flex-1 min-h-0 flex flex-col'
                    : `relative grid grid-cols-1 sm:grid-cols-[280px_1fr] ${insightsCollapsed ? '' : 'xl:grid-cols-[280px_1fr_320px]'} gap-4 p-4 h-[calc(100vh-64px)] pb-24 sm:pb-4`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* [v6.0] added: left column — desktop/tablet only (в режиме chat скрыта — эталон без панелей; в шторке) */}
                {!isLuxeLayout && (
                <aside className="hidden sm:flex flex-col gap-4 h-full overflow-hidden">
                    <SessionsCard />
                    <div className="glass-card p-4 flex-1 overflow-hidden flex flex-col" data-tour="hub-modes">
                        <h3 className="text-sm font-semibold text-gray-100 mb-3">{t('hub.modes')}</h3>
                        <ModeTabs />
                    </div>
                </aside>
                )}

                {/* [v6.0] added: middle column — universal AI chat */}
                <section className={`flex flex-col overflow-hidden min-w-0 ${isLuxeLayout ? 'flex-1 min-h-0' : 'h-full'}`}>
                    {/* [CHAT-PRO З1] в режиме chat шапку режима заменяет люкс-шапка LuxeHubChat (чипы-подсказки перенесены туда).
                        [CHAT-PRO-FIX З1] старый заголовок режима — только в старой (недостижимой) компоновке */}
                    {!isLuxeLayout && mode !== 'chat' && (
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                                <ModeIcon size={18} className="text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-100">{t(meta.labelKey)}</h2>
                                <p className="text-xs text-gray-400">{t(meta.subtitleKey)}</p>
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
                                    {t(s.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* [HOTFIX-FINAL-2 З6] house-ads топ-баннер чата ≤34px: занимает своё место над
                        лентой, инпут не сдвигает (на мобиле вместо нижней плашки — она бы перекрыла FAB) */}
                    <div className="mb-2">
                        <HouseAdSlot slot="chat-top" variant="banner" />
                    </div>

                    {/* [CHAT-PRO-FIX З1] ВСЕ режимы — Люкс-хаб (меняются шапка/плейсхолдер/подсказки режима).
                        Старый fullscreen-вариант сохранён в мёртвой ветке до ✅ владельца */}
                    {!isLuxeLayout && mode !== 'chat' ? (
                        <div className="flex-1 min-h-0 rounded-2xl border border-white/10 overflow-x-hidden shadow-2xl shadow-violet-900/10">
                            <OmegaChat {...chat} variant="fullscreen" />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0">
                            <LuxeHubChat
                                chat={chat}
                                suggestions={suggestions}
                                onSuggestion={handleSuggestion}
                                mode={mode}
                                modeLabel={t(meta.labelKey)}
                                inputPlaceholder={t(meta.subtitleKey)}
                                modes={allowedModes.map(k => ({ key: k, ...MODE_META[k] }))}
                                onModeChange={handleModeChange}
                                onOpenMenu={() => setChatDrawerOpen(true)}
                                onClearHistory={chat.clearHistory}
                            />
                        </div>
                    )}

                    {/* [v6.0] added: AI Creative Toolbar */}
                    <div className="mt-3 glass-card p-2 sm:p-3">
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {TOOLBAR_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    onClick={() => handleToolbar(tpl.prompt)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-200 transition-all whitespace-nowrap flex-shrink-0"
                                >
                                    <span>{tpl.emoji}</span>
                                    <span>{t(tpl.labelKey)}</span>
                                    {/* [DESIGN-LAB-APPLY] Студия: цена инструмента до запуска (реальный тариф квоты) */}
                                    <span className="text-[10px] font-semibold text-violet-300" title={t('quota.perMessage')}>1✦</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* [chat-hotfix] right column — single unified panel, collapsible, xl+ only (в режиме chat скрыта — в шторке) */}
                {!isLuxeLayout && !insightsCollapsed && (
                    <aside className="hidden xl:flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-sm font-semibold text-gray-100">{t('hub.insights')}</h3>
                            <button
                                onClick={() => setInsightsCollapsed(true)}
                                title={t('hub.collapse')}
                                aria-label={t('hub.collapse')}
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <InsightsPanel />
                    </aside>
                )}
            </main>

            {/* [chat-hotfix] insights toggle — below xl (bottom sheet) or when desktop panel is collapsed
                (в режиме chat скрыт — Инсайты в шторке Люкс-хаба) */}
            {!isLuxeLayout && (
            <button
                onClick={() => insightsCollapsed ? setInsightsCollapsed(false) : setShowInsightsSheet(true)}
                className={`fixed bottom-20 left-4 z-30 items-center gap-2 px-4 min-h-[44px] rounded-xl bg-violet-600 text-white text-xs font-medium shadow-lg shadow-violet-600/30 hover:bg-violet-500 active:scale-95 transition sm:bottom-4 sm:left-auto sm:right-4 ${insightsCollapsed ? 'hidden xl:flex' : 'flex xl:hidden'}`}
            >
                <PieChart size={14} />
                {t('hub.insights')}
            </button>
            )}

            {/* [v6.0] added: insights bottom sheet */}
            {!isLuxeLayout && showInsightsSheet && (
                <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden" onClick={() => setShowInsightsSheet(false)}>
                    <div
                        className="absolute bottom-16 sm:bottom-0 left-0 right-0 sm:max-w-2xl sm:mx-auto max-h-[70vh] bg-[var(--bg-secondary)]/95 border border-white/10 rounded-t-2xl p-4 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-100">{t('hub.insights')}</h3>
                            <button
                                onClick={() => setShowInsightsSheet(false)}
                                aria-label={t('hub.collapse')}
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                            >
                                <ChevronUp size={16} />
                            </button>
                        </div>
                        <InsightsPanel />
                    </div>
                </div>
            )}

            {/* [v6.0] added: mobile bottom navigation (в режиме chat скрыта — режимы в шапке Люкс-хаба, остальное в шторке) */}
            {!isLuxeLayout && (
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-t border-white/10 z-50 sm:hidden safe-bottom">
                <div className="grid grid-cols-5 h-full">
                    <button
                        onClick={() => setMobilePanel(p => p === 'sessions' ? null : 'sessions')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mobilePanel === 'sessions' ? 'text-violet-400' : 'text-gray-400'}`}
                    >
                        <LayoutDashboard size={20} />
                        {t('hub.bottom.hub')}
                    </button>
                    <button
                        onClick={() => handleModeChange('chat')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mode === 'chat' ? 'text-violet-400' : 'text-gray-400'}`}
                    >
                        <MessageSquare size={20} />
                        {t('hub.bottom.chat')}
                    </button>
                    <button
                        onClick={() => handleModeChange('analyzer')}
                        disabled={!allowedModes.includes('analyzer')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mode === 'analyzer' ? 'text-violet-400' : 'text-gray-400'} ${!allowedModes.includes('analyzer') ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                        <BarChart2 size={20} />
                        {t('hub.bottom.analyzer')}
                    </button>
                    <button
                        onClick={() => handleModeChange('viral')}
                        disabled={!allowedModes.includes('viral')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mode === 'viral' ? 'text-violet-400' : 'text-gray-400'} ${!allowedModes.includes('viral') ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                        <TrendingUp size={20} />
                        {t('hub.bottom.viral')}
                    </button>
                    <button
                        onClick={() => setMobilePanel(p => p === 'menu' ? null : 'menu')}
                        className={`flex flex-col items-center justify-center gap-1 text-xs ${mobilePanel === 'menu' ? 'text-violet-400' : 'text-gray-400'}`}
                    >
                        <Menu size={20} />
                        {t('hub.bottom.menu')}
                    </button>
                </div>
            </nav>
            )}

            {/* [v6.0] added: mobile FAB for new chat (в режиме chat скрыт — «Новый чат» в шторке) */}
            {!isLuxeLayout && (
            <button
                onClick={handleNewSession}
                className="fixed bottom-20 right-4 z-40 sm:hidden w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 hover:scale-105 transition-transform"
                title={t('hub.newChat')}
            >
                <Plus size={22} />
            </button>
            )}

            {/* [CHAT-PRO-REWORK + FIX З4] шторка Люкс-хаба СЛЕВА (все ширины, Esc/✕/клик по фону закрывает,
                на мобайле открывается свайпом с левого края): Сессии (новый чат/переименовать/удалить),
                Режимы, Инсайты, бейдж роли, AutoPilot. Панель НЕПРОЗРАЧНАЯ (solid из темы, .chat-pro-drawer),
                ≤360px, скролл внутри, анимация ≤300ms (reduced-motion — без неё) */}
            {isLuxeLayout && chatDrawerOpen && (
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setChatDrawerOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('chatPro.menu')}
                        className="chat-pro-drawer absolute inset-y-0 left-0 w-[340px] max-w-[min(88vw,360px)] border-r border-white/10 p-4 flex flex-col gap-4 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">{t('chatPro.menu')}</h2>
                            <button
                                onClick={() => setChatDrawerOpen(false)}
                                aria-label={t('common.close', 'Закрыть')}
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${roleMeta.color}`}>
                                <span>{roleMeta.emoji}</span>
                                <span>{roleMeta.label}</span>
                            </span>
                            {role === 'owner' && (
                                <button
                                    onClick={() => { handleAutoPilot(); setChatDrawerOpen(false) }}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm font-medium"
                                >
                                    <Zap size={16} />
                                    ⚡ AutoPilot
                                </button>
                            )}
                        </div>
                        <div className="h-[240px] shrink-0"><SessionsCard /></div>
                        <div className="glass-card p-4 shrink-0" data-tour="hub-modes">
                            <h3 className="text-sm font-semibold text-gray-100 mb-3">{t('hub.modes')}</h3>
                            <ModeTabs />
                        </div>
                        <div className="min-h-[220px] flex flex-col shrink-0">
                            <h3 className="text-sm font-semibold text-gray-100 mb-2 px-1">{t('hub.insights')}</h3>
                            <InsightsPanel />
                        </div>
                    </div>
                </div>
            )}

            {/* [v6.0] added: mobile sessions drawer (режимы analyzer/viral; в chat — шторка выше) */}
            {!isLuxeLayout && mobilePanel === 'sessions' && (
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMobilePanel(null)}>
                    <div className="absolute inset-y-0 left-0 w-[280px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">{t('hub.title')}</h2>
                            <button onClick={() => setMobilePanel(null)} className="p-2 rounded-lg bg-white/5 text-gray-300"><X size={18} /></button>
                        </div>
                        <SessionsCard />
                        <div className="glass-card p-4 flex-1 overflow-hidden flex flex-col" data-tour="hub-modes">
                            <h3 className="text-sm font-semibold text-gray-100 mb-3">{t('hub.modes')}</h3>
                            <ModeTabs />
                        </div>
                    </div>
                </div>
            )}

            {/* [v6.0] added: mobile menu drawer (режимы analyzer/viral; в chat — шторка выше) */}
            {!isLuxeLayout && mobilePanel === 'menu' && (
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMobilePanel(null)}>
                    <div className="absolute inset-y-0 right-0 w-[260px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-l border-white/10 p-4 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">{t('hub.menu')}</h2>
                            <button onClick={() => setMobilePanel(null)} className="p-2 rounded-lg bg-white/5 text-gray-300"><X size={18} /></button>
                        </div>
                        <div className="glass-card p-4">
                            <div className="text-xs text-gray-400 mb-2">{t('hub.role')}</div>
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
                            {t('hub.insights')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
