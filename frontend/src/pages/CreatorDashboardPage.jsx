import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
    LayoutDashboard, Video, Eye, Users, Heart, DollarSign,
    Plus, Calendar, BarChart as BarChartIcon, Bot, TrendingUp, Clock,
    Play, Instagram, Youtube, Music2, MessageCircle,
    ChevronRight, Sparkles, Award
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#00ff41', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444']

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
        case 'youtube': return <Youtube size={16} className="text-red-500" />
        case 'tiktok': return <Music2 size={16} className="text-cyan-400" />
        case 'instagram': return <Instagram size={16} className="text-pink-500" />
        case 'telegram': return <MessageCircle size={16} className="text-sky-400" />
        default: return <Video size={16} className="text-gray-400" />
    }
}

function StatusBadge({ status }) {
    const styles = {
        viral: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        trending: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        stable: 'bg-white/5 text-gray-400 border-white/10'
    }
    const labels = { viral: 'Вирусный', trending: 'В тренде', stable: 'Стабильно' }
    return (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.stable}`}>
            {labels[status] || status}
        </span>
    )
}

function StatCard({ label, value, sub, icon: Icon, color }) {
    return (
        <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-${color}-500/10`}>
                    <Icon size={20} className={`text-${color}-400`} />
                </div>
                {sub && <span className="text-xs text-emerald-400">{sub}</span>}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
    )
}

function QuickAction({ icon: Icon, label, color, onClick }) {
    return (
        <button
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl p-5 bg-[#0f0f1a] border border-white/5 text-left hover:border-white/15 transition-all hover:-translate-y-0.5"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10 group-hover:opacity-15 transition-opacity`} />
            <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} mb-3`}>
                    <Icon size={20} className="text-white" />
                </div>
                <p className="text-white font-medium text-sm">{label}</p>
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
        { label: 'AdSense / Creator Fund', value: stats.income * 0.45, color: 'bg-emerald-500' },
        { label: 'Спонсорские интеграции', value: stats.income * 0.35, color: 'bg-blue-500' },
        { label: 'Свои продукты', value: stats.income * 0.15, color: 'bg-purple-500' },
        { label: 'Донаты / Подписки', value: stats.income * 0.05, color: 'bg-amber-500' },
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Привет, {user?.name || 'Creator'}! 👋
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Твой личный кабинет создателя контента
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={14} />
                    <span>Последнее обновление: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label="Постов" value={stats.posts} sub="+3 за неделю" icon={Video} color="emerald" />
                <StatCard label="Просмотров" value={formatNumber(stats.views)} sub="+18%" icon={Eye} color="blue" />
                <StatCard label="Подписчиков" value={formatNumber(stats.followers)} sub="+156" icon={Users} color="purple" />
                <StatCard label="Вовлечённость" value={`${stats.engagement}%`} sub="+0.8%" icon={Heart} color="amber" />
                <StatCard label="Доход ( est. )" value={`$${stats.income}`} sub="~$42/день" icon={DollarSign} color="emerald" />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <LayoutDashboard size={18} className="text-emerald-400" />
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
                <div className="lg:col-span-2 bg-[#0f0f1a] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-400" />
                            Вирусность
                        </h2>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                            {['week', 'month'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                        period === p
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'text-gray-400 hover:text-white'
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
                                        <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#00ff41" strokeWidth={2} fill="url(#viewsGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Platform distribution */}
                <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <PieChart size={18} className="text-purple-400" />
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
                                <RechartsTooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                        {PLATFORM_DATA.map((p, i) => (
                            <div key={p.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                    <span className="text-gray-300">{p.name}</span>
                                </div>
                                <span className="text-white font-medium">{p.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Portfolio + Monetization */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Portfolio */}
                <div className="xl:col-span-2 bg-[#0f0f1a] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Award size={18} className="text-amber-400" />
                            Портфолио работ
                        </h2>
                        <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                            Все работы <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {PORTFOLIO_WORKS.map(work => (
                            <div key={work.id} className="flex gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                                <div className="w-24 h-16 rounded-lg bg-black/30 flex items-center justify-center shrink-0 overflow-hidden">
                                    {work.thumbnail ? (
                                        <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-600">
                                            <Play size={16} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-medium text-white truncate">{work.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <PlatformIcon platform={work.platform} />
                                                <span className="text-xs text-gray-500 capitalize">{work.platform}</span>
                                                <StatusBadge status={work.status} />
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{work.publishedAt}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Eye size={12} /> {formatNumber(work.views)}</span>
                                        <span className="flex items-center gap-1"><Heart size={12} /> {formatNumber(work.likes)}</span>
                                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatNumber(work.comments)}</span>
                                        <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={12} /> {work.engagement}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monetization */}
                <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-emerald-400" />
                        Монетизация
                    </h2>
                    <div className="mb-5">
                        <p className="text-3xl font-bold text-white">${stats.income}</p>
                        <p className="text-sm text-gray-500">Приблизительный доход за 30 дней</p>
                    </div>
                    <div className="space-y-4">
                        {incomeSources.map(source => (
                            <div key={source.label}>
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="text-gray-400">{source.label}</span>
                                    <span className="text-white">${Math.round(source.value)}</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${source.color} rounded-full`}
                                        style={{ width: `${(source.value / stats.income) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-xs text-emerald-400">
                            💡 Совет: при росте до $2K/мес добавьте цифровой продукт — это увеличит маржу на 30-40%.
                        </p>
                    </div>
                </div>
            </div>

            {/* Activity + AI Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-white mb-4">Последняя активность</h2>
                    <div className="space-y-4">
                        {RECENT_ACTIVITY.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                    <item.icon size={14} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-gray-300 text-sm">{item.text}</p>
                                    <p className="text-gray-500 text-xs mt-0.5">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-400" />
                        AI Рекомендации
                    </h2>
                    <div className="space-y-3">
                        {AI_TIPS.map((tip, i) => (
                            <div key={i} className="p-3 rounded-xl bg-[#00ff41]/5 border border-[#00ff41]/10">
                                <p className="text-gray-300 text-sm">{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreatorDashboardPage
