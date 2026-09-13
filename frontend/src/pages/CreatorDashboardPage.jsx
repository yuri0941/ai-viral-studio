import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { UpgradeNudge } from '../components/shared/UpgradeNudge.jsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import AIVideoCreator from '../components/video/AIVideoCreator.jsx'
import SupportTab from './creator/components/SupportTab.jsx'
import { EmptyState } from '../components/common/EmptyState.jsx'
import {
    LayoutDashboard, Video, Eye, Users, Heart, DollarSign,
    Plus, Calendar, BarChart as BarChartIcon, Bot, TrendingUp, Clock,
    Play, Instagram, Youtube, Music2, MessageCircle,
    ChevronRight, Sparkles, Award, Trophy, Flame, Lightbulb,
    Clapperboard, PieChart as PieChartIcon
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['var(--success)', 'var(--accent)', 'var(--primary)', 'var(--accent-warm)', 'var(--danger)']

// [REAL-DATA] Хардкод-серии графиков (VIRALITY_WEEK/MONTH, PLATFORM_DATA) удалены:
// графики строятся только из stats.series / stats.platforms, пришедших из API.
// График без данных не рисуется — показывается честный empty-state.

const PORTFOLIO_WORKS = []

const RECENT_ACTIVITY = []

const AI_TIPS = []

function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

function PlatformIcon({ platform }) {
    switch (platform) {
        case 'youtube': return <Youtube size={16} className="text-[var(--danger)]" />
        case 'tiktok': return <Music2 size={16} className="text-[var(--accent)]" />
        case 'instagram': return <Instagram size={16} className="text-[var(--primary)]" />
        case 'telegram': return <MessageCircle size={16} className="text-[var(--accent)]" />
        default: return <Video size={16} className="text-[var(--text-muted)]" />
    }
}

function StatusBadge({ status }) {
    const { t } = useTranslation()
    const styles = {
        viral: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/20',
        trending: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/20',
        stable: 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border-strong)]'
    }
    const labels = { viral: t('creator.statusViral', 'Вирусный'), trending: t('creator.statusTrending', 'В тренде'), stable: t('creator.statusStable', 'Стабильно') }
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.stable}`}>
            {status === 'viral' && <Flame size={10} className="animate-pulse" />}
            {labels[status] || status}
        </span>
    )
}

// [P16-FIX] added: glass bento stat card with gradient icon
function StatCard({ label, value, sub, icon: Icon, gradient = 'from-[var(--primary)] to-[var(--accent)]' }) {
    return (
        <div className="glass-card glow-border rounded-2xl p-6 animate-fade-in-up hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                    <Icon size={20} className="text-white" />
                </div>
                {sub && <span className="text-xs text-[var(--success)]">{sub}</span>}
            </div>
            <p className="text-3xl font-medium font-mono text-[var(--text)]">{value}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mt-1">{label}</p>
        </div>
    )
}

// [P16-FIX] added: gradient quick action button
function QuickAction({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 border border-white/10 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-white/90" />
                <span>{label}</span>
            </div>
        </button>
    )
}

function CreatorDashboardPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [period, setPeriod] = useState('week')
    // [VALUE-2026-08-04] added: real stats from API, no hardcode
    const [stats, setStats] = useState({ posts: 0, views: 0, subscribers: 0, engagement: 0, income: 0 })
    const [statsLoading, setStatsLoading] = useState(true)
    const [showAIVideoCreator, setShowAIVideoCreator] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('token')
        fetch(`${API_URL}/creator/analytics/overview`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(r => {
                if (r.status === 401) {
                    throw new Error('401 Unauthorized')
                }
                return r.json()
            })
            .then(data => {
                const payload = data?.data || data || {}
                setStats({
                    posts: payload.posts || 0,
                    views: payload.views || 0,
                    subscribers: payload.subscribers || 0,
                    engagement: payload.engagement || 0,
                    income: payload.income || 0,
                    // [REAL-DATA] таймсерии/платформы/стрик — только если API их реально отдал
                    series: payload.series || null,
                    platforms: Array.isArray(payload.platforms) ? payload.platforms : [],
                    streakDays: payload.streakDays || 0,
                })
            })
            .catch(() => setStats({ posts: 0, views: 0, subscribers: 0, engagement: 0, income: 0, series: null, platforms: [], streakDays: 0 }))
            .finally(() => setStatsLoading(false))
    }, [])

    // [REAL-DATA] нет серий из API → пустой массив → график не рисуется
    const chartData = useMemo(() => {
        const s = stats?.series
        if (!s) return []
        const arr = period === 'week' ? s.week : s.month
        return Array.isArray(arr) ? arr : []
    }, [stats, period])

    const platformData = useMemo(() => Array.isArray(stats?.platforms) ? stats.platforms : [], [stats])

    const streakDays = stats?.streakDays || 0
    const streakShown = Math.min(streakDays, 7)

    // [REAL-DATA] ачивки считаются из реальной статистики, а не захардкожены
    const achievements = [
        { id: 'first_step', label: 'First Step', icon: Award, color: 'from-emerald-500 to-emerald-700', desc: t('creator.achOnboarding', 'Завершён онбординг'), unlocked: (stats?.posts || 0) > 0 },
        { id: 'consistency', label: 'Consistency', icon: Flame, color: 'from-orange-500 to-red-500', desc: t('creator.achConsistency', '7 дней публикаций'), unlocked: streakDays >= 7 },
        { id: 'viral_hit', label: 'Viral Hit', icon: TrendingUp, color: 'from-purple-500 to-pink-500', desc: t('creator.achViral', '10K просмотров'), unlocked: (stats?.views || 0) >= 10000 },
    ]

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">
                        {t('creator.greeting', { name: user?.name || 'Creator' })}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        {t('creator.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clock size={14} />
                    <span>{t('creator.lastUpdated', { time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) })}</span>
                </div>
            </div>

            <UpgradeNudge user={user} postsCount={stats?.posts || 0} />

            {/* [VALUE-2026-08-04] added: empty state for new creators */}
            {!statsLoading && (stats?.posts || 0) === 0 && (
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-4">
                        <Plus size={28} className="text-[var(--primary)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text)] mb-2">{t('creator.noPosts')}</h2>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => navigate('/scheduler')}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus size={18} /> {t('creator.createFirstPost')}
                        </button>
                        <button
                            onClick={() => navigate('/creative-hub/chat')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-xl text-[var(--text)] font-medium hover:bg-white/5 transition-colors"
                        >
                            <Bot size={18} /> {t('creator.askOmega')}
                        </button>
                    </div>
                </div>
            )}

            {/* [ONBOARDING-EMPTY-STATE] гейт «только с постами» убран: дашборд всегда доступен,
                empty-state выше — inline-подсказка, а не блокирующий шаг */}

            {/* [P16-FIX] added: content-first hero — next post preview with glass card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-luxury glass-luxury-hover rounded-2xl p-6 md:p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl group-hover:bg-[var(--accent)]/10 transition-colors" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-medium">{t('creator.nextPost')}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{t('creator.recommendedTime', { time: '18:00' })}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[var(--text)] mb-3">{t('creator.nextPostTitle', 'Следующий пост')}</h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-xl mb-6">
                            {t('creator.nextPostHint', 'Создайте пост, и OMEGA подготовит черновик с хуком, структурой и CTA.')}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={() => toast(t('creator.publishing'))} className="magnetic-btn inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity">
                                {t('creator.publish')}
                            </button>
                            <button onClick={() => toast(t('creator.editing'))} className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-full text-[var(--text)] text-sm hover:bg-white/5 transition-colors">
                                {t('creator.edit')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Nudge */}
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-[var(--text)]">{t('creator.omegaTip')}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-4">{t('creator.omegaTipText', { time: '18:00', defaultValue: 'Опубликуйте пост в оптимальное время, чтобы повысить охват.' })}</p>
                    </div>
                    <button onClick={() => toast(t('creator.timeApplied'))} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                        {t('creator.apply')}
                    </button>
                </div>
            </div>

            {/* [P16-FIX] added: bento stats grid with glass cards and gradient icons */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label={t('creator.posts')} value={stats?.posts || 0} icon={Video} gradient="from-emerald-500 to-teal-600" />
                <StatCard label={t('creator.views')} value={formatNumber(stats?.views || 0)} icon={Eye} gradient="from-sky-500 to-blue-600" />
                <StatCard label={t('creator.subscribers')} value={formatNumber(stats?.subscribers || 0)} icon={Users} gradient="from-violet-500 to-fuchsia-600" />
                <StatCard label={t('creator.engagement')} value={`${stats?.engagement || 0}%`} icon={Heart} gradient="from-amber-500 to-orange-600" />
                <StatCard label={t('creator.income')} value={`${stats?.income || 0} ₽`} icon={DollarSign} gradient="from-emerald-500 to-green-600" />
            </div>

            {/* [P16-FIX] added: content pipeline horizontal scroll with glass cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <Calendar size={18} className="text-[var(--primary)]" />
                        {t('creator.contentPipeline')}
                    </h2>
                    <button className="text-xs text-[var(--primary)] hover:underline">{t('creator.allPosts')}</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                    {PORTFOLIO_WORKS.map((work) => (
                        <div key={work.id} className="min-w-[220px] md:min-w-[260px] glass-luxury glass-luxury-hover rounded-2xl p-3 hover:border-violet-500/30 transition-colors cursor-pointer group">
                            <div className="w-full h-32 rounded-xl bg-[var(--surface)] overflow-hidden mb-3 relative">
                                {work.thumbnail ? (
                                    <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                        <Play size={24} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Play size={18} className="text-white" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-[var(--text)] line-clamp-1 mb-1">{work.title}</h3>
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                <span className="capitalize flex items-center gap-1"><PlatformIcon platform={work.platform} /> {work.platform}</span>
                                <span>{work.publishedAt}</span>
                            </div>
                        </div>
                    ))}
                    <button className="min-w-[160px] h-[180px] rounded-2xl border border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--primary)]/30 transition-colors">
                        <Plus size={24} />
                        <span className="text-sm">{t('creator.add')}</span>
                    </button>
                </div>
            </div>

            {/* Achievement Widget — [REAL-DATA] статус открытия из реальной статистики */}
            <div className="glass-luxury glass-luxury-hover rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-[var(--accent-warm)]" />
                    <h3 className="font-semibold text-[var(--text)]">{t('creator.achievements')}</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                    {achievements.map(a => {
                        const Icon = a.icon
                        return (
                            <div
                                key={a.id}
                                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-105 ${
                                    a.unlocked
                                        ? 'bg-[var(--surface)] border-[var(--border-strong)]'
                                        : 'bg-[var(--surface)] border-[var(--border)] opacity-50'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-[var(--text)]">{a.label}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{a.desc}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Streak Counter — [REAL-DATA] дни из API (stats.streakDays), без хардкода 7/7 */}
            <div className="glass-luxury glass-luxury-hover rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <h3 className="font-semibold text-[var(--text)]">{t('creator.streak', { days: streakShown })}</h3>
                    </div>
                    <span className="text-xs text-[var(--success)] font-medium">{t('creator.streakProgress', { current: streakShown, total: 7 })}</span>
                </div>
                <div className="flex gap-1 mb-3">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-full ${i < streakShown ? 'bg-[var(--success)]' : 'bg-[var(--surface)]'}`} />
                    ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{t('creator.streakMotivation')}</p>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                    <LayoutDashboard size={18} className="text-[var(--success)]" />
                    {t('creator.quickActions')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <QuickAction icon={Plus} label={t('creator.createPost')} color="from-emerald-500 to-emerald-700" onClick={() => navigate('/scheduler')} />
                    <QuickAction icon={Clapperboard} label={t('creator.aiVideo', 'AI Video')} color="from-violet-500 to-cyan-600" onClick={() => setShowAIVideoCreator(true)} />
                    <QuickAction icon={Calendar} label={t('creator.schedule')} color="from-blue-500 to-blue-700" onClick={() => navigate('/scheduler')} />
                    <QuickAction icon={BarChartIcon} label={t('creator.competitorAnalysis')} color="from-purple-500 to-pink-600" onClick={() => navigate('/analyzer')} />
                    <QuickAction icon={Bot} label={t('creator.aiChat')} color="from-amber-500 to-orange-600" onClick={() => navigate('/creative-hub/chat')} />
                    {/* [P20] added: leaderboard quick action */}
                    <QuickAction icon={Trophy} label="Leaderboard" color="from-yellow-500 to-orange-600" onClick={() => window.location.href = '/leaderboard'} />
                    {/* [P20] added: challenge quick action */}
                    <QuickAction icon={Award} label="Challenge" color="from-pink-500 to-rose-600" onClick={() => window.location.href = '/challenge'} />
                </div>
            </div>

            {/* Charts — [REAL-DATA] рисуются только при реальных сериях из API */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Virality chart */}
                <div className="lg:col-span-2 glass-luxury glass-luxury-hover rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[var(--success)]" />
                            {t('creator.virality')}
                        </h2>
                        <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
                            {['week', 'month'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-2.5 min-h-[44px] text-xs rounded-md transition-colors ${
                                        period === p
                                            ? 'bg-[var(--success)]/20 text-[var(--success)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                    }`}
                                >
                                    {p === 'week' ? t('creator.week') : t('creator.month')}
                                </button>
                            ))}
                        </div>
                    </div>
                    {chartData.length === 0 ? (
                        <EmptyState
                            icon={TrendingUp}
                            title="Нет данных для графика"
                            description="График виральности строится по реальным просмотрам ваших постов. Опубликуйте контент и подключите соцсети."
                            compact
                        />
                    ) : (
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                    <RechartsTooltip
                                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '12px' }}
                                        itemStyle={{ color: 'var(--text)' }}
                                    />
                                    <Area type="monotone" dataKey="views" stroke="var(--success)" strokeWidth={2} fill="url(#viewsGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Platform distribution — [REAL-DATA] только реальные платформы из API */}
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <PieChartIcon size={18} className="text-[var(--primary)]" />
                        {t('creator.platformDistribution')}
                    </h2>
                    {platformData.length === 0 ? (
                        <EmptyState
                            icon={PieChartIcon}
                            title="Нет данных по платформам"
                            description="Распределение появится после первых публикаций с привязанной платформой."
                            compact
                        />
                    ) : (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={platformData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {platformData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-2">
                                {platformData.map((p, i) => (
                                    <div key={p.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                            <span className="text-[var(--text)]">{p.name}</span>
                                        </div>
                                        <span className="text-[var(--text)] font-medium">{p.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Portfolio + Monetization */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* [P16-FIX] added: masonry portfolio with hover-zoom */}
                <div className="xl:col-span-2 glass-luxury glass-luxury-hover rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                            <Award size={18} className="text-[var(--accent-warm)]" />
                            {t('creator.portfolio')}
                        </h2>
                        <button className="text-xs text-[var(--success)] hover:text-[var(--success)]/80 flex items-center gap-1">
                            {t('creator.allWorks')} <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                        {PORTFOLIO_WORKS.map(work => (
                            <div key={work.id} className="break-inside-avoid luxury-card overflow-hidden group cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                                <div className="w-full h-40 bg-[var(--surface)] overflow-hidden relative">
                                    {work.thumbnail ? (
                                        <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                            <Play size={28} />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <StatusBadge status={work.status} />
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-medium text-[var(--text)] truncate mb-1">{work.title}</h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <PlatformIcon platform={work.platform} />
                                        <span className="text-xs text-[var(--text-muted)] capitalize">{work.platform}</span>
                                        <span className="text-xs text-[var(--text-muted)]">{work.publishedAt}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1"><Eye size={12} /> {formatNumber(work.views)}</span>
                                        <span className="flex items-center gap-1"><Heart size={12} /> {formatNumber(work.likes)}</span>
                                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatNumber(work.comments)}</span>
                                        <span className="flex items-center gap-1 text-[var(--success)]"><TrendingUp size={12} /> {work.engagement}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monetization — [REAL-DATA] сумма фактом в ₽; выдуманная раскладка по источникам удалена */}
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-[var(--success)]" />
                        {t('creator.monetization')}
                    </h2>
                    <div className="mb-5">
                        <p className="text-3xl font-bold text-[var(--text)]">{(stats?.income || 0).toLocaleString('ru-RU')} ₽</p>
                        <p className="text-sm text-[var(--text-muted)]">{t('creator.income30Days')}</p>
                    </div>
                    {(stats?.income || 0) === 0 && (
                        <p className="text-xs text-[var(--text-muted)] mb-4">Дохода за период нет. Разбивка по источникам появится, когда будут реальные выплаты.</p>
                    )}
                    <div className="mt-5 p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10">
                        <p className="text-xs text-[var(--success)]">{t('creator.monetizationTip')}</p>
                    </div>
                </div>
            </div>

            {/* Support */}
            <div className="mt-6">
                <SupportTab />
            </div>

            {/* Activity + AI Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t('creator.recentActivity')}</h2>
                    <div className="space-y-4">
                        {RECENT_ACTIVITY.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shrink-0">
                                    <item.icon size={14} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[var(--text)] text-sm">{item.text}</p>
                                    <p className="text-[var(--text-muted)] text-xs mt-0.5">{item.time}</p>
                                </div>
                            </div>
                        ))}
                        {RECENT_ACTIVITY.length === 0 && (
                            <p className="text-sm text-[var(--text-muted)]">Активности пока нет — опубликуйте первый пост.</p>
                        )}
                    </div>
                </div>

                <div className="glass-luxury glass-luxury-hover rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Sparkles size={18} className="text-[var(--accent-warm)]" />
                        {t('creator.aiTips')}
                    </h2>
                    <div className="space-y-3">
                        {AI_TIPS.map((tip, i) => (
                            <div key={i} className="p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10">
                                <p className="text-[var(--text)] text-sm">{tip}</p>
                            </div>
                        ))}
                        {AI_TIPS.length === 0 && (
                            <p className="text-sm text-[var(--text-muted)]">Персональные советы появятся после первых публикаций.</p>
                        )}
                    </div>
                </div>
            </div>

            {showAIVideoCreator && <AIVideoCreator onClose={() => setShowAIVideoCreator(false)} />}
        </div>
    )
}

export default CreatorDashboardPage
