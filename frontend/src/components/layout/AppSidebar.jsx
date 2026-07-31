import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
    LayoutDashboard, Brain, Wallet, BrainCircuit, Database,
    DollarSign, CreditCard, Building2, Megaphone, Share2,
    Users, Monitor, CheckSquare, Bot, Newspaper, Gift, MessageSquare,
    KeyRound, Lock, Scale, ShieldCheck, Server, RefreshCw, Plug,
    BarChart, FileText, Bell, HelpCircle, Heart, Rocket,
    Crown, LogOut, ChevronLeft, ChevronRight, X, ChevronDown, Globe,
    Search, TrendingUp, Calendar, Settings, Shield, Briefcase, Home,
} from 'lucide-react'

const ROLE_MENU = {
    owner: [
        { path: '/owner', label: 'Owner Panel', icon: Crown },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/advertiser-requests', label: 'Заявки на рекламу', icon: Megaphone },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    admin: [
        { path: '/admin', label: 'Admin Panel', icon: Shield },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    staff: [
        { path: '/staff', label: 'Staff Panel', icon: Briefcase },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    advertiser: [
        { path: '/advertiser', label: 'Advertiser Panel', icon: Megaphone },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    creator: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    business: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
}

const OWNER_GROUPS = [
    {
        id: 'overview',
        title: 'ОБЗОР',
        items: [{ id: 'overview', label: 'Обзор', icon: LayoutDashboard }],
    },
    {
        id: 'omega',
        title: 'OMEGA',
        items: [
            { id: 'omega', label: 'Ω OMEGA Core', icon: Brain },
            { id: 'omegaFinance', label: '💰 OMEGA Finance', icon: Wallet },
            { id: 'omegaSkills', label: '🧠 OMEGA Skills', icon: BrainCircuit },
            { id: 'omegaMemory', label: '🗄️ OMEGA Memory', icon: Database },
        ],
    },
    {
        id: 'finance',
        title: 'ФИНАНСЫ',
        items: [
            { id: 'finance', label: 'Финансы', icon: DollarSign },
            { id: 'subscriptions', label: 'Подписки', icon: CreditCard },
            { id: 'requisites', label: '🏢 Реквизиты', icon: Building2 },
            { id: 'advertising', label: 'Реклама', icon: Megaphone },
            { id: 'referrals', label: 'Рефералы', icon: Share2 },
        ],
    },
    {
        id: 'team',
        title: 'КОМАНДА',
        items: [
            { id: 'team', label: 'Команда', icon: Users },
            { id: 'cabinets', label: 'Кабинеты', icon: Monitor },
            { id: 'tasks', label: '✅ Задачи', icon: CheckSquare },
            { id: 'agents', label: '🤖 AI Агенты', icon: Bot },
        ],
    },
    {
        id: 'content',
        title: 'КОНТЕНТ',
        items: [
            { id: 'news', label: 'Новости', icon: Newspaper },
            { id: 'promo', label: 'Промо', icon: Gift },
            { id: 'chat', label: '💬 Чаты', icon: MessageSquare },
        ],
    },
    {
        id: 'client',
        title: 'КЛИЕНТСКИЙ ВИД',
        items: [
            { id: 'analytics', label: '📊 Аналитика', icon: BarChart },
            { id: 'aiChat', label: '🤖 AI Chat', icon: Bot },
            { id: 'contentAnalyzer', label: '🔍 Анализ контента', icon: Search },
            { id: 'scheduler', label: '📅 Планировщик', icon: Calendar },
            { id: 'viralChat', label: '💬 Viral Chat', icon: TrendingUp },
        ],
    },
    {
        id: 'settings',
        title: 'НАСТРОЙКИ',
        items: [
            { id: 'apiKeys', label: '🔑 API Keys', icon: KeyRound },
            { id: 'security', label: 'Безопасность', icon: Lock },
            { id: 'legal', label: 'Юр. лицо', icon: Scale },
            { id: 'legalSettings', label: '⚖️ Юр. настройки', icon: Scale },
            { id: 'audit', label: 'Аудит', icon: ShieldCheck },
            { id: 'servers', label: 'Серверы', icon: Server },
            { id: 'updates', label: 'Обновления', icon: RefreshCw },
            { id: 'integrations', label: 'Интеграции', icon: Plug },
            { id: 'aiAnalytics', label: 'AI Аналитика', icon: BarChart },
            { id: 'logs', label: 'Логи системы', icon: FileText },
            { id: 'notifications', label: 'Уведомления', icon: Bell },
            { id: 'help', label: 'Помощь', icon: HelpCircle },
            { id: 'feedback', label: 'Feedback', icon: Heart },
            { id: 'devStudio', label: '🚀 DevStudio', icon: Rocket },
        ],
    },
]

const ACTIVE_COLOR = '#8B5CF6'

function useLocalStorage(key, initial) {
    const [value, setValue] = useState(() => {
        try {
            const saved = localStorage.getItem(key)
            return saved !== null ? JSON.parse(saved) : initial
        } catch {
            return initial
        }
    })
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value))
        } catch {}
    }, [key, value])
    return [value, setValue]
}

export function AppSidebar({
    userRole = 'creator',
    menuItems,
    user,
    onLogout,
    onClose,
    isMobile = false,
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const ownerTab = searchParams.get('tab')

    const [expanded, setExpanded] = useLocalStorage('sidebar_expanded', true)
    const [hovered, setHovered] = useState(false)
    const [openGroups, setOpenGroups] = useLocalStorage('sidebar_open_groups', {
        overview: true, omega: true, finance: true, team: true, content: true, settings: true,
    })

    const isOwner = userRole === 'owner'
    const isExpanded = isMobile ? true : (expanded || hovered)

    const roleMenu = menuItems || ROLE_MENU[userRole] || ROLE_MENU.creator

    const groups = useMemo(() => {
        if (isOwner) return OWNER_GROUPS
        return [{ id: 'main', title: 'МЕНЮ', items: roleMenu.map(item => ({ ...item, path: item.path })) }]
    }, [isOwner, roleMenu])

    const isItemActive = (item) => {
        if (isOwner) {
            const active = ownerTab || 'overview'
            return item.id === active
        }
        return location.pathname === item.path
    }

    const handleItemClick = (item) => {
        if (isOwner && item.id) {
            navigate(`/owner?tab=${item.id}`, { replace: true })
        } else if (item.path) {
            navigate(item.path)
        }
        onClose?.()
    }

    const toggleGroup = (groupId) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    }

    const toggleExpanded = () => {
        setExpanded(prev => !prev)
    }

    const initials = (user?.name || userRole || 'U')
        .split(' ')
        .map(s => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <div
            onMouseEnter={() => !isMobile && setHovered(true)}
            onMouseLeave={() => !isMobile && setHovered(false)}
            className={`flex flex-col h-full bg-[#0f0f1a] border-r border-white/[0.06] transition-[width] duration-300 z-50 relative ${
                isExpanded ? 'w-[260px]' : 'w-[60px]'
            }`}
        >
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    {isExpanded && (
                        <div className="min-w-0">
                            <h1 className="text-white font-bold text-sm leading-tight truncate">AI Viral</h1>
                            <p className="text-gray-500 text-[10px]">Studio</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {!isMobile && (
                        <button
                            onClick={toggleExpanded}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                            title={isExpanded ? 'Свернуть' : 'Развернуть'}
                        >
                            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                    {onClose && isMobile && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                {groups.map(group => (
                    <div key={group.id}>
                        {isExpanded ? (
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-gray-500 tracking-wider uppercase hover:text-gray-400 transition-colors"
                            >
                                {group.title}
                                <ChevronDown
                                    className={`w-3 h-3 transition-transform ${openGroups[group.id] !== false ? 'rotate-180' : ''}`}
                                />
                            </button>
                        ) : (
                            <div className="px-3 py-1.5">
                                <div className="h-px bg-white/10" />
                            </div>
                        )}
                        {(openGroups[group.id] !== false || !isExpanded) && (
                            <div className="space-y-1">
                                {group.items.map(item => {
                                    const Icon = item.icon
                                    const active = isItemActive(item)
                                    return (
                                        <button
                                            key={item.id || item.path}
                                            onClick={() => handleItemClick(item)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left relative ${
                                                active
                                                    ? 'text-white bg-[#8B5CF6]/10'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            } ${isExpanded ? '' : 'justify-center'}`}
                                            title={item.label}
                                        >
                                            {active && (
                                                <div
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                                                    style={{ backgroundColor: ACTIVE_COLOR }}
                                                />
                                            )}
                                            <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-[#8B5CF6]' : ''}`} />
                                            {isExpanded && <span className="truncate">{item.label}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-white/[0.06]">
                <div className={`flex items-center gap-3 px-3 py-2 ${isExpanded ? '' : 'justify-center'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {initials || <Globe className="w-4 h-4" />}
                    </div>
                    {isExpanded && (
                        <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{user?.name || userRole}</p>
                            <p className="text-gray-500 text-[10px] truncate">{user?.email || `${userRole}@ai-viral.com`}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={onLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all text-left ${
                        isExpanded ? '' : 'justify-center'
                    }`}
                    title="Выйти"
                >
                    <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                    {isExpanded && <span>Выйти</span>}
                </button>
            </div>
        </div>
    )
}

export default AppSidebar
