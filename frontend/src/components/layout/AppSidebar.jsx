import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    Crown, Shield, BarChart3, Bot, Calendar, Settings,
    LogOut, Menu, X, Bell, Briefcase, Megaphone, Home,
    Search, Users, CreditCard, CheckCircle2, AlertCircle,
    TrendingUp, Sparkles
} from 'lucide-react'
import { EmptyState } from '../shared/EmptyState'

const ROLE_MENU = {
    owner: [
        { path: '/owner', label: 'Owner Panel', icon: Crown },
        { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/advertiser-requests', label: 'Заявки на рекламу', icon: Megaphone },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    admin: [
        { path: '/admin', label: 'Admin Panel', icon: Shield },
        { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
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
        { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    creator: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
    business: [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/analytics', label: 'Аналитика', icon: BarChart3 },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot },
        { path: '/analyzer', label: 'Анализ контента', icon: Search },
        { path: '/viral-chat', label: 'Viral Chat', icon: TrendingUp },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar },
        { path: '/settings', label: 'Настройки', icon: Settings },
    ],
}

const NOTIFICATION_ICONS = {
    campaign: Megaphone,
    subscription: CheckCircle2,
    ai: Sparkles,
    trend: TrendingUp,
    system: AlertCircle,
    new_ad_request: Megaphone,
    api_key_expiring: AlertCircle,
    cabinet_paused: AlertCircle,
    default: Bell,
}

const NOTIFICATION_COLORS = {
    campaign: 'text-blue-400 bg-blue-500/10',
    subscription: 'text-green-400 bg-green-500/10',
    ai: 'text-purple-400 bg-purple-500/10',
    trend: 'text-orange-400 bg-orange-500/10',
    system: 'text-yellow-400 bg-yellow-500/10',
    new_ad_request: 'text-blue-400 bg-blue-500/10',
    api_key_expiring: 'text-yellow-400 bg-yellow-500/10',
    cabinet_paused: 'text-red-400 bg-red-500/10',
    default: 'text-gray-400 bg-gray-500/10',
}

export function AppSidebar({
    userRole = 'creator',
    menuItems,
    cabinets = [],
    notifications = [],
    subscriptions = [],
    user,
    onLogout,
    onClose,
    collapsible = false,
}) {
    const location = useLocation()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [showNotif, setShowNotif] = useState(false)
    const [cabinetSearch, setCabinetSearch] = useState('')

    const items = menuItems || ROLE_MENU[userRole] || ROLE_MENU.creator
    const unreadCount = notifications.filter(n => !n.read).length

    const handleNav = (path) => {
        navigate(path)
        onClose?.()
    }

    const filteredCabinets = cabinets.filter(c =>
        !cabinetSearch ||
        c.name?.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(cabinetSearch.toLowerCase())
    )

    const showCabinets = (userRole === 'owner' || userRole === 'admin') && cabinets.length > 0
    const showSubscriptions = userRole === 'owner' && subscriptions.length > 0

    return (
        <div className={`flex flex-col h-full bg-[#0f0f1a] border-r border-white/[0.06] ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
            {/* Logo */}
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00ff41]/20 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-5 h-5 text-[#00ff41]" />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-white font-bold text-sm leading-tight">AI Viral</h1>
                            <p className="text-gray-500 text-[10px]">Studio</p>
                        </div>
                    )}
                </div>
                {collapsible && (
                    <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-white">
                        {collapsed ? <Menu size={18} /> : <X size={18} />}
                    </button>
                )}
                {onClose && !collapsible && (
                    <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {items.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon
                    return (
                        <button
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                                isActive
                                    ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    )
                })}

                {/* Cabinets (owner/admin) */}
                {showCabinets && !collapsed && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <div className="px-3 mb-2 text-xs text-gray-500 uppercase tracking-wider">Кабинеты</div>
                        <div className="relative mb-2">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input
                                value={cabinetSearch}
                                onChange={e => setCabinetSearch(e.target.value)}
                                placeholder="Поиск..."
                                className="w-full pl-7 pr-2 py-1.5 bg-white/5 rounded-lg text-xs text-white placeholder-gray-600 outline-none border border-transparent focus:border-[#00ff41]/30"
                            />
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {filteredCabinets.length === 0 && (
                                <EmptyState icon={Users} title="Нет кабинетов" />
                            )}
                            {filteredCabinets.map(cabinet => (
                                <button
                                    key={cabinet.id}
                                    onClick={() => handleNav(cabinet.path || '/owner')}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 text-left"
                                >
                                    <div className={`w-2 h-2 rounded-full ${cabinet.activeNow ? 'bg-[#00ff41]' : 'bg-gray-600'}`} />
                                    <div className="min-w-0">
                                        <div className="text-xs text-gray-300 truncate">{cabinet.name}</div>
                                        <div className="text-[10px] text-gray-500 capitalize">{cabinet.department}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Notifications */}
            {!collapsed && (
                <div className="p-3 border-t border-white/[0.06]">
                    <button
                        onClick={() => setShowNotif(!showNotif)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all relative text-left"
                    >
                        <Bell className="w-[18px] h-[18px] flex-shrink-0" />
                        <span className="truncate">Уведомления</span>
                        {unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {showNotif && (
                        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="text-center py-4 text-gray-600 text-xs">
                                    <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                    Нет уведомлений
                                </div>
                            ) : (
                                notifications.map(n => {
                                    const Icon = NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default
                                    const colorClass = NOTIFICATION_COLORS[n.type] || NOTIFICATION_COLORS.default
                                    return (
                                        <div
                                            key={n.id}
                                            className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                                                n.read
                                                    ? 'bg-white/[0.02] text-gray-500'
                                                    : 'bg-[#00ff41]/5 text-gray-300 border border-[#00ff41]/10 hover:bg-[#00ff41]/10'
                                            }`}
                                        >
                                            <div className="flex gap-2">
                                                <div className={`p-1 rounded-md ${colorClass} shrink-0 h-fit`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1">
                                                        <p className={`text-xs font-medium ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                                                        {!n.read && <div className="w-1.5 h-1.5 bg-[#00ff41] rounded-full shrink-0 mt-1" />}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                    <span className="text-[10px] text-gray-600">{n.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Subscriptions (owner) */}
            {showSubscriptions && !collapsed && (
                <div className="px-3 py-2 border-t border-white/[0.06]">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Подписки</div>
                    <div className="space-y-1">
                        {subscriptions.map(sub => (
                            <div key={sub.name} className="flex items-center justify-between px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                    <span className="text-sm text-gray-400">{sub.name}</span>
                                </div>
                                <span className="text-xs font-mono text-gray-500">
                                    {sub.name === 'Free' ? 'Free' : `$${sub.price}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* User */}
            <div className="p-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff41] to-[#00cc33] flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() || userRole?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{user?.name || userRole}</p>
                            <p className="text-gray-500 text-[10px] truncate">{user?.email || `${userRole}@ai-viral.com`}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all text-left"
                >
                    <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                    {!collapsed && <span>Выйти</span>}
                </button>
            </div>
        </div>
    )
}
