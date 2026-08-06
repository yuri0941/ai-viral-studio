import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, User, Globe, Shield, Briefcase, Headphones, Megaphone, UserCircle, ChevronDown, Sun, Moon, OctagonAlert, Play, Folder, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { UserProfileModal } from './UserProfileModal'
import { workspaceApi } from '../../services/api'

const ROLE_CONFIG = {
    owner: { label: 'Owner', icon: Shield, color: 'text-yellow-400', route: '/owner' },
    admin: { label: 'Admin', icon: Shield, color: 'text-red-400', route: '/admin' },
    staff: { label: 'Staff', icon: Headphones, color: 'text-blue-400', route: '/staff' },
    advertiser: { label: 'Advertiser', icon: Megaphone, color: 'text-purple-400', route: '/advertiser' },
    creator: { label: 'Creator', icon: UserCircle, color: 'text-emerald-400', route: '/dashboard' },
    business: { label: 'Business', icon: Briefcase, color: 'text-orange-400', route: '/dashboard' },
}

function getAvailableRoles(currentRole) {
    switch (currentRole) {
        case 'owner': return ['owner', 'admin', 'staff', 'advertiser', 'creator', 'business']
        case 'admin': return ['admin', 'staff', 'creator', 'business']
        case 'staff': return ['staff', 'creator', 'business']
        case 'advertiser': return ['advertiser', 'creator', 'business']
        case 'business':
        case 'creator':
        default: return ['creator', 'business']
    }
}

export function DashboardHeader({
    title,
    user,
    unreadCount = 0,
    language = 'ru',
    onLanguageChange,
    isDark = true,
    onThemeToggle,
    onMenuClick,
    onNotificationsClick,
    showSearch = true,
}) {
    const { updateUser } = useAuth()
    const navigate = useNavigate()
    const [roleOpen, setRoleOpen] = useState(false)
    const [langOpen, setLangOpen] = useState(false)
    const [emergencyStopped, setEmergencyStopped] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [pushSubscribed, setPushSubscribed] = useState(false)
    const [workspaces, setWorkspaces] = useState([])
    const [activeWorkspace, setActiveWorkspace] = useState(() => {
        try { return JSON.parse(localStorage.getItem('active_workspace')) } catch { return null }
    })
    const [wsOpen, setWsOpen] = useState(false)

    useEffect(() => {
        if (['owner', 'admin', 'business'].includes(user?.role)) {
            workspaceApi.list().then(res => {
                const list = res.data || []
                setWorkspaces(list)
                const def = list.find(w => w.isDefault) || list[0]
                if (def && !activeWorkspace) {
                    setActiveWorkspace(def)
                    localStorage.setItem('active_workspace', JSON.stringify(def))
                }
            }).catch(() => {})
        }
    }, [user?.role])

    const handleWorkspaceChange = (ws) => {
        setActiveWorkspace(ws)
        localStorage.setItem('active_workspace', JSON.stringify(ws))
        setWsOpen(false)
    }

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    setPushSubscribed(!!sub)
                })
            })
        }
    }, [])

    const handleNotificationsClick = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            onNotificationsClick?.()
            return
        }
        try {
            const reg = await navigator.serviceWorker.ready
            let sub = await reg.pushManager.getSubscription()
            if (!sub) {
                const publicKey = await fetch('/api/push/vapid-public-key').then(r => r.json()).then(j => j.publicKey).catch(() => null)
                // [v5.7-COMPACT] added: guard invalid/missing VAPID key
                if (!publicKey || publicKey.length < 20) {
                    console.warn('[Push] VAPID key not configured or invalid');
                    return;
                }
                const applicationServerKey = urlBase64ToUint8Array(publicKey)
                if (!applicationServerKey) {
                    console.warn('[Push] applicationServerKey conversion failed; skipping subscription') // [v6.0] added
                    return
                }
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }) // [v6.0] added
                await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(sub),
                })
                setPushSubscribed(true)
            }
        } catch (e) {
            console.warn('[Push] Subscribe failed:', e.message)
        }
        onNotificationsClick?.()
    }

    function urlBase64ToUint8Array(base64String) {
        try {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
            const rawData = window.atob(base64)
            return Uint8Array.from(rawData.split('').map(c => c.charCodeAt(0)))
        } catch (e) {
            console.warn('[Push] applicationServerKey decode failed:', e.message) // [v6.0] added
            return null
        }
    }

    const availableRoles = getAvailableRoles(user?.role)
    const currentRole = ROLE_CONFIG[user?.role] || ROLE_CONFIG.creator
    const CurrentIcon = currentRole.icon

    const handleLanguageChange = (lang) => {
        onLanguageChange?.(lang)
        setLangOpen(false)
    }

    const handleRoleChange = (role) => {
        const config = ROLE_CONFIG[role]
        if (!config || role === user?.role) {
            setRoleOpen(false)
            return
        }
        updateUser({ role })
        setRoleOpen(false)
        window.location.href = config.route
    }

    const handleEmergencyToggle = async () => {
        if (!confirm(emergencyStopped ? 'Снять Emergency Stop и возобновить OMEGA?' : 'Аварийно остановить OMEGA? Все AI-операции будут приостановлены.')) return
        const token = localStorage.getItem('token')
        const endpoint = emergencyStopped ? '/api/admin/emergency-resume' : '/api/admin/emergency-stop'
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            })
            if (res.ok) {
                setEmergencyStopped(!emergencyStopped)
            } else {
                alert('Ошибка переключения Emergency Stop')
            }
        } catch (e) {
            alert('Ошибка сети')
        }
    }

    return (
        // [MASTER-v5.6] luxury header
        <header className="sticky top-0 z-30 w-full luxury-card rounded-none border-x-0 border-t-0 border-b border-white/10 safe-top">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3">
                    {onMenuClick && (
                        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors">
                            <Menu className="w-5 h-5 text-white" />
                        </button>
                    )}
                    <h1 className="text-lg font-bold text-white tracking-tight truncate">{title}</h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {showSearch && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Поиск..." className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-32 lg:w-48" />
                        </div>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setLangOpen(o => !o)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-gray-200"
                            aria-label="Выбрать язык"
                        >
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            <span className="uppercase">{language}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {
                            <div className={`fixed right-4 top-16 w-32 rounded-xl border border-white/10 shadow-2xl shadow-black/50 z-[9999] bg-[var(--glass)] backdrop-blur-xl transition-all duration-200 origin-top-right ${langOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[var(--glass)] border-l border-t border-white/10 rotate-45" />
                                {['ru', 'en'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => handleLanguageChange(lang)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--card-hover)] transition-colors ${
                                            language === lang ? 'bg-[var(--card)] text-[var(--text)]' : 'text-[var(--text-muted)]'
                                        }`}
                                    >
                                        <span className="uppercase w-4 font-mono text-[var(--primary)]">{lang}</span>
                                        {lang === 'ru' ? 'Русский' : 'English'}
                                    </button>
                                ))}
                            </div>
                        }
                    </div>

                    <button
                        onClick={onThemeToggle}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                        aria-label="Переключить тему"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    {/* Role Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setRoleOpen(o => !o)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] transition-colors text-xs font-medium text-[var(--text)]"
                            aria-label="Сменить роль"
                        >
                            <CurrentIcon className={`w-3.5 h-3.5 ${currentRole.color}`} />
                            <span className="hidden sm:inline">{currentRole.label}</span>
                            <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {
                            <div className={`fixed right-4 top-16 w-40 rounded-xl border border-white/10 shadow-2xl shadow-black/50 z-[9999] bg-[var(--glass)] backdrop-blur-xl transition-all duration-200 origin-top-right ${roleOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[var(--glass)] border-l border-t border-white/10 rotate-45" />
                                {availableRoles.map(role => {
                                    const config = ROLE_CONFIG[role]
                                    const Icon = config.icon
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleChange(role)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--card-hover)] transition-colors ${
                                                role === user?.role ? 'bg-[var(--card)] text-[var(--text)]' : 'text-[var(--text-muted)]'
                                            }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                            {config.label}
                                        </button>
                                    )
                                })}
                            </div>
                        }
                    </div>

                    {workspaces.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setWsOpen(o => !o)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] transition-colors text-xs font-medium text-[var(--text)]"
                                aria-label="Выбрать проект"
                            >
                                <Folder className="w-3.5 h-3.5 text-[var(--primary)]" />
                                <span className="hidden sm:inline truncate max-w-[120px]">{activeWorkspace?.name || 'Проект'}</span>
                                <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${wsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {
                                <div className={`fixed right-4 top-16 w-48 rounded-xl border border-white/10 shadow-2xl shadow-black/50 z-[9999] bg-[var(--glass)] backdrop-blur-xl transition-all duration-200 origin-top-right ${wsOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[var(--glass)] border-l border-t border-white/10 rotate-45" />
                                    {workspaces.map(ws => (
                                        <button
                                            key={ws._id}
                                            onClick={() => handleWorkspaceChange(ws)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[var(--card-hover)] transition-colors ${
                                                activeWorkspace?._id === ws._id ? 'bg-[var(--card)] text-[var(--text)]' : 'text-[var(--text-muted)]'
                                            }`}
                                        >
                                            {activeWorkspace?._id === ws._id ? <Check className="w-3.5 h-3.5 text-[var(--primary)]" /> : <div className="w-3.5" />}
                                            {ws.name}
                                        </button>
                                    ))}
                                </div>
                            }
                        </div>
                    )}

                    <button
                        onClick={handleNotificationsClick}
                        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <Bell className={`w-5 h-5 ${pushSubscribed ? 'text-emerald-400' : 'text-gray-300'}`} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {user?.role === 'owner' && (
                        <button
                            onClick={handleEmergencyToggle}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />STOP
                        </button>
                    )}

                    <button
                        onClick={() => setProfileOpen(true)}
                        className="flex items-center gap-2 pl-2 border-l border-white/10"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                            {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                        </div>
                        <span className="hidden md:block text-sm text-gray-300">{user?.name || 'Owner'}</span>
                    </button>
                </div>
            </div>
            <UserProfileModal
                user={user}
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onSave={(updated) => {
                    updateUser(updated)
                    if (updated.name) localStorage.setItem('user_profile', JSON.stringify(updated))
                }}
            />
        </header>
    )
}

export default DashboardHeader
