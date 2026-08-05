import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    LayoutDashboard, Brain, Wallet, BrainCircuit, Database,
    DollarSign, CreditCard, Building2, Megaphone, Share2,
    Users, Monitor, CheckSquare, Bot, Newspaper, Gift, MessageSquare,
    KeyRound, Lock, Scale, ShieldCheck, Server, RefreshCw, Plug,
    BarChart, FileText, Bell, HelpCircle, Heart, Rocket,
    Crown, LogOut, ChevronLeft, ChevronRight, X, ChevronDown, Globe,
    Search, TrendingUp, Calendar, Settings, Shield, Briefcase, Home,
    Palette, LayoutTemplate, Flame, Cpu,
} from 'lucide-react'
import { ResponsiveAdBanner } from '../ads/ResponsiveAdBanner'

const ROLE_MENU = {
    owner: [
        { path: '/creative-hub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
        { path: '/owner', label: 'Owner Panel', icon: Crown },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/boardroom', label: 'Совет директоров', icon: Users },
        { path: '/business-spawner', label: 'Рождение бизнеса', icon: Rocket },
        { path: '/advertiser-requests', label: 'Заявки на рекламу', icon: Megaphone },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    admin: [
        { path: '/creative-hub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
        { path: '/admin', label: 'Admin Panel', icon: Shield },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/boardroom', label: 'Совет директоров', icon: Users },
        { path: '/business-spawner', label: 'Рождение бизнеса', icon: Rocket },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    staff: [
        { path: '/creative-hub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
        { path: '/staff', label: 'Staff Panel', icon: Briefcase },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    advertiser: [
        { path: '/creative-hub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
        { path: '/advertiser', label: 'Advertiser Panel', icon: Megaphone },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    creator: [
        { path: '/creative-hub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    business: [
        { path: '/creative-hub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/boardroom', label: 'Совет директоров', icon: Users },
        { path: '/business-spawner', label: 'Рождение бизнеса', icon: Rocket },
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
            { id: 'boardroom', label: 'Совет директоров', icon: Users },
            { id: 'businessSpawner', label: '🚀 Рождение бизнеса', icon: Rocket },
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
            { id: 'templates', label: '📋 Шаблоны', icon: LayoutTemplate },
            { id: 'brandVoice', label: '🎨 Brand Voice', icon: Palette },
            { id: 'scout', label: '🔥 Scout', icon: Flame },
        ],
    },
    {
        id: 'client',
        title: 'КЛИЕНТСКИЙ ВИД',
        items: [
            { id: 'creativeHub', label: '🚀 Creative Hub', icon: Rocket, badge: 'AI' },
            { id: 'documents', label: '📄 Documents', icon: FileText },
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
    const { t } = useTranslation()
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

    const groups = isOwner ? OWNER_GROUPS : [{ id: 'main', title: t('sidebar.menu', 'МЕНЮ'), items: roleMenu.map(item => ({ ...item, path: item.path })) }]

    const isItemActive = (item) => {
        if (isOwner) {
            const active = ownerTab || 'overview'
            return item.id === active
        }
        return location.pathname === item.path
    }

    const handleItemClick = (item) => {
        if (item.path) {
            navigate(item.path)
        } else if (isOwner && item.id) {
            navigate(`/owner?tab=${item.id}`, { replace: true })
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

    const itemLabel = (item) => {
        if (item.id) return t(`sidebar.${item.id}`, item.label)
        return item.label
    }

    return (
        <div
            onMouseEnter={() => !isMobile && setHovered(true)}
            onMouseLeave={() => !isMobile && setHovered(false)}
            className={`flex flex-col h-full bg-[var(--bg)] border-r border-[var(--border)] transition-[width] duration-300 z-50 relative ${
                isExpanded ? 'w-[260px]' : 'w-[60px]'
            }`}
        >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    {isExpanded && (
                        <div className="min-w-0">
                            <h1 className="text-[var(--text)] font-bold text-sm leading-tight truncate">AI Viral</h1>
                            <p className="text-[var(--text-muted)] text-[10px]">Studio</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {!isMobile && (
                        <button
                            onClick={toggleExpanded}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title={isExpanded ? t('sidebar.collapse', 'Свернуть') : t('sidebar.expand', 'Развернуть')}
                        >
                            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                    {onClose && isMobile && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase hover:text-[var(--text)] transition-colors min-h-[44px]"
                            >
                                {t(`sidebar.groups.${group.id}`, group.title)}
                                <ChevronDown
                                    className={`w-3 h-3 transition-transform ${openGroups[group.id] !== false ? 'rotate-180' : ''}`}
                                />
                            </button>
                        ) : (
                            <div className="px-3 py-1.5">
                                <div className="h-px bg-[var(--border-strong)]" />
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
                                            className={`
                                                relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left min-h-[44px]
                                                ${active
                                                    ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 border-l-[3px] border-violet-500 text-white shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }
                                                ${isExpanded ? '' : 'justify-center'}
                                            `}
                                            title={itemLabel(item)}
                                        >
                                            <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                                                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-violet-400' : ''}`} />
                                            </div>
                                            {isExpanded && <span className="font-medium text-sm truncate">{itemLabel(item)}</span>}
                                            {item.badge && isExpanded && (
                                                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold border border-violet-500/30">
                                                    {item.badge}
                                                </span>
                                            )}
                                            {active && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-[var(--border)]">
                <div className={`flex items-center gap-3 px-3 py-2 ${isExpanded ? '' : 'justify-center'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)] flex items-center justify-center text-xs font-bold text-[var(--text-inverse)] flex-shrink-0 overflow-hidden">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            initials || <Globe className="w-4 h-4" />
                        )}
                    </div>
                    {isExpanded && (
                        <div className="min-w-0">
                            <p className="text-[var(--text)] text-sm font-medium truncate">{user?.name || userRole}</p>
                            <p className="text-[var(--text-muted)] text-[10px] truncate">{user?.email || `${userRole}@ai-viral.com`}</p>
                        </div>
                    )}
                </div>

                {/* Ad banner in sidebar (desktop expanded) */}
                {isExpanded && !isMobile && (
                    <div className="px-3 pb-3">
                        <ResponsiveAdBanner variant="sidebar" />
                    </div>
                )}

                <button
                    onClick={onLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all text-left min-h-[44px] ${
                        isExpanded ? '' : 'justify-center'
                    }`}
                    title={t('common.logout', 'Выйти')}
                >
                    <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                    {isExpanded && <span>{t('common.logout', 'Выйти')}</span>}
                </button>
            </div>
        </div>
    )
}

export default AppSidebar
