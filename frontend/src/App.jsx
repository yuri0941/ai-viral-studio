import { useEffect, Suspense, lazy, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layout
import { DashboardShell } from './components/layout/DashboardShell'
import { CommandPalette } from './components/layout/CommandPalette'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'

// Hooks
import { useNotifications } from './hooks/useNotifications'
import { useDashboardData } from './hooks/useDashboardData'

import { useOTAUpdate } from './hooks/useOTAUpdate.js'

// Pages
import LandingPage from './pages/LandingPage'
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import StaffDashboardPage from './pages/StaffDashboardPage'
import AdvertiserDashboardPage from './pages/AdvertiserDashboardPage'
import CreatorDashboardPage from './pages/CreatorDashboardPage'
const AIChatPage = lazy(() => import('./pages/AIChatPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SchedulerPage = lazy(() => import('./pages/SchedulerPage'))
import SettingsPage from './pages/SettingsPage'
import DownloadPage from './pages/DownloadPage'
const ContentAnalyzerPage = lazy(() => import('./pages/ContentAnalyzerPage'))
const AIvsHumanPage = lazy(() => import('./pages/owner/AIvsHumanPage'))
const BoardroomPage = lazy(() => import('./pages/owner/BoardroomPage'))
const BusinessSpawnerPage = lazy(() => import('./pages/owner/BusinessSpawnerPage'))
const ViralChatPage = lazy(() => import('./pages/ViralChatPage'))
import LeaderboardPage from './pages/LeaderboardPage'
import ChallengePage from './pages/ChallengePage'
import AdvertiserRequestsPage from './pages/AdvertiserRequestsPage'
import OwnerAppPage from './pages/owner-app/index'
import PaymentSuccess from './pages/PaymentSuccess'
import StripeCheckoutPage from './pages/StripeCheckoutPage'
import CheckoutPage from './pages/CheckoutPage'
import { PrivacyPolicyPage, TermsOfServicePage, ConsentPage } from './pages/legal/LegalPage'
import { CookieConsent } from './components/CookieConsent'
import GDPRPage from './pages/GDPRPage'
import LaunchPage from './pages/LaunchPage'
import PublicRoadmap from './pages/landing/PublicRoadmap'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import { UpdateModal } from './components/shared/UpdateModal.jsx'
import { APP_VERSION } from './config/version.js'

// Version check: warn if backend requires newer frontend
function VersionCheck() {
    const [update, setUpdate] = useState(null)
    const [changelog, setChangelog] = useState([])

    useEffect(() => {
        let cancelled = false
        fetch('/api/version')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data || cancelled) return
                if (data.requiredFrontend && data.requiredFrontend !== APP_VERSION) {
                    fetch('/api/version/changelog')
                        .then(r => r.ok ? r.json() : { changelog: [] })
                        .then(cl => {
                            if (cancelled) return
                            setChangelog(cl.changelog || [])
                            setUpdate(data.requiredFrontend)
                        })
                        .catch(() => {
                            if (cancelled) return
                            setUpdate(data.requiredFrontend)
                        })
                }
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [])

    if (!update) return null

    const handleUpdate = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt')
        if (token) localStorage.setItem('pending_auth_token', token)
        window.location.reload(true)
    }

    return (
        <UpdateModal
            version={update}
            changelog={changelog}
            onUpdate={handleUpdate}
            onRemind={() => setUpdate(null)}
            onSkip={() => setUpdate(null)}
        />
    )
}

// [v6.0] added: Creative Hub + Luxury Document Viewer
import CreativeHub from './components/creative-hub/CreativeHub.jsx'
import LuxuryDocumentViewer from './components/documents/LuxuryDocumentViewer.jsx'

// [v6.0] added: simple document viewer wrapper for /documents/:fileId route
function DocumentPage() {
    const { fileId } = useParams()
    const navigate = useNavigate()
    const [content, setContent] = useState('')
    const [fileName, setFileName] = useState(fileId || 'document')
    const [fileType, setFileType] = useState('txt')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const ext = (fileName.split('.').pop() || 'txt').toLowerCase()
        setFileType(ext)
        fetch(`/api/documents/${fileId}`)
            .then(async res => {
                if (!res.ok) throw new Error('Document not found')
                const text = await res.text()
                setContent(text)
            })
            .catch(() => {
                setContent('// Document preview is not available for this file.\n// [v6.0] added placeholder')
            })
            .finally(() => setLoading(false))
    }, [fileId, fileName])

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading documentвЂ¦</div>

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4">
            <LuxuryDocumentViewer
                content={content}
                fileName={fileName}
                fileType={fileType}
                onClose={() => navigate(-1)}
                onDownload={() => alert('Download: ' + fileName)}
            />
        </div>
    )
}

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
    '/ai-vs-human': 'AI vs Human',
    '/boardroom': 'AI Boardroom',
    '/business-spawner': 'Business Spawner',
    '/advertiser-requests': 'Р—Р°СЏРІРєРё РЅР° СЂРµРєР»Р°РјСѓ',
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
  const BUILD_ID = 'v7.0.0-2026-08-07'; console.log('[BUILD]', BUILD_ID);
      // v7.0.0-force-rebuild
  window.__APP_BUILD__ = 'v7.0.0';
  console.log('[AI VIRAL STUDIO] Build:', window.__APP_BUILD__);
  useOTAUpdate()
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
        <>
            <VersionCheck />
            <Suspense fallback={
                <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[#00ff41] border-t-transparent rounded-full" />
                </div>
            }>
                <ErrorBoundary>
                <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LandingPage showLogin={true} />} />
                <Route path="/register" element={<LandingPage showRegister={true} />} />
                <Route path="/redirect" element={<RoleRedirect />} />

                {/* [v6.0] added: backward compatible redirects to Creative Hub */}
                <Route path="/chat" element={<Navigate to="/creative-hub/chat" replace />} />
                <Route path="/analyzer" element={<Navigate to="/creative-hub/analyzer" replace />} />
                <Route path="/planner" element={<Navigate to="/creative-hub/planner" replace />} />
                <Route path="/viral" element={<Navigate to="/creative-hub/viral" replace />} />
                <Route path="/viral-chat" element={<Navigate to="/creative-hub/viral" replace />} />
                <Route path="/omega-chat" element={<Navigate to="/creative-hub/chat" replace />} />
                <Route path="/ai-chat" element={<Navigate to="/creative-hub/chat" replace />} />

                <Route path="/creative-hub" element={
                    <ProtectedRoute>
                        <CreativeHub />
                    </ProtectedRoute>
                } />
                <Route path="/creative-hub/:mode" element={
                    <ProtectedRoute>
                        <CreativeHub />
                    </ProtectedRoute>
                } />
                <Route path="/documents/:fileId" element={
                    <ProtectedRoute>
                        <DocumentPage />
                    </ProtectedRoute>
                } />

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
                <Route path="/ai-vs-human" element={
                    <ProtectedRoute>
                        <AIvsHumanPage />
                    </ProtectedRoute>
                } />
                <Route path="/boardroom" element={
                    <ProtectedRoute allowedRoles={['owner', 'admin', 'business']}>
                        <BoardroomPage />
                    </ProtectedRoute>
                } />
                <Route path="/business-spawner" element={
                    <ProtectedRoute allowedRoles={['owner', 'admin', 'business']}>
                        <BusinessSpawnerPage />
                    </ProtectedRoute>
                } />
                <Route path="/leaderboard" element={
                    <ProtectedRoute allowedRoles={['creator', 'business', 'owner']}>
                        <LeaderboardPage />
                    </ProtectedRoute>
                } />
                <Route path="/challenge" element={
                    <ProtectedRoute allowedRoles={['creator', 'business', 'owner']}>
                        <ChallengePage />
                    </ProtectedRoute>
                } />
                <Route path="/advertiser-requests" element={
                    <ProtectedRoute allowedRoles={['owner', 'admin']}>
                        <AdvertiserRequestsPage />
                    </ProtectedRoute>
                } />

                <Route path="/owner-app" element={
                    <ProtectedRoute allowedRoles={['owner']}>
                        <OwnerAppPage />
                    </ProtectedRoute>
                } />

                <Route path="/developer" element={
                    <ProtectedRoute allowedRoles={['owner', 'admin', 'business']}>
                        <Navigate to="/owner?tab=developer" replace />
                    </ProtectedRoute>
                } />

                <Route path="/white-label" element={
                    <ProtectedRoute allowedRoles={['owner', 'admin']}>
                        <Navigate to="/owner?tab=whiteLabel" replace />
                    </ProtectedRoute>
                } />

                <Route path="/workspaces" element={
                    <ProtectedRoute allowedRoles={['owner', 'admin', 'business']}>
                        <Navigate to="/owner?tab=workspaces" replace />
                    </ProtectedRoute>
                } />

                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/stripe-checkout" element={
                    <ProtectedRoute>
                        <StripeCheckoutPage />
                    </ProtectedRoute>
                } />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                <Route path="/consent" element={<ConsentPage />} />
                <Route path="/gdpr" element={
                    <ProtectedRoute>
                        <GDPRPage />
                    </ProtectedRoute>
                } />
                <Route path="/data-export" element={
                    <ProtectedRoute>
                        <Navigate to="/gdpr" replace />
                    </ProtectedRoute>
                } />
                <Route path="/launch" element={<LaunchPage />} />
                <Route path="/roadmap" element={<PublicRoadmap />} />
                <Route path="/download" element={<DownloadPage />} />
                <Route path="/onboarding" element={<OnboardingWizard />} />
                <Route path="/welcome" element={<Navigate to="/onboarding" replace />} />

                <Route path="/business" element={
                    <ProtectedRoute allowedRoles={['business', 'owner', 'admin']}>
                        <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
                </ErrorBoundary>
            </Suspense>

            <CookieConsent />
        <CommandPalette />
    </>
)
}

export default App




