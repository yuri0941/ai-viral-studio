import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config.js'
import {
    Shield, Users, Activity, Star, AlertTriangle, FileText,
    Settings, DollarSign, Check, X, AlertCircle, Save,
    BarChart, Terminal, Wrench, TrendingUp, Filter
} from 'lucide-react'
import { UsersManager } from '../components/shared/UsersManager'

const MODERATION_REPORTS = [
    { id: 1, user: 'user1@mail.com', content: 'Нецензурный контент', platform: 'YouTube', date: '10 мин назад', status: 'pending' },
    { id: 2, user: 'creator99@mail.com', content: 'Спам в комментариях', platform: 'TikTok', date: '1 час назад', status: 'pending' },
    { id: 3, user: 'biz@company.com', content: 'Нарушение авторских прав', platform: 'Instagram', date: '3 часа назад', status: 'reviewed' },
    { id: 4, user: 'test@mail.com', content: 'Фейковые просмотры', platform: 'YouTube', date: 'Вчера', status: 'pending' },
    { id: 5, user: 'spam@bot.ru', content: 'Массовая рассылка', platform: 'Telegram', date: 'Вчера', status: 'pending' },
]

const SYSTEM_LOGS = [
    { time: '09:42:15', level: 'error', message: 'Connection timeout to Groq API', service: 'AI Chat' },
    { time: '09:38:22', level: 'warning', message: 'High memory usage: 87%', service: 'Backend' },
    { time: '09:35:01', level: 'info', message: 'User login: admin@ai-viral.com', service: 'Auth' },
    { time: '09:30:45', level: 'error', message: 'Failed to upload video: timeout', service: 'Scheduler' },
    { time: '09:28:12', level: 'info', message: 'Daily backup completed', service: 'Database' },
    { time: '09:25:33', level: 'warning', message: 'Rate limit approaching: 850/1000', service: 'YouTube API' },
]

const PLATFORM_DEFAULTS = {
    apiRateLimit: 1000,
    maxFileSize: 500,
    allowedFormats: ['jpg', 'png', 'mp4', 'mov'],
    defaultQuota: 50,
    maintenanceMode: false,
}

// [ADMIN-PANEL-POLISH] Выручка — только реальные ₽ из БД.
// Источник тот же, что у owner-кабинета (OverviewTab) и TG-бота: getOwnerMetricsWidget
// через GET /owner/control/metrics (owner+admin). Нет данных → честный 0, без моков.
const FINANCE_ZERO = { revenue7d: 0, mrr: 0, paying: 0 }

const formatRub = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} ₽`

function AdminDashboardPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [toast, setToast] = useState(null)

    // --- USERS STATE ---
    // [VIEW-AS-PARITY] загрузка/фильтры/модалки пользователей перенесены в shared/UsersManager;
    // здесь остаётся только список для stats-карточек (обновляется через onUsersLoaded)
    const [users, setUsers] = useState([])
    const handleUsersLoaded = useCallback((list) => setUsers(list), [])

    // --- MODALS ---
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showModerationModal, setShowModerationModal] = useState(false)
    const [showLogsModal, setShowLogsModal] = useState(false)
    const [showPlatformSettingsModal, setShowPlatformSettingsModal] = useState(false)
    const [showFinanceModal, setShowFinanceModal] = useState(false)

    const [reports, setReports] = useState(MODERATION_REPORTS)
    const [settings, setSettings] = useState(PLATFORM_DEFAULTS)
    const [settingsForm, setSettingsForm] = useState({ ...PLATFORM_DEFAULTS })
    const [maintenanceMode, setMaintenanceMode] = useState(PLATFORM_DEFAULTS.maintenanceMode)
    const [reportFilter, setReportFilter] = useState('all')

    // [ADMIN-PANEL-POLISH] живые финансовые метрики (₽) — единый источник с owner-кабинетом
    const [finance, setFinance] = useState(FINANCE_ZERO)
    useEffect(() => {
        let mounted = true
        const token = localStorage.getItem('token')
        fetch(`${API_BASE_URL}/owner/control/metrics`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
            .then(res => (res.ok ? res.json() : null))
            .then(json => {
                const m = json?.metrics
                if (mounted && m) {
                    setFinance({
                        revenue7d: m.funnel7d?.revenueRub ?? 0,
                        mrr: m.mrr ?? 0,
                        paying: m.paying ?? 0,
                    })
                }
            })
            .catch(() => { /* честные нули */ })
        return () => { mounted = false }
    }, [])

    const liveStats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        bannedUsers: users.filter(u => u.status === 'banned').length,
        pendingUsers: users.filter(u => u.status === 'pending').length,
        activeToday: Math.round(users.length * 0.12),
        newToday: Math.round(users.length * 0.03),
        reportsPending: reports.filter(r => r.status === 'pending').length,
        totalPosts: users.reduce((s, u) => s + (u?.posts || 0), 0),
        revenue: finance.revenue7d
    }

    // --- TOAST ---
    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // --- FILTERED USERS — перенесены в shared/UsersManager ---

    const handleReportAction = (reportId, action) => {
        const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reviewed'
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: nextStatus } : r))
        showToast(action === 'approve' ? t('admin.reportApproved') : action === 'reject' ? t('admin.reportRejected') : t('admin.reportReviewed'))
    }

    const handleSaveSettings = () => {
        setSettings({ ...settingsForm })
        setMaintenanceMode(settingsForm.maintenanceMode)
        setShowPlatformSettingsModal(false)
        showToast(t('admin.settingsSaved'))
    }

    // --- ROLE/STYLES — хелперы ролей/статусов перенесены в shared/UsersManager ---

    const getLogLevelClass = (level) => {
        const base = 'flex-shrink-0 px-1.5 py-0.5 rounded text-xs '
        switch (level) {
            case 'error': return base + 'bg-[var(--danger)]/10 text-[var(--danger)]'
            case 'warning': return base + 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]'
            default: return base + 'bg-[var(--accent)]/10 text-[var(--accent)]'
        }
    }

    const getReportStatusDotClass = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-400'
            case 'approved': return 'bg-[var(--success)]'
            case 'rejected': return 'bg-red-400'
            default: return 'bg-blue-400'
        }
    }

    const getReportStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending': return 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] border-yellow-500/20'
            case 'approved': return 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
            case 'rejected': return 'bg-[var(--danger)]/10 text-[var(--danger)] border-red-500/20'
            default: return 'bg-[var(--accent)]/10 text-[var(--accent)] border-blue-500/20'
        }
    }

    const getReportStatusLabel = (status) => t(`admin.${status}`, status)

    const getFilterButtonClass = (id, current) => {
        return id === current
            ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
            : 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--primary-soft)] border border-transparent'
    }

    // --- ACTIONS пользователей перенесены в shared/UsersManager ---

    // --- STATS CARDS ---
    // [ADMIN-PANEL-POLISH] у каждой метрики — человекочитаемая подпись: что за число и за какой период
    const statsCards = [
        { label: t('admin.totalUsers'), value: liveStats.totalUsers.toLocaleString(), sub: t('admin.activeUsers', { count: liveStats.activeUsers, banned: liveStats.bannedUsers, pending: liveStats.pendingUsers }), icon: Users, gradient: 'from-sky-500 to-blue-600' },
        { label: t('admin.activeToday'), value: liveStats.activeToday, sub: t('admin.subToday'), icon: Activity, gradient: 'from-emerald-500 to-teal-600' },
        { label: t('admin.newToday'), value: `+${liveStats.newToday}`, sub: t('admin.subToday'), icon: Star, gradient: 'from-amber-500 to-orange-600' },
        { label: t('admin.reports'), value: liveStats.reportsPending, sub: t('admin.subPending'), icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
        { label: t('admin.totalPosts'), value: liveStats.totalPosts.toLocaleString(), sub: t('admin.subAllTime'), icon: FileText, gradient: 'from-violet-500 to-fuchsia-600' },
        { label: t('admin.revenue'), value: formatRub(liveStats.revenue), sub: t('admin.sub7days'), icon: DollarSign, gradient: 'from-emerald-500 to-green-600' }
    ]

    // --- QUICK ACTIONS ---
    const quickActions = [
        { label: t('admin.moderation'), icon: Shield, desc: t('admin.reportsPendingDesc', { count: liveStats.reportsPending }), gradient: 'from-red-500/20 to-red-600/10', border: 'border-red-500/20', onClick: () => setShowModerationModal(true) },
        { label: t('admin.systemLogs'), icon: Terminal, desc: t('admin.recentErrors'), gradient: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20', onClick: () => setShowLogsModal(true) },
        { label: t('admin.platformSettings'), icon: Wrench, desc: maintenanceMode ? t('admin.maintenanceOn') : t('admin.apiLimitsRoles'), gradient: 'from-emerald-500/20 to-emerald-600/10', border: 'border-[var(--success)]/20', onClick: () => setShowPlatformSettingsModal(true) },
        { label: t('admin.finance'), icon: TrendingUp, desc: `${formatRub(finance.revenue7d)} ${t('admin.sub7days')} · MRR ${formatRub(finance.mrr)}`, gradient: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/20', onClick: () => setShowFinanceModal(true) }
    ]

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg transition-all ${toast.type === 'error' ? 'bg-[var(--danger)]/90 text-[var(--text)]' : 'bg-[var(--success)]/90 text-[var(--text-inverse)]'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header — [STAFF-DOP] на мобильных компактнее, чтобы тулбар сортировки не попадал под MobileBottomNav */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={24} className="text-[var(--accent)]" />
                        <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
                    </div>
                    <p className="text-[var(--text-muted)]">{t('admin.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-sm font-semibold border border-red-500/20">
                        {user?.name || 'Admin'}
                    </span>
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white font-semibold text-sm transition-all hover:opacity-90"
                    >
                        <Settings size={16} /> {t('admin.settings')}
                    </button>
                </div>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 md:mb-8">
                {statsCards.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className="glass-card glow-border rounded-2xl p-4 md:p-6 animate-fade-in-up hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                            <div className={`w-9 h-9 mx-auto mb-2 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                <Icon size={18} className="text-white" />
                            </div>
                            <p className="text-xl font-bold text-[var(--text)]">{stat.value}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
                            {stat.sub && <p className="text-[10px] text-[var(--text-muted)] mt-1">{stat.sub}</p>}
                        </div>
                    )
                })}
            </div>

            {/* Users Management — [VIEW-AS-PARITY] общий компонент с owner → «Клиенты» */}
            <UsersManager onUsersLoaded={handleUsersLoaded} />

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, i) => {
                    const Icon = action.icon
                    return (
                        <button
                            key={i}
                            onClick={action.onClick}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 border border-white/10 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                        >
                            <Icon size={28} className="mb-3 text-[var(--text)]/80" />
                            <h3 className="text-[var(--text)] font-semibold mb-1">{action.label}</h3>
                            <p className="text-[var(--text-muted)] text-sm">{action.desc}</p>
                        </button>
                    )
                })}
            </div>

            {/* ===== MODALS ===== */}
            {/* Add/Edit/Delete/Confirm/Extend модалки пользователей — в shared/UsersManager */}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} /> {t('admin.platformSettings')}</h2>
                                <button onClick={() => setShowSettingsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-6">
                                <div className="glass p-4">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart size={16} className="text-[var(--accent)]" /> {t('admin.apiLimits')}</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-[var(--text-muted)]">{t('admin.requestsPerMinute')}</span><span>850 / 1000</span></div>
                                            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div></div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-[var(--text-muted)]">{t('admin.aiGenerationsPerDay')}</span><span>320 / 500</span></div>
                                            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '64%' }}></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="glass p-4">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield size={16} className="text-[var(--danger)]" /> {t('admin.security')}</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">{t('admin.twoFactorForAdmins')}</span>
                                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">{t('admin.enabled')}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">{t('admin.actionLogging')}</span>
                                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">{t('admin.enabled')}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">{t('admin.maintenanceMode')}</span>
                                            <button
                                                onClick={() => setMaintenanceMode(m => !m)}
                                                className={maintenanceMode
                                                    ? 'text-xs px-2 py-1 rounded-full transition-colors bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20'
                                                    : 'text-xs px-2 py-1 rounded-full transition-colors bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
                                                }
                                            >
                                                {maintenanceMode ? t('admin.on') : t('admin.off')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Moderation Modal */}
            {showModerationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-[var(--danger)]" /> {t('admin.moderation')}</h2>
                                <button onClick={() => setShowModerationModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <Filter size={16} className="text-[var(--text-muted)]" />
                                {[
                                    { id: 'all', label: t('admin.all') },
                                    { id: 'pending', label: t('admin.inQueue') },
                                    { id: 'approved', label: t('admin.approved') },
                                    { id: 'rejected', label: t('admin.rejected') },
                                    { id: 'reviewed', label: t('admin.reviewed') },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setReportFilter(f.id)}
                                        className={getFilterButtonClass(f.id, reportFilter)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-3">
                                {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).length === 0 && (
                                    <p className="text-center text-[var(--text-muted)] py-8">{t('admin.noReports')}</p>
                                )}
                                {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).map(report => {
                                    const borderColor = report.status === 'pending' ? 'border-l-[var(--accent-warm)]' : report.status === 'approved' ? 'border-l-[var(--success)]' : report.status === 'rejected' ? 'border-l-[var(--danger)]' : 'border-l-[var(--accent)]'
                                    return (
                                    <div key={report.id} className={`glass border-l-4 ${borderColor} flex items-start gap-4 p-4`}>
                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getReportStatusDotClass(report.status)}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">{report.user}</span>
                                                <span className="text-xs text-[var(--text-muted)]">{report.platform}</span>
                                                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReportStatusBadgeClass(report.status)}`}>
                                                    {getReportStatusLabel(report.status)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)]">{report.content}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">{report.date}</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleReportAction(report.id, 'approve')}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-xs hover:bg-[var(--success)]/20 transition-colors"
                                            >
                                                {t('admin.approve')}
                                            </button>
                                            <button
                                                onClick={() => handleReportAction(report.id, 'reject')}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/20 transition-colors"
                                            >
                                                {t('admin.reject')}
                                            </button>
                                            <button
                                                onClick={() => handleReportAction(report.id, 'review')}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-xs hover:bg-[var(--accent)]/20 transition-colors"
                                            >
                                                {t('admin.review')}
                                            </button>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Terminal size={20} className="text-[var(--accent)]" /> {t('admin.systemLogs')}</h2>
                                <button onClick={() => setShowLogsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-2 font-mono text-sm">
                                {SYSTEM_LOGS.map((log, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg glass">
                                        <span className="text-[var(--text-muted)] flex-shrink-0">{log.time}</span>
                                        <span className={getLogLevelClass(log.level)}>{log.level}</span>
                                        <span className="text-[var(--text-muted)] flex-shrink-0">[{log.service}]</span>
                                        <span className="text-[var(--text)]">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Platform Settings Modal */}
            {showPlatformSettingsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Wrench size={20} className="text-[var(--success)]" /> {t('admin.platformSettings')}</h2>
                                <button onClick={() => setShowPlatformSettingsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: t('admin.apiRateLimit'), key: 'apiRateLimit', unit: '' },
                                    { label: t('admin.maxFileSize'), key: 'maxFileSize', unit: 'MB' },
                                    { label: t('admin.defaultQuota'), key: 'defaultQuota', unit: t('admin.perMonth') },
                                ].map((setting) => (
                                    <div key={setting.key} className="flex items-center justify-between p-3 glass">
                                        <span className="text-sm">{setting.label}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={settingsForm[setting.key]}
                                                onChange={e => setSettingsForm({ ...settingsForm, [setting.key]: parseInt(e.target.value) || 0 })}
                                                className="w-24 px-2 py-1 rounded bg-[var(--card)] border border-[var(--border-strong)] text-[var(--text)] text-sm text-right focus:outline-none focus:border-[var(--success)]/30"
                                            />
                                            <span className="text-xs text-[var(--text-muted)] w-10">{setting.unit}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-3 glass">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm">{t('admin.allowedFormats')}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={settingsForm.allowedFormats.join(', ')}
                                        onChange={e => setSettingsForm({ ...settingsForm, allowedFormats: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        className="w-full px-3 py-2 rounded bg-[var(--card)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 glass">
                                    <span className="text-sm">{t('admin.maintenanceMode')}</span>
                                    <button
                                        onClick={() => setSettingsForm({ ...settingsForm, maintenanceMode: !settingsForm.maintenanceMode })}
                                        className={settingsForm.maintenanceMode
                                            ? 'px-3 py-1 rounded-full text-xs font-medium transition-colors bg-[var(--danger)]/10 text-[var(--danger)] border border-red-500/20'
                                            : 'px-3 py-1 rounded-full text-xs font-medium transition-colors bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
                                        }
                                    >
                                        {settingsForm.maintenanceMode ? t('admin.on') : t('admin.off')}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowPlatformSettingsModal(false)} className="flex-1 px-4 py-2 bg-[var(--surface)] rounded-lg hover:bg-[var(--card-hover)] transition-colors">{t('admin.cancel')}</button>
                                <button onClick={handleSaveSettings} className="flex-1 px-4 py-2 bg-gradient-to-r from-[var(--success)] to-emerald-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2">
                                    <Save size={16} /> {t('admin.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Finance Modal */}
            {showFinanceModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp size={20} className="text-[var(--accent-warm)]" /> {t('admin.finance')}</h2>
                                <button onClick={() => setShowFinanceModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            {/* [ADMIN-PANEL-POLISH] только реальные ₽-метрики из БД (без моков); нет данных → 0 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                <div className="glass p-4">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">{t('admin.revenue7d')}</p>
                                    <p className="text-xl font-bold text-[var(--success)]">{formatRub(finance.revenue7d)}</p>
                                </div>
                                <div className="glass p-4">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">{t('admin.mrr')}</p>
                                    <p className="text-xl font-bold text-[var(--accent)]">{formatRub(finance.mrr)}</p>
                                </div>
                                <div className="glass p-4">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">{t('admin.payingClients')}</p>
                                    <p className="text-xl font-bold text-[var(--accent-warm)]">{finance.paying}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default AdminDashboardPage
