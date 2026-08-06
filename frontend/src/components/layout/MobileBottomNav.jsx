import { useNavigate, useLocation } from 'react-router-dom'
import {
    Home, BarChart, Bot, User, LayoutDashboard, Rocket, Users, Shield, Briefcase,
    MessageSquare, BookOpen, Calendar, Plus, Megaphone, Search, Mail, Bell,
} from 'lucide-react'

// [v6.5.5] role-aware mobile bottom navigation with central FAB for creation

const ROLE_CONFIG = {
    owner: {
        tabs: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/owner' },
            { icon: Rocket, label: 'Creative Hub', path: '/creative-hub' },
            { icon: BarChart, label: 'Analytics', path: '/analytics' },
            { icon: Bot, label: 'OMEGA', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: null,
    },
    admin: {
        tabs: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
            { icon: Users, label: 'Users', path: '/admin' },
            { icon: Shield, label: 'Moderation', path: '/ai-vs-human' },
            { icon: Bot, label: 'OMEGA', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: null,
    },
    staff: {
        tabs: [
            { icon: Briefcase, label: 'Tickets', path: '/staff' },
            { icon: MessageSquare, label: 'Chat', path: '/ai-chat' },
            { icon: BookOpen, label: 'KB', path: '/settings' },
            { icon: Bot, label: 'OMEGA', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: null,
    },
    creator: {
        tabs: [
            { icon: Home, label: 'Posts', path: '/dashboard' },
            { icon: BarChart, label: 'Analytics', path: '/analytics' },
            { icon: Bot, label: 'OMEGA', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: { icon: Plus, label: 'Create', path: '/creative-hub' },
    },
    advertiser: {
        tabs: [
            { icon: Megaphone, label: 'Campaigns', path: '/advertiser' },
            { icon: BarChart, label: 'Analytics', path: '/analytics' },
            { icon: Bot, label: 'OMEGA', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: { icon: Plus, label: 'Create', path: '/creative-hub' },
    },
    business: {
        tabs: [
            { icon: Home, label: 'Home', path: '/dashboard' },
            { icon: Calendar, label: 'Schedule', path: '/scheduler' },
            { icon: MessageSquare, label: 'Chat', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: { icon: Plus, label: 'Create', path: '/creative-hub' },
    },
    client: {
        tabs: [
            { icon: Home, label: 'Home', path: '/dashboard' },
            { icon: Calendar, label: 'Schedule', path: '/scheduler' },
            { icon: MessageSquare, label: 'Chat', path: '/ai-chat' },
            { icon: User, label: 'Profile', path: '/settings' },
        ],
        fab: { icon: Plus, label: 'Create', path: '/creative-hub' },
    },
}

export function MobileBottomNav({ userRole = 'creator', onHaptic }) {
    const navigate = useNavigate()
    const location = useLocation()
    const config = ROLE_CONFIG[userRole] || ROLE_CONFIG.creator
    const tabs = config.tabs || []
    const fab = config.fab

    const handleClick = (path) => {
        onHaptic?.()
        navigate(path)
    }

    const renderTab = (tab, idx, isCenter = false) => {
        const Icon = tab.icon
        const active = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path))
        return (
            <button
                key={isCenter ? 'fab' : tab.path + idx}
                onClick={() => handleClick(tab.path)}
                className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] flex-1 rounded-xl transition-all ${
                    active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                }`}
                aria-label={tab.label}
            >
                <div className={`relative ${active ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`}>
                    <Icon className="w-5 h-5" />
                    {active && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--primary)]" />
                    )}
                </div>
                <span className={`text-[10px] mt-0.5 transition-opacity ${
                    active ? 'opacity-100' : 'opacity-0'
                } min-[430px]:opacity-100`}>
                    {tab.label}
                </span>
            </button>
        )
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
            <div
                className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 border-t border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl"
                style={{ minHeight: 64 }}
            >
                {tabs.slice(0, 2).map((tab, idx) => renderTab(tab, idx))}
                {fab ? (
                    <button
                        onClick={() => handleClick(fab.path)}
                        className="relative -top-5 w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50"
                        aria-label={fab.label}
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                ) : (
                    renderTab(tabs[2], 2)
                )}
                {tabs.slice(fab ? 2 : 3).map((tab, idx) => renderTab(tab, idx + 3))}
            </div>
        </nav>
    )
}

export default MobileBottomNav
