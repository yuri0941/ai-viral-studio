import { useNavigate, useLocation } from 'react-router-dom'
import { Home, BarChart, Bot, Bell, User, Megaphone, Users, Briefcase, Shield } from 'lucide-react'

const ROLE_TABS = {
    owner: [
        { icon: Home, label: 'Главная', path: '/owner' },
        { icon: BarChart, label: 'Аналитика', path: '/analytics' },
        { icon: Bot, label: 'AI', path: '/ai-chat' },
        { icon: Bell, label: 'Уведомления', path: '/notifications' },
        { icon: User, label: 'Профиль', path: '/settings' },
    ],
    admin: [
        { icon: Shield, label: 'Админ', path: '/admin' },
        { icon: BarChart, label: 'Аналитика', path: '/analytics' },
        { icon: Bot, label: 'AI', path: '/ai-chat' },
        { icon: Bell, label: 'Уведомления', path: '/notifications' },
        { icon: User, label: 'Профиль', path: '/settings' },
    ],
    staff: [
        { icon: Briefcase, label: 'Staff', path: '/staff' },
        { icon: Bot, label: 'AI', path: '/ai-chat' },
        { icon: Bell, label: 'Уведомления', path: '/notifications' },
        { icon: User, label: 'Профиль', path: '/settings' },
    ],
    advertiser: [
        { icon: Megaphone, label: 'Реклама', path: '/advertiser' },
        { icon: BarChart, label: 'Аналитика', path: '/analytics' },
        { icon: Bot, label: 'AI', path: '/ai-chat' },
        { icon: Bell, label: 'Уведомления', path: '/notifications' },
        { icon: User, label: 'Профиль', path: '/settings' },
    ],
    creator: [
        { icon: Home, label: 'Главная', path: '/dashboard' },
        { icon: BarChart, label: 'Аналитика', path: '/analytics' },
        { icon: Bot, label: 'AI', path: '/ai-chat' },
        { icon: Bell, label: 'Уведомления', path: '/notifications' },
        { icon: User, label: 'Профиль', path: '/settings' },
    ],
    business: [
        { icon: Users, label: 'Бизнес', path: '/dashboard' },
        { icon: BarChart, label: 'Аналитика', path: '/analytics' },
        { icon: Bot, label: 'AI', path: '/ai-chat' },
        { icon: Bell, label: 'Уведомления', path: '/notifications' },
        { icon: User, label: 'Профиль', path: '/settings' },
    ],
}

export function MobileBottomNav({ userRole = 'creator', onHaptic }) {
    const navigate = useNavigate()
    const location = useLocation()
    const tabs = ROLE_TABS[userRole] || ROLE_TABS.creator

    const handleClick = (path) => {
        onHaptic?.()
        navigate(path)
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
            <div
                className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 border-t border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl"
                style={{ minHeight: 64 }}
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const active = location.pathname === tab.path
                    return (
                        <button
                            key={tab.path}
                            onClick={() => handleClick(tab.path)}
                            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] flex-1 rounded-xl transition-colors ${
                                active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                            }`}
                            aria-label={tab.label}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] mt-0.5">{tab.label}</span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

export default MobileBottomNav
