import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    Crown, Shield, BarChart, Bot, Calendar, Settings,
    LogOut, ChevronLeft, ChevronRight, Sparkles, Menu, X,
    Users, CreditCard, Briefcase, Eye, Bell, Search, MessageSquare,
    Check, X as XIcon
} from 'lucide-react'

function Sidebar() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [cabinetSearch, setCabinetSearch] = useState('')
    const [showNotifications, setShowNotifications] = useState(false)
    const [editingPrice, setEditingPrice] = useState(null)
    const [newPrice, setNewPrice] = useState('')

    const [cabinets] = useState(() => {
        const saved = localStorage.getItem('owner_cabinets')
        return saved ? JSON.parse(saved) : [
            { id: 1, name: 'Мария Сидорова', email: 'maria.cabinet@ai-viral.com', department: 'support', status: 'active', avatar: 'М', activeNow: true },
            { id: 2, name: 'Алексей Иванов', email: 'alex.cabinet@ai-viral.com', department: 'content', status: 'active', avatar: 'А', activeNow: true },
            { id: 3, name: 'Ольга Козлова', email: 'olga.cabinet@ai-viral.com', department: 'sales', status: 'paused', avatar: 'О', activeNow: false },
            { id: 4, name: 'Дмитрий Смирнов', email: 'dmitry.cabinet@ai-viral.com', department: 'tech', status: 'active', avatar: 'Д', activeNow: true },
        ]
    })

    const [subscriptions, setSubscriptions] = useState(() => {
        const saved = localStorage.getItem('owner_subscriptions')
        const subs = saved ? JSON.parse(saved) : [
            { name: 'Free', price: 0, users: 450, color: '#6b7280' },
            { name: 'Creator', price: 10, users: 280, color: '#2563eb' },
            { name: 'Pro', price: 30, users: 150, color: '#8b5cf6' },
            { name: 'Agency', price: 100, users: 80, color: '#00ff41' },
            { name: 'Enterprise', price: 300, users: 40, color: '#f0883e' },
        ]
        return subs.map(s => s.name === 'Free' ? { ...s, price: 0 } : s)
    })

    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem('owner_notifications')
        return saved ? JSON.parse(saved) : [
            { id: 1, type: 'new_ad_request', message: 'Новая заявка на рекламу от TechCorp', time: '2 мин назад', read: false },
            { id: 2, type: 'api_key_expiring', message: 'API ключ Replicate истекает через 3 дня', time: '1 час назад', read: false },
            { id: 3, type: 'cabinet_paused', message: 'Кабинет Ольга Козлова приостановлен', time: '2 дня назад', read: true },
        ]
    })

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
            setCollapsed(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const menuItems = [
        { path: '/owner', label: 'Owner Panel', icon: Crown, role: 'owner', color: 'text-yellow-400' },
        { path: '/admin', label: 'Admin Panel', icon: Shield, role: 'admin', color: 'text-blue-400' },
        { path: '/analytics', label: 'Аналитика', icon: BarChart, role: 'all', color: 'text-emerald-400' },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot, role: 'all', color: 'text-purple-400' },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar, role: 'all', color: 'text-pink-400' },
        { path: '/advertiser-requests', label: 'Реклама', icon: MessageSquare, role: 'owner', color: 'text-orange-400' },
        { path: '/settings', label: 'Настройки', icon: Settings, role: 'all', color: 'text-gray-400' },
    ]

    const filteredItems = menuItems.filter(item =>
        item.role === 'all' || (user?.role && item.role === user.role)
    )

    const filteredCabinets = cabinets.filter(c =>
        !cabinetSearch ||
        c.name.toLowerCase().includes(cabinetSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(cabinetSearch.toLowerCase())
    )

    const unreadCount = notifications.filter(n => !n.read).length

    const isActive = (path) => location.pathname === path

    const handleNav = (path) => {
        navigate(path)
        if (isMobile) setMobileOpen(false)
    }

    const updatePrice = (index, newPriceValue) => {
        if (subscriptions[index]?.name === 'Free') {
            setEditingPrice(null)
            setNewPrice('')
            return
        }
        const updated = [...subscriptions]
        updated[index].price = parseFloat(newPriceValue) || 0
        setSubscriptions(updated)
        localStorage.setItem('owner_subscriptions', JSON.stringify(updated))
        setEditingPrice(null)
        setNewPrice('')
    }

    const markNotificationRead = (id) => {
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
        setNotifications(updated)
        localStorage.setItem('owner_notifications', JSON.stringify(updated))
    }

    const markAllRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }))
        setNotifications(updated)
        localStorage.setItem('owner_notifications', JSON.stringify(updated))
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'new_ad_request': return '🔔'
            case 'api_key_expiring': return '⚠️'
            case 'cabinet_paused': return '⏸️'
            default: return '📢'
        }
    }

    return (
        <>
            {mobileOpen && isMobile && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-[#1a1a24] rounded-xl border border-white/10 flex items-center justify-center text-white"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-[#0f0f17] border-r border-white/5 z-40 transition-all duration-300 flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-20' : 'w-64'}`}>
                {/* Logo */}
                <div className={`p-4 border-b border-white/5 ${collapsed ? 'text-center' : ''}`}>
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        {!collapsed && (
                            <div className="hidden lg:block">
                                <div className="font-bold text-lg leading-tight">AI Viral</div>
                                <div className="text-xs text-gray-500">Studio</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Role Badge */}
                {!collapsed && user?.role && (
                    <div className="px-4 py-2">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider text-center">
                            {user.role}
                        </div>
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Navigation */}
                    <nav className="px-3 py-4 space-y-1">
                        {filteredItems.map(item => {
                            const Icon = item.icon
                            const active = isActive(item.path)
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNav(item.path)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${active ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'} ${collapsed ? 'justify-center' : ''}`}
                                >
                                    <Icon size={20} className={`transition-transform group-hover:scale-110 ${active ? 'text-emerald-400' : item.color}`} />
                                    {!collapsed && <span className="font-medium text-sm hidden lg:block">{item.label}</span>}
                                    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 hidden lg:block"></div>}
                                    {collapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a24] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none border border-white/10 z-50">
                                            {item.label}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Notifications */}
                    {!collapsed && (
                        <div className="px-3 py-2 border-t border-white/5">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group relative"
                            >
                                <div className="relative">
                                    <Bell size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                            {unreadCount}
                                        </div>
                                    )}
                                </div>
                                <span className="font-medium text-sm text-gray-400 group-hover:text-white">Уведомления</span>
                                {unreadCount > 0 && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-red-400"></div>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="mt-2 mx-1 bg-[#1a1a24] rounded-xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                                        <span className="text-xs text-gray-500">Уведомления</span>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-[10px] text-emerald-400 hover:text-emerald-300">
                                                Прочитать все
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="px-3 py-4 text-center text-xs text-gray-500">Нет уведомлений</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => markNotificationRead(n.id)}
                                                    className={`px-3 py-2.5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/[0.02]' : ''}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-sm">{getNotificationIcon(n.type)}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs ${!n.read ? 'text-white font-medium' : 'text-gray-400'}`}>{n.message}</p>
                                                            <p className="text-[10px] text-gray-600 mt-0.5">{n.time}</p>
                                                        </div>
                                                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0"></div>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cabinets */}
                    <div className="px-3 py-2 border-t border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3 flex items-center justify-between">
                            <span>Кабинеты</span>
                            {!collapsed && <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{filteredCabinets.length}</span>}
                        </div>

                        {/* Search */}
                        {!collapsed && (
                            <div className="relative mb-2 mx-1">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="text"
                                    value={cabinetSearch}
                                    onChange={e => setCabinetSearch(e.target.value)}
                                    placeholder="Поиск..."
                                    className="w-full pl-7 pr-2 py-1.5 bg-[#1a1a24] rounded-lg border border-white/5 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500/30"
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            {filteredCabinets.map(cabinet => (
                                <button
                                    key={cabinet.id}
                                    onClick={() => handleNav('/owner')}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group text-left"
                                >
                                    <div className="relative">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            {cabinet.avatar}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0f0f17] ${cabinet.activeNow ? 'bg-emerald-400 animate-pulse' : cabinet.status === 'paused' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                                    </div>
                                    {!collapsed && (
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-300 truncate">{cabinet.name}</div>
                                            <div className="text-[10px] text-gray-500 capitalize">{cabinet.department}</div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="px-3 py-2 border-t border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Подписки</div>
                        <div className="space-y-1">
                            {subscriptions.map((sub, idx) => (
                                <div key={sub.name} className="flex items-center justify-between px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                        {!collapsed && <span className="text-sm text-gray-400">{sub.name}</span>}
                                    </div>
                                    {!collapsed && (
                                        <div className="flex items-center gap-2">
                                            {sub.name === 'Free' ? (
                                                <span className="text-xs font-mono text-gray-400">Free</span>
                                            ) : editingPrice === idx ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-emerald-400">$</span>
                                                    <input
                                                        type="number"
                                                        defaultValue={sub.price}
                                                        autoFocus
                                                        onBlur={(e) => { updatePrice(idx, e.target.value); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { updatePrice(idx, e.target.value); } }}
                                                        className="w-12 px-1 py-0.5 bg-[#1a1a24] rounded border border-emerald-500/30 text-xs font-mono text-emerald-400 text-right"
                                                    />
                                                    <button onClick={() => setEditingPrice(null)} className="text-gray-500 hover:text-white">
                                                        <XIcon size={10} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setEditingPrice(idx); setNewPrice(sub.price.toString()); }} className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors">
                                                    ${sub.price}
                                                </button>
                                            )}
                                            <span className="text-[10px] text-gray-600">({sub.users})</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="mx-3 mb-2 p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all flex items-center justify-center"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>

                {/* User Profile */}
                <div className="p-3 border-t border-white/5">
                    <button
                        onClick={() => handleNav('/settings')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group ${collapsed ? 'justify-center' : ''}`}
                    >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">{user?.name?.charAt(0) || 'O'}</span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-medium text-white truncate">{user?.name || 'Владелец'}</div>
                                <div className="text-xs text-emerald-400 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                    Онлайн
                                </div>
                            </div>
                        )}
                    </button>
                    <button
                        onClick={logout}
                        className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all group ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span className="text-sm font-medium">Выйти</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar