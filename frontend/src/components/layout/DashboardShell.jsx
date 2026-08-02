import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { setLanguage as setI18nLanguage, default as i18n } from '../../i18n'
import '../../styles/animations.css'
import { AppSidebar } from './AppSidebar'
import { DashboardHeader } from './DashboardHeader'
import { MobileNotificationDrawer } from './MobileNotificationDrawer'

function useViewport() {
    const [viewport, setViewport] = useState({
        isMobile: window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
    })

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                isMobile: window.innerWidth < 1024,
                isDesktop: window.innerWidth >= 1024,
            })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return viewport
}

export function DashboardShell({
    userRole,
    user,
    menuItems,
    cabinets = [],
    notifications = [],
    subscriptions = [],
    onLogout,
    onMarkNotificationRead,
    onMarkAllNotificationsRead,
    onDeleteNotification,
    children,
    title,
    unreadCount = 0,
}) {
    const location = useLocation()
    const viewport = useViewport()
    const { updateUser } = useAuth()
    const { theme, appliedTheme, setTheme, toggleTheme } = useTheme()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [mobileNotifOpen, setMobileNotifOpen] = useState(false)
    const [language, setLanguage] = useState(() => {
        return user?.preferences?.language || localStorage.getItem('app_language') || 'ru'
    })

    useEffect(() => {
        setSidebarOpen(false)
        setMobileNotifOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const i18nLang = i18n.language?.split('-')[0]
        if (i18nLang && ['ru', 'en'].includes(i18nLang) && i18nLang !== language) {
            setLanguage(i18nLang)
        }
    }, [language])

    // Initial language sync from user preferences (once)
    const languageSynced = useRef(false)
    useEffect(() => {
        if (languageSynced.current) return
        const prefsLang = user?.preferences?.language
        if (prefsLang && prefsLang !== language) {
            setLanguage(prefsLang)
        }
        languageSynced.current = true
    }, [user?.preferences?.language, language])

    const handleLanguageChange = useCallback((nextLanguage) => {
        if (!nextLanguage || nextLanguage === language) return
        localStorage.setItem('app_language', nextLanguage)
        setI18nLanguage(nextLanguage)
        const prefs = user?.preferences || {}
        if (prefs.language !== nextLanguage) {
            updateUser({ preferences: { ...prefs, language: nextLanguage } })
        }
        setLanguage(nextLanguage)
    }, [language, user?.preferences, updateUser])

    // Initial theme sync from user preferences (once)
    const themeSynced = useRef(false)
    useEffect(() => {
        if (themeSynced.current) return
        const prefsTheme = user?.preferences?.theme
        if (prefsTheme && ['light', 'dark'].includes(prefsTheme) && prefsTheme !== theme) {
            setTheme(prefsTheme)
        }
        themeSynced.current = true
    }, [user?.preferences?.theme, theme, setTheme])

    const handleThemeToggle = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        const prefs = user?.preferences || {}
        if (prefs.theme !== next) {
            updateUser({ preferences: { ...prefs, theme: next } })
        }
    }, [theme, setTheme, updateUser, user?.preferences])

    useEffect(() => {
        if (viewport.isMobile) {
            document.body.style.overflow = sidebarOpen || mobileNotifOpen ? 'hidden' : ''
        }
        return () => { document.body.style.overflow = '' }
    }, [sidebarOpen, mobileNotifOpen, viewport.isMobile])

    return (
        <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300 relative animated-gradient-bg">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && viewport.isMobile && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile notifications overlay */}
            {mobileNotifOpen && viewport.isMobile && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                    onClick={() => setMobileNotifOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50
                    transform transition-transform duration-300 ease-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${viewport.isDesktop ? 'lg:static lg:translate-x-0' : ''}
                `}
            >
                <AppSidebar
                    userRole={userRole}
                    menuItems={menuItems}
                    cabinets={cabinets}
                    notifications={notifications}
                    subscriptions={subscriptions}
                    user={user}
                    onLogout={onLogout}
                    onClose={() => setSidebarOpen(false)}
                    isMobile={viewport.isMobile}
                />
            </aside>

            {/* Mobile notifications drawer */}
            <MobileNotificationDrawer
                isOpen={mobileNotifOpen}
                onClose={() => setMobileNotifOpen(false)}
                notifications={notifications}
                onMarkRead={onMarkNotificationRead}
                onMarkAllRead={onMarkAllNotificationsRead}
                onDelete={onDeleteNotification}
            />

            {/* Main content */}
            <main className="flex-1 min-h-screen w-full overflow-x-hidden">
                <DashboardHeader
                    title={title}
                    user={user}
                    unreadCount={unreadCount}
                    language={language}
                    onLanguageChange={handleLanguageChange}
                    isDark={appliedTheme === 'dark'}
                    onThemeToggle={handleThemeToggle}
                    onMenuClick={() => setSidebarOpen(true)}
                    onNotificationsClick={() => setMobileNotifOpen(true)}
                />

                <div className={`${viewport.isMobile ? 'px-3 py-4' : viewport.isDesktop ? 'px-6 lg:px-8 py-6' : 'px-4 py-5'}`}>
                    {children}
                </div>
            </main>
        </div>
    )
}
