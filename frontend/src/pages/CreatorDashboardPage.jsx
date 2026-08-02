import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
    LayoutDashboard, Video, Eye, Users, Heart, DollarSign,
    Plus, Calendar, BarChart as BarChartIcon, Bot, TrendingUp, Clock,
    Play, Instagram, Youtube, Music2, MessageCircle,
    ChevronRight, Sparkles, Award, Sunrise, Trophy, Flame, Lightbulb
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['var(--success)', 'var(--accent)', 'var(--primary)', 'var(--accent-warm)', 'var(--danger)']

const VIRALITY_WEEK = [
    { day: 'Пн', views: 12400, engagement: 4.2 },
    { day: 'Вт', views: 18200, engagement: 5.1 },
    { day: 'Ср', views: 15600, engagement: 4.8 },
    { day: 'Чт', views: 24100, engagement: 6.3 },
    { day: 'Пт', views: 38900, engagement: 7.8 },
    { day: 'Сб', views: 45200, engagement: 8.4 },
    { day: 'Вс', views: 32100, engagement: 6.9 },
]

const VIRALITY_MONTH = [
    { day: 'Нед 1', views: 98000, engagement: 5.4 },
    { day: 'Нед 2', views: 134000, engagement: 6.1 },
    { day: 'Нед 3', views: 187000, engagement: 7.2 },
    { day: 'Нед 4', views: 223000, engagement: 8.0 },
]

const PLATFORM_DATA = [
    { name: 'TikTok', value: 45 },
    { name: 'YouTube Shorts', value: 30 },
    { name: 'Instagram Reels', value: 20 },
    { name: 'Telegram', value: 5 },
]

const PORTFOLIO_WORKS = [
    {
        id: 1,
        title: '5 ошибок в монтаже Shorts',
        platform: 'youtube',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
        views: 45200,
        likes: 3200,
        comments: 180,
        engagement: 8.4,
        status: 'viral',
        publishedAt: '2026-07-27'
    },
    {
        id: 2,
        title: 'POV: твой первый вирусный ролик',
        platform: 'tiktok',
        thumbnail: null,
        views: 28900,
        likes: 4100,
        comments: 220,
        engagement: 7.1,
        status: 'trending',
        publishedAt: '2026-07-25'
    },
    {
        id: 3,
        title: 'Как я набрал 10K за месяц',
        platform: 'instagram',
        thumbnail: null,
        views: 15600,
        likes: 1900,
        comments: 95,
        engagement: 5.8,
        status: 'stable',
        publishedAt: '2026-07-22'
    },
    {
        id: 4,
        title: '3 хука, которые всегда работают',
        platform: 'telegram',
        thumbnail: null,
        views: 8700,
        likes: 640,
        comments: 42,
        engagement: 4.9,
        status: 'stable',
        publishedAt: '2026-07-20'
    },
]

const RECENT_ACTIVITY = [
    { type: 'post', text: 'Опубликован пост "5 ошибок в монтаже Shorts"', time: '2 часа назад', icon: Video },
    { type: 'ai', text: 'AI сгенерировал 3 идеи для следующей недели', time: '5 часов назад', icon: Sparkles },
    { type: 'view', text: '+12,400 просмотров за сегодня', time: 'Сегодня', icon: Eye },
    { type: 'follower', text: '+156 новых подписчиков', time: 'Вчера', icon: Users },
]

const AI_TIPS = [
    'Создай shorts на тему трендового хэштега #viral2026',
    'Лучшее время для публикации: сегодня 19:00',
    'Твоя аудитория активна в TikTok больше, чем в Instagram на 34%',
    'Попробуй формат "3 мифа о [твоей нише]" — он даёт +22% удержание'
]

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
    const styles = {
        viral: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/20',
        trending: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/20',
        stable: 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border-strong)]'
    }
    const labels = { viral: 'Вирусный', trending: 'В тренде', stable: 'Стабильно' }
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.stable}`}>
            {status === 'viral' && <Flame size={10} className="animate-pulse" />}
            {labels[status] || status}
        </span>
    )
}

function StatCard({ label, value, sub, icon: Icon, iconBg = 'bg-[var(--primary-soft)]', iconColor = 'text-[var(--primary)]' }) {
    return (
        <div className="glass-card p-5 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                    <Icon size={20} className={iconColor} />
                </div>
                {sub && <span className="text-xs text-[var(--success)]">{sub}</span>}
            </div>
            <p className="text-3xl font-medium font-mono text-[var(--text)]">{value}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mt-1">{label}</p>
        </div>
    )
}

function QuickAction({ icon: Icon, label, color, onClick }) {
    return (
        <button
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[var(--border)] text-left hover:border-[var(--border-strong)] transition-all hover:-translate-y-0.5"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10 group-hover:opacity-15 transition-opacity`} />
            <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} mb-3`}>
                    <Icon size={20} className="text-[var(--text)]" />
                </div>
                <p className="text-[var(--text)] font-medium text-sm">{label}</p>
            </div>
        </button>
    )
}

function CreatorDashboardPage() {
    const { user } = useAuth()
    const [period, setPeriod] = useState('week')
    const [stats, setStats] = useState({
        posts: 24,
        views: 154200,
        followers: 12800,
        engagement: 6.4,
        income: 1240
    })

    useEffect(() => {
        // TODO: load real creator stats from /api/creator/overview
        setStats({
            posts: 24,
            views: 154200,
            followers: 12800,
            engagement: 6.4,
            income: 1240
        })
    }, [])

    const chartData = useMemo(() => period === 'week' ? VIRALITY_WEEK : VIRALITY_MONTH, [period])

    const incomeSources = [
        { label: 'AdSense / Creator Fund', value: stats.income * 0.45, color: 'bg-[var(--success)]' },
        { label: 'Спонсорские интеграции', value: stats.income * 0.35, color: 'bg-[var(--accent)]' },
        { label: 'Свои продукты', value: stats.income * 0.15, color: 'bg-[var(--primary)]' },
        { label: 'Донаты / Подписки', value: stats.income * 0.05, color: 'bg-[var(--accent-warm)]' },
    ]

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">
                        Привет, {user?.name || 'Creator'}! 👋
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Твой личный кабинет создателя контента
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clock size={14} />
                    <span>Последнее обновление: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* [P16-CONTINUE] added: content-first hero — next post preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card-strong p-6 md:p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl group-hover:bg-[var(--accent)]/10 transition-colors" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-medium">Следующий пост</span>
                            <span className="text-[10px] text-[var(--text-muted)]">Рекомендуемое время: 18:00</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[var(--text)] mb-3">3 мифа о вашей нише, которые убивают рост</h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-xl mb-6">
                            OMEGA подготовила черновик с хуком, структурой и CTA. Проверьте, отредактируйте и опубликуйте в один клик.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={() => alert('Публикация...')} className="magnetic-btn inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--text)] text-[var(--text-inverse)] font-medium hover:scale-105 transition-transform">
                                Опубликовать
                            </button>
                            <button onClick={() => alert('Редактирование...')} className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass-card text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors">
                                Редактировать
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Nudge */}
                <div className="glass-card p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-[var(--accent-warm)]/10 flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-[var(--accent-warm)]" />
                            </div>
                            <span className="text-sm font-medium text-[var(--text)]">💡 OMEGA советует</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-4">Опубликуйте в 18:00 — активность аудитории на 24% выше.</p>
                    </div>
                    <button onClick={() => alert('Время применено')} className="w-full py-2.5 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] text-sm font-medium hover:opacity-90 transition-opacity">
                        Применить
                    </button>
                </div>
            </div>

            {/* [P16-CONTINUE] added: content pipeline horizontal scroll */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <Calendar size={18} className="text-[var(--primary)]" />
                        Content Pipeline
                    </h2>
                    <button className="text-xs text-[var(--primary)] hover:underline">Все посты</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                    {PORTFOLIO_WORKS.map((work, i) => (
                        <div key={work.id} className="min-w-[220px] md:min-w-[260px] glass-card p-3 hover:border-[var(--primary)]/30 transition-colors cursor-pointer group">
                            <div className="w-full h-32 rounded-xl bg-[var(--surface)] overflow-hidden mb-3 relative">
                                {work.thumbnail ? (
                                    <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" />
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
                        <span className="text-sm">Добавить</span>
                    </button>
                </div>
            </div>

            {/* Achievement Widget */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-[var(--accent-warm)]" />
                    <h3 className="font-semibold text-[var(--text)]">Достижения</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                    {[
                        { id: 'first_step', label: 'First Step', icon: Award, color: 'from-[var(--success)] to-[var(--success)]/70', desc: 'Завершён онбординг' },
                        { id: 'consistency', label: 'Consistency', icon: Flame, color: 'from-orange-500 to-red-500', desc: '7 дней публикаций' },
                        { id: 'viral_hit', label: 'Viral Hit', icon: TrendingUp, color: 'from-purple-500 to-pink-500', desc: '10K просмотров' },
                    ].map(a => {
                        const Icon = a.icon
                        const unlocked = a.id !== 'viral_hit'
                        return (
                            <div
                                key={a.id}
                                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-105 ${
                                    unlocked
                                        ? 'bg-gradient-to-br from-[var(--surface)] to-[var(--bg-secondary)] border-[var(--border-strong)]'
                                        : 'bg-[var(--surface)] border-[var(--border)] opacity-50'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg`}>
                                    <Icon className="w-5 h-5 text-[var(--text)]" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-[var(--text)]">{a.label}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{a.desc}</div>
                                </div>
                                {unlocked && (
                                    <div className="absolute inset-0 rounded-xl border border-[var(--border-strong)] pointer-events-none group-hover:border-[var(--primary)]/30 transition-colors" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Streak Counter */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <h3 className="font-semibold text-[var(--text)]">🔥 Вы публикуете 7 дней подряд!</h3>
                    </div>
                    <span className="text-xs text-[var(--success)] font-medium">7 / 7</span>
                </div>
                <div className="flex gap-1 mb-3">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-2 flex-1 rounded-full bg-[var(--success)]" />
                    ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Так держать! Завтра откроется бейдж Consistency.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label="Постов" value={stats.posts} sub="+3 за неделю" icon={Video} iconBg="bg-[var(--success)]/10" iconColor="text-[var(--success)]" />
                <StatCard label="Просмотров" value={formatNumber(stats.views)} sub="+18%" icon={Eye} iconBg="bg-[var(--accent)]/10" iconColor="text-[var(--accent)]" />
                <StatCard label="Подписчиков" value={formatNumber(stats.followers)} sub="+156" icon={Users} iconBg="bg-[var(--primary)]/10" iconColor="text-[var(--primary)]" />
                <StatCard label="Вовлечённость" value={`${stats.engagement}%`} sub="+0.8%" icon={Heart} iconBg="bg-[var(--accent-warm)]/10" iconColor="text-[var(--accent-warm)]" />
                <StatCard label="Доход ( est. )" value={`$${stats.income}`} sub="~$42/день" icon={DollarSign} iconBg="bg-[var(--success)]/10" iconColor="text-[var(--success)]" />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                    <LayoutDashboard size={18} className="text-[var(--success)]" />
                    Быстрые действия
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickAction icon={Plus} label="Создать пост" color="from-emerald-500 to-emerald-700" onClick={() => {}} />
                    <QuickAction icon={Calendar} label="Запланировать" color="from-blue-500 to-blue-700" onClick={() => {}} />
                    <QuickAction icon={BarChartIcon} label="Анализ конкурента" color="from-purple-500 to-purple-700" onClick={() => {}} />
                    <QuickAction icon={Bot} label="AI Chat" color="from-amber-500 to-amber-700" onClick={() => {}} />
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Virality chart */}
                <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[var(--success)]" />
                            Вирусность
                        </h2>
                        <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
                            {['week', 'month'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                        period === p
                                            ? 'bg-[var(--success)]/20 text-[var(--success)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                    }`}
                                >
                                    {p === 'week' ? 'Неделя' : 'Месяц'}
                                </button>
                            ))}
                        </div>
                    </div>
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
                </div>

                {/* Platform distribution */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <PieChart size={18} className="text-[var(--primary)]" />
                        Распределение по площадкам
                    </h2>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={PLATFORM_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {PLATFORM_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                        {PLATFORM_DATA.map((p, i) => (
                            <div key={p.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                    <span className="text-[var(--text)]">{p.name}</span>
                                </div>
                                <span className="text-[var(--text)] font-medium">{p.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Portfolio + Monetization */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Portfolio */}
                <div className="xl:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                            <Award size={18} className="text-[var(--accent-warm)]" />
                            Портфолио работ
                        </h2>
                        <button className="text-xs text-[var(--success)] hover:text-[var(--success)]/80 flex items-center gap-1">
                            Все работы <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {PORTFOLIO_WORKS.map(work => (
                            <div key={work.id} className="flex gap-4 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors">
                                <div className="w-24 h-16 rounded-lg bg-black/30 flex items-center justify-center shrink-0 overflow-hidden">
                                    {work.thumbnail ? (
                                        <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                            <Play size={16} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-medium text-[var(--text)] truncate">{work.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <PlatformIcon platform={work.platform} />
                                                <span className="text-xs text-[var(--text-muted)] capitalize">{work.platform}</span>
                                                <StatusBadge status={work.status} />
                                            </div>
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{work.publishedAt}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
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

                {/* Monetization */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-[var(--success)]" />
                        Монетизация
                    </h2>
                    <div className="mb-5">
                        <p className="text-3xl font-bold text-[var(--text)]">${stats.income}</p>
                        <p className="text-sm text-[var(--text-muted)]">Приблизительный доход за 30 дней</p>
                    </div>
                    <div className="space-y-4">
                        {incomeSources.map(source => (
                            <div key={source.label}>
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="text-[var(--text-muted)]">{source.label}</span>
                                    <span className="text-[var(--text)]">${Math.round(source.value)}</span>
                                </div>
                                <div className="h-2 w-full bg-[var(--surface)] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${source.color} rounded-full`}
                                        style={{ width: `${(source.value / stats.income) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10">
                        <p className="text-xs text-[var(--success)]">
                            💡 Совет: при росте до $2K/мес добавьте цифровой продукт — это увеличит маржу на 30-40%.
                        </p>
                    </div>
                </div>
            </div>

            {/* Activity + AI Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Последняя активность</h2>
                    <div className="space-y-4">
                        {RECENT_ACTIVITY.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center shrink-0">
                                    <item.icon size={14} className="text-[var(--success)]" />
                                </div>
                                <div>
                                    <p className="text-[var(--text)] text-sm">{item.text}</p>
                                    <p className="text-[var(--text-muted)] text-xs mt-0.5">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Sparkles size={18} className="text-[var(--accent-warm)]" />
                        AI Рекомендации
                    </h2>
                    <div className="space-y-3">
                        {AI_TIPS.map((tip, i) => (
                            <div key={i} className="p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10">
                                <p className="text-[var(--text)] text-sm">{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreatorDashboardPage
