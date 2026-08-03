import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
    LayoutDashboard, Brain, Wallet, BrainCircuit, Database,
    DollarSign, CreditCard, Building2, Megaphone, Share2,
    Users, Monitor, CheckSquare, Bot, Newspaper, Gift, MessageSquare,
    KeyRound, Lock, Scale, ShieldCheck, Server, RefreshCw, Plug,
    BarChart, FileText, Bell, HelpCircle, Heart, Rocket,
    Crown, LogOut, Search, TrendingUp, Calendar, Settings, Shield, Briefcase, Home,
    Palette, LayoutTemplate, Flame, Cpu,
} from 'lucide-react'

// [P16-FIX] added: floating glass dock for desktop dashboards

const OWNER_GROUPS = [
    {
        id: 'overview',
        items: [{ id: 'overview', label: 'Обзор', icon: LayoutDashboard }],
    },
    {
        id: 'omega',
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
        items: [
            { id: 'team', label: 'Команда', icon: Users },
            { id: 'cabinets', label: 'Кабинеты', icon: Monitor },
            { id: 'tasks', label: '✅ Задачи', icon: CheckSquare },
            { id: 'agents', label: '🤖 AI Агенты', icon: Bot },
        ],
    },
    {
        id: 'content',
        items: [
            { id: 'news', label: 'Новости', icon: Newspaper },
            { id: 'promo', label: 'Промо', icon: Gift },
            { id: 'templates', label: '📋 Шаблоны', icon: LayoutTemplate },
            { id: 'brandVoice', label: '🎨 Brand Voice', icon: Palette },
            { id: 'scout', label: '🔥 Scout', icon: Flame },
            { id: 'chat', label: '💬 Чаты', icon: MessageSquare },
        ],
    },
    {
        id: 'client',
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

const ROLE_MENU = {
    owner: OWNER_GROUPS,
    admin: [
        { path: '/admin', label: 'Admin Panel', icon: Shield },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/boardroom', label: 'Совет директоров', icon: Users },
        { path: '/business-spawner', label: 'Рождение бизнеса', icon: Rocket },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    staff: [
        { path: '/staff', label: 'Staff Panel', icon: Briefcase },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    advertiser: [
        { path: '/advertiser', label: 'Advertiser Panel', icon: Megaphone },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    creator: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    business: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/ai-vs-human', label: 'AI vs Human', icon: Cpu },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/boardroom', label: 'Совет директоров', icon: Users },
        { path: '/business-spawner', label: 'Рождение бизнеса', icon: Rocket },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
}

export function SidebarDock({ userRole = 'creator', user, onLogout }) {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const ownerTab = searchParams.get('tab')
    const [expanded, setExpanded] = useState(false)
    const isOwner = userRole === 'owner'

    const groups = ROLE_MENU[userRole] || ROLE_MENU.creator

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
    }

    const initials = (user?.name || userRole || 'U')
        .split(' ')
        .map(s => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    const renderItems = (items) => items.map(item => {
        const Icon = item.icon
        const active = isItemActive(item)
        return (
            <button
                key={item.id || item.path}
                onClick={() => handleItemClick(item)}
                className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-r-xl transition-all min-h-[44px] border-l-[3px] ${
                    active
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                }`}
                title={item.label}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[var(--primary)]' : ''}`} />
                {expanded && (
                    <span className="text-sm font-medium truncate whitespace-nowrap">{item.label}</span>
                )}
            </button>
        )
    })

    return (
        <div
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col glass-card-strong py-4 transition-[width] duration-300 ease-out ${
                expanded ? 'w-[200px] px-3' : 'w-[64px] px-2'
            }`}
            style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
            <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-[var(--text-inverse)]" />
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                {isOwner
                    ? OWNER_GROUPS.map(group => (
                        <div key={group.id} className="space-y-1">
                            {expanded && (
                                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    {group.id}
                                </div>
                            )}
                            {renderItems(group.items)}
                        </div>
                    ))
                    : renderItems(groups)
                }
            </nav>

            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                <button
                    onClick={() => navigate('/settings')}
                    className="group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all min-h-[44px]"
                    title="Настройки"
                >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {expanded && <span className="text-sm font-medium truncate">Настройки</span>}
                </button>
                <button
                    onClick={onLogout}
                    className="group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all min-h-[44px]"
                    title="Выйти"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {expanded && <span className="text-sm font-medium truncate">{initials} · Выйти</span>}
                </button>
            </div>
        </div>
    )
}

export default SidebarDock
