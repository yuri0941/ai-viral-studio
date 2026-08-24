import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    Home, MessageSquare, PlusCircle, Zap, Menu,
} from 'lucide-react'
import { MobileDrawer } from './MobileDrawer.jsx'

// [v6.6-PART2] 5-tab mobile bottom navigation + drawer with all desktop tabs

export function MobileBottomNav({ userRole = 'creator', onHaptic }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const [drawerOpen, setDrawerOpen] = useState(false)

    const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

    const tabs = [
        { icon: Home, label: t('bottomNav.dashboard', 'Dashboard'), path: userRole === 'owner' ? '/owner' : '/dashboard' },
        { icon: MessageSquare, label: t('bottomNav.chat', 'AI Chat'), path: '/creative-hub/chat' },
        { icon: PlusCircle, label: t('bottomNav.create', 'Создать'), path: '/creative-hub', center: true },
        { icon: Zap, label: t('bottomNav.viral', 'Viral Chat'), path: '/creative-hub/viral' },
        { icon: Menu, label: t('bottomNav.menu', 'Меню'), action: () => setDrawerOpen(true) },
    ]

    const handleClick = (tab) => {
        onHaptic?.()
        if (tab.action) {
            tab.action()
        } else {
            navigate(tab.path)
        }
    }

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden h-[calc(56px+env(safe-area-inset-bottom,0px))]">
                <div
                    className="flex items-center justify-around h-full px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 glass-luxury border-t border-[var(--border)]"
                    style={{ minHeight: 56 }}
                >
                    {tabs.map((tab, idx) => {
                        const Icon = tab.icon
                        const active = tab.path ? isActive(tab.path) : false
                        return (
                            <button
                                key={idx}
                                onClick={() => handleClick(tab)}
                                className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] flex-1 rounded-xl transition-all ${
                                    active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                                } ${tab.center ? 'relative -top-3' : ''}`}
                                aria-label={tab.label}
                                type="button"
                            >
                                <div className={`relative ${active ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`}>
                                    {tab.center ? (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 active:scale-95 transition-transform">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                    {active && !tab.center && (
                                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--primary)]" />
                                    )}
                                </div>
                                <span className={`text-[10px] mt-0.5 transition-opacity ${active ? 'opacity-100' : 'opacity-0 min-[375px]:opacity-100'}`}>
                                    {tab.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </nav>
            <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} userRole={userRole} onHaptic={onHaptic} />
        </>
    )
}

export default MobileBottomNav
