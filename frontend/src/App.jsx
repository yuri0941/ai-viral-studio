import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layout
import { DashboardShell } from './components/layout/DashboardShell'

// Hooks
import { useNotifications } from './hooks/useNotifications'
import { useDashboardData } from './hooks/useDashboardData'

// Pages
import LandingPage from './pages/LandingPage'
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import StaffDashboardPage from './pages/StaffDashboardPage'
import AdvertiserDashboardPage from './pages/AdvertiserDashboardPage'
import CreatorDashboardPage from './pages/CreatorDashboardPage'
import AIChatPage from './pages/AIChatPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SchedulerPage from './pages/SchedulerPage'
import SettingsPage from './pages/SettingsPage'
import ContentAnalyzerPage from './pages/ContentAnalyzerPage'
import ViralChatPage from './pages/ViralChatPage'
import AdvertiserRequestsPage from './pages/AdvertiserRequestsPage'
import { PrivacyPolicyPage, TermsOfServicePage, ConsentPage } from './pages/legal/LegalPage'

const PAGE_TITLES = {
    '/owner': 'Owner Dashboard',
    '/admin': 'Admin Panel',
    '/staff': 'Staff Panel',
    '/advertiser': 'Advertiser Panel',
    '/dashboard': 'Creator Dashboard',
    '/ai-chat': 'AI Chat',
    '/analytics': 'Analytics',
    '/scheduler': 'Scheduler',
    '/settings': 'Settings',
    '/analyzer': 'Content Analyzer',
    '/viral-chat': 'Viral Chat',
    '/advertiser-requests': 'Заявки на рекламу',
}

// ============================================
// PROTECTED ROUTE
// ============================================
function ProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated, loading, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications()
    const { data: teamData } = useDashboardData('team')
    const { data: subsData } = useDashboardData('subscriptions')

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#00ff41] border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/unauthorized" replace />
    }

    return (
        <DashboardShell
            userRole={user?.role || 'creator'}
            user={user}
            title={PAGE_TITLES[location.pathname] || 'AI Viral Studio'}
            cabinets={teamData?.cabinets || []}
            subscriptions={subsData?.subscriptions || []}
            notifications={notifications}
            unreadCount={unreadCount}
            onLogout={handleLogout}
            onMarkNotificationRead={markRead}
            onMarkAllNotificationsRead={markAllRead}
            onDeleteNotification={remove}
        >
            {children}
        </DashboardShell>
    )
}

// ============================================
// ROLE REDIRECT
// ============================================
function RoleRedirect() {
    const { user } = useAuth()

    switch (user?.role) {
        case 'owner': return <Navigate to="/owner" replace />
        case 'admin': return <Navigate to="/admin" replace />
        case 'staff': return <Navigate to="/staff" replace />
        case 'advertiser': return <Navigate to="/advertiser" replace />
        default: return <Navigate to="/dashboard" replace />
    }
}

// ============================================
// APP
// ============================================
function App() {
    useEffect(() => {
        const meta = document.createElement('meta')
        meta.name = 'viewport'
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
        document.head.appendChild(meta)

        const metaTheme = document.createElement('meta')
        metaTheme.name = 'theme-color'
        metaTheme.content = '#0a0a0f'
        document.head.appendChild(metaTheme)

        return () => {
            document.head.removeChild(meta)
            document.head.removeChild(metaTheme)
        }
    }, [])

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LandingPage showLogin={true} />} />
            <Route path="/register" element={<LandingPage showRegister={true} />} />
            <Route path="/redirect" element={<RoleRedirect />} />

            <Route path="/owner" element={
                <ProtectedRoute allowedRoles={['owner']}>
                    <OwnerDashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'owner']}>
                    <AdminDashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/staff" element={
                <ProtectedRoute allowedRoles={['staff', 'admin', 'owner']}>
                    <StaffDashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/advertiser" element={
                <ProtectedRoute allowedRoles={['advertiser', 'owner']}>
                    <AdvertiserDashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['creator', 'business', 'owner']}>
                    <CreatorDashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/ai-chat" element={
                <ProtectedRoute>
                    <AIChatPage />
                </ProtectedRoute>
            } />
            <Route path="/analytics" element={
                <ProtectedRoute>
                    <AnalyticsPage />
                </ProtectedRoute>
            } />
            <Route path="/scheduler" element={
                <ProtectedRoute>
                    <SchedulerPage />
                </ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <SettingsPage />
                </ProtectedRoute>
            } />
            <Route path="/analyzer" element={
                <ProtectedRoute>
                    <ContentAnalyzerPage />
                </ProtectedRoute>
            } />
            <Route path="/viral-chat" element={
                <ProtectedRoute>
                    <ViralChatPage />
                </ProtectedRoute>
            } />
            <Route path="/advertiser-requests" element={
                <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <AdvertiserRequestsPage />
                </ProtectedRoute>
            } />

            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/consent" element={<ConsentPage />} />

            <Route path="*" element={
                <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
                    <div className="text-center px-4">
                        <h1 className="text-5xl sm:text-6xl font-bold text-[#00ff41] mb-4">404</h1>
                        <p className="text-gray-400 text-sm sm:text-base">Страница не найдена</p>
                    </div>
                </div>
            } />
        </Routes>
    )
}

export default App
