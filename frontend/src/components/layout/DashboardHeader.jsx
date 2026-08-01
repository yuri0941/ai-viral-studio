import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, User, Globe, Shield, Briefcase, Headphones, Megaphone, UserCircle, ChevronDown, Sun, Moon, OctagonAlert, Play } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { UserProfileModal } from './UserProfileModal'

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
        navigate(config.route, { replace: true })
        setRoleOpen(false)
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
        <header className="sticky top-0 z-30 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 lg:px-8 py-4 transition-colors duration-300">
            <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        aria-label="Открыть меню"
                    >
                        <Menu className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-lg font-semibold text-white/90 truncate">{title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {showSearch && (
                        <div className="hidden md:flex items-center bg-white/5 rounded-lg px-3 py-1.5 border border-white/[0.06]">
                            <Search className="w-4 h-4 text-gray-500 mr-2" />
                            <input
                                type="text"
                                placeholder="Поиск..."
                                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-40"
                            />
                        </div>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setLangOpen(o => !o)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-white/80"
                            aria-label="Выбрать язык"
                            title="Русский / English"
                        >
                            <Globe className="w-3.5 h-3.5 text-white/70" />
                            <span className="uppercase">{language}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {langOpen && (
                            <div className="absolute right-0 mt-2 w-32 rounded-xl bg-[#0f0f1a] border border-white/10 shadow-xl overflow-hidden z-50">
                                {['ru', 'en'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => handleLanguageChange(lang)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${
                                            language === lang ? 'bg-white/[0.03] text-white' : 'text-gray-300'
                                        }`}
                                    >
                                        <span className="uppercase w-4 font-mono text-[#8B5CF6]">{lang}</span>
                                        {lang === 'ru' ? 'Русский' : 'English'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onThemeToggle}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/80"
                        aria-label="Переключить тему"
                        title={isDark ? 'Светлая тема' : 'Тёмная тема'}
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    {/* Role Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setRoleOpen(o => !o)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-white/80"
                            aria-label="Сменить роль"
                        >
                            <CurrentIcon className={`w-3.5 h-3.5 ${currentRole.color}`} />
                            <span className="hidden sm:inline">{currentRole.label}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {roleOpen && (
                            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-[#0f0f1a] border border-white/10 shadow-xl overflow-hidden z-50">
                                {availableRoles.map(role => {
                                    const config = ROLE_CONFIG[role]
                                    const Icon = config.icon
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleChange(role)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${
                                                role === user?.role ? 'bg-white/[0.03] text-white' : 'text-gray-300'
                                            }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                            {config.label}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onNotificationsClick}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors relative"
                    >
                        <Bell className="w-5 h-5 text-white/70" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {user?.role === 'owner' && (
                        <button
                            onClick={handleEmergencyToggle}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                emergencyStopped
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                            title={emergencyStopped ? 'RESUME OMEGA' : 'STOP OMEGA'}
                        >
                            {emergencyStopped ? <Play className="w-3.5 h-3.5" /> : <OctagonAlert className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{emergencyStopped ? '▶️ RESUME' : '🛑 STOP'}</span>
                        </button>
                    )}

                    <button
                        onClick={() => setProfileOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00ff41] to-[#00cc33] flex items-center justify-center text-xs font-bold text-black">
                            {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                        </div>
                        <span className="text-sm text-white/80 hidden sm:inline">{user?.name || 'User'}</span>
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
