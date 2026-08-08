import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
    LayoutDashboard, BarChart, MessageSquare, Search, Swords, Zap, Calendar, Settings,
    X, LogOut,
} from 'lucide-react'

// [v6.6-PART2] full drawer with all desktop sidebar tabs

const ALL_TABS = [
    { id: 'dashboard', path: '/dashboard', label: 'sidebar.dashboard', icon: LayoutDashboard, defaultLabel: 'Dashboard' },
    { id: 'analytics', path: '/analytics', label: 'sidebar.analytics', icon: BarChart, defaultLabel: 'Аналитика' },
    { id: 'aiChat', path: '/ai-chat', label: 'sidebar.aiChat', icon: MessageSquare, defaultLabel: 'AI Chat' },
    { id: 'contentAnalysis', path: '/content-analysis', label: 'sidebar.contentAnalysis', icon: Search, defaultLabel: 'Анализ контента' },
    { id: 'aiVsHuman', path: '/ai-vs-human', label: 'sidebar.aiVsHuman', icon: Swords, defaultLabel: 'AI vs Human' },
    { id: 'viralChat', path: '/viral-chat', label: 'sidebar.viralChat', icon: Zap, defaultLabel: 'Viral Chat' },
    { id: 'planner', path: '/scheduler', label: 'sidebar.planner', icon: Calendar, defaultLabel: 'Планировщик' },
    { id: 'settings', path: '/settings', label: 'sidebar.settings', icon: Settings, defaultLabel: 'Настройки' },
]

export function MobileDrawer({ open, onClose, userRole = 'creator', onHaptic }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { logout } = useAuth()
    const touchStartX = useRef(null)
    const drawerRef = useRef(null)

    const handleClose = useCallback(() => {
        onHaptic?.()
        onClose()
    }, [onClose, onHaptic])

    const handleNavigate = (path) => {
        navigate(path)
        handleClose()
    }

    const handleLogout = () => {
        onHaptic?.()
        logout?.()
        handleClose()
        navigate('/')
    }

    useEffect(() => {
        if (!open) return
        const onKey = (e) => {
            if (e.key === 'Escape') handleClose()
        }
        document.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
        }
    }, [open, handleClose])

    const onTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX
    }

    const onTouchMove = (e) => {
        if (touchStartX.current == null) return
        const currentX = e.touches[0].clientX
        const diff = touchStartX.current - currentX
        if (diff > 80) {
            handleClose()
            touchStartX.current = null
        }
    }

    if (!open) return null

    const ownerRoot = userRole === 'owner' ? '/owner' : '/dashboard'

    return (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
                aria-hidden="true"
            />
            <div
                ref={drawerRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                className="fixed left-0 top-0 h-full w-[280px] bg-[var(--bg)] border-r border-[var(--border)] shadow-2xl z-[61] flex flex-col"
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                    <span className="text-lg font-bold text-[var(--text)]">{t('sidebar.menu', 'Меню')}</span>
                    <button
                        onClick={handleClose}
                        type="button"
                        className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {ALL_TABS.map((tab) => {
                        const Icon = tab.icon
                        const path = tab.id === 'dashboard' ? ownerRoot : tab.path
                        const active = location.pathname === path || (tab.path !== '/' && location.pathname.startsWith(tab.path))
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleNavigate(path)}
                                type="button"
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                    active
                                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                        : 'text-[var(--text)] hover:bg-[var(--surface)]'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                {t(tab.label, tab.defaultLabel)}
                            </button>
                        )
                    })}
                </nav>
                <div className="border-t border-[var(--border)] p-3">
                    <button
                        onClick={handleLogout}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {t('common.logout', 'Выйти')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default MobileDrawer
