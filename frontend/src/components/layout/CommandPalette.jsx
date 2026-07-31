import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
    Search, Home, BarChart3, Bot, Calendar, Settings, User, LogOut,
    Crown, Shield, Briefcase, Megaphone, DollarSign, CreditCard,
    CheckSquare, Brain, KeyRound, Bell, HelpCircle, Zap, MessageSquare,
    FileText, Server, RefreshCw, Plug, Newspaper, Gift, Share2, Lock,
    Monitor, Database, Wallet, BrainCircuit, Rocket, Heart, Scale,
    LayoutDashboard, Globe,
} from 'lucide-react'

const ALL_ACTIONS = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, route: '/dashboard', section: 'pages' },
    { id: 'owner', label: 'Owner Dashboard', icon: Crown, route: '/owner?tab=overview', section: 'pages' },
    { id: 'admin', label: 'Admin Panel', icon: Shield, route: '/admin', section: 'pages' },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3, route: '/analytics', section: 'pages' },
    { id: 'ai-chat', label: 'AI Chat', icon: Bot, route: '/ai-chat', section: 'pages' },
    { id: 'analyzer', label: 'Анализ контента', icon: Search, route: '/analyzer', section: 'pages' },
    { id: 'viral-chat', label: 'Viral Chat', icon: MessageSquare, route: '/viral-chat', section: 'pages' },
    { id: 'scheduler', label: 'Планировщик', icon: Calendar, route: '/scheduler', section: 'pages' },
    { id: 'settings', label: 'Настройки', icon: Settings, route: '/settings', section: 'pages' },
    { id: 'advertiser-requests', label: 'Заявки на рекламу', icon: Megaphone, route: '/advertiser-requests', section: 'pages' },

    { id: 'owner-overview', label: 'Обзор', icon: LayoutDashboard, route: '/owner?tab=overview', section: 'owner' },
    { id: 'owner-omega', label: 'OMEGA Core', icon: Brain, route: '/owner?tab=omega', section: 'owner' },
    { id: 'owner-finance', label: 'Финансы', icon: DollarSign, route: '/owner?tab=finance', section: 'owner' },
    { id: 'owner-subscriptions', label: 'Подписки', icon: CreditCard, route: '/owner?tab=subscriptions', section: 'owner' },
    { id: 'owner-team', label: 'Команда', icon: User, route: '/owner?tab=team', section: 'owner' },
    { id: 'owner-tasks', label: 'Задачи', icon: CheckSquare, route: '/owner?tab=tasks', section: 'owner' },
    { id: 'owner-agents', label: 'AI Агенты', icon: Bot, route: '/owner?tab=agents', section: 'owner' },
    { id: 'owner-news', label: 'Новости', icon: Newspaper, route: '/owner?tab=news', section: 'owner' },
    { id: 'owner-promo', label: 'Промо', icon: Gift, route: '/owner?tab=promo', section: 'owner' },
    { id: 'owner-apiKeys', label: 'API Keys', icon: KeyRound, route: '/owner?tab=apiKeys', section: 'owner' },
    { id: 'owner-security', label: 'Безопасность', icon: Lock, route: '/owner?tab=security', section: 'owner' },
    { id: 'owner-logs', label: 'Логи системы', icon: FileText, route: '/owner?tab=logs', section: 'owner' },
    { id: 'owner-servers', label: 'Серверы', icon: Server, route: '/owner?tab=servers', section: 'owner' },
    { id: 'owner-omegaMemory', label: 'OMEGA Memory', icon: Database, route: '/owner?tab=omegaMemory', section: 'owner' },
    { id: 'owner-devStudio', label: 'DevStudio', icon: Rocket, route: '/owner?tab=devStudio', section: 'owner' },

    { id: 'quick-logout', label: 'Выйти', icon: LogOut, action: 'logout', section: 'quick' },
    { id: 'quick-lang', label: 'Сменить язык (RU/EN)', icon: Globe, action: 'toggleLang', section: 'quick' },
]

const RECENT_KEY = 'command_palette_recent'

function loadRecent() {
    try {
        const raw = localStorage.getItem(RECENT_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveRecent(id) {
    try {
        const recent = loadRecent().filter(r => r !== id)
        recent.unshift(id)
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)))
    } catch {}
}

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef(null)
    const navigate = useNavigate()
    const { user, logout } = useAuth()

    const isOwner = user?.role === 'owner'

    const availableActions = useMemo(() => {
        return ALL_ACTIONS.filter(a => {
            if (a.section === 'owner') return isOwner
            if (a.id === 'owner') return isOwner
            if (a.id === 'admin') return user?.role === 'admin' || isOwner
            return true
        })
    }, [isOwner, user?.role])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return availableActions
        return availableActions.filter(a => a.label.toLowerCase().includes(q))
    }, [availableActions, query])

    const recentIds = loadRecent()
    const recent = useMemo(() => {
        return recentIds
            .map(id => availableActions.find(a => a.id === id))
            .filter(Boolean)
    }, [availableActions, open]) // recompute when opens

    const quickActions = useMemo(() => filtered.filter(a => a.section === 'quick'), [filtered])
    const recentFiltered = useMemo(() => filtered.filter(a => recent.some(r => r.id === a.id)), [filtered, recent])
    const allOther = useMemo(() => filtered.filter(a => a.section !== 'quick' && !recent.some(r => r.id === a.id)), [filtered, recent])

    const items = useMemo(() => {
        const list = []
        if (recentFiltered.length > 0) list.push({ type: 'heading', label: 'Недавние' }, ...recentFiltered)
        if (quickActions.length > 0) list.push({ type: 'heading', label: 'Быстрые действия' }, ...quickActions)
        if (allOther.length > 0) list.push({ type: 'heading', label: 'Все разделы' }, ...allOther)
        return list
    }, [recentFiltered, quickActions, allOther])

    useEffect(() => {
        setSelectedIndex(0)
    }, [query, items.length])

    useEffect(() => {
        const onKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC')
            const cmdKey = isMac ? e.metaKey : e.ctrlKey
            if (cmdKey && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setOpen(prev => !prev)
            }
            if (e.key === 'Escape') {
                setOpen(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50)
        } else {
            setQuery('')
            setSelectedIndex(0)
        }
    }, [open])

    const execute = useCallback((action) => {
        if (action.action === 'logout') {
            logout()
            navigate('/')
        } else if (action.action === 'toggleLang') {
            const current = localStorage.getItem('app_language') || 'ru'
            localStorage.setItem('app_language', current === 'ru' ? 'en' : 'ru')
            window.dispatchEvent(new StorageEvent('storage', { key: 'app_language' }))
        } else if (action.route) {
            navigate(action.route)
        }
        saveRecent(action.id)
        setOpen(false)
    }, [logout, navigate])

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(i => Math.min(i + 1, items.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const item = items[selectedIndex]
            if (item && item.route) execute(item)
            if (item && item.action) execute(item)
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
            <div
                className="w-full max-w-2xl mx-4 bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Поиск по разделам, действиям..."
                        className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base"
                    />
                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                        <span className="px-1.5 py-0.5 rounded bg-white/5">↑↓</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5">↵</span>
                        <span>esc</span>
                    </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {items.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                            Ничего не найдено
                        </div>
                    )}
                    {items.map((item, idx) => {
                        if (item.type === 'heading') {
                            return (
                                <div key={`h-${idx}`} className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                    {item.label}
                                </div>
                            )
                        }
                        const Icon = item.icon
                        const active = idx === selectedIndex
                        return (
                            <button
                                key={item.id}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                onClick={() => execute(item)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                                    active ? 'bg-[#8B5CF6]/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-[#8B5CF6]' : 'text-gray-500'}`} />
                                <span>{item.label}</span>
                                {item.section === 'owner' && (
                                    <span className="ml-auto text-[10px] text-gray-600">Owner</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default CommandPalette
