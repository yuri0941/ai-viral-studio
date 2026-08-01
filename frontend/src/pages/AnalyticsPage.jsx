import { useMemo, useState } from 'react'
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
    TrendingUp, Eye, Heart, MessageCircle, Share2, Download,
    Calendar, ArrowUpRight, ArrowDownRight, Filter, ChevronDown,
    Play, Clock, Users, Target, Zap, BarChart as BarChartIcon, Globe, Award
} from 'lucide-react'
import { useSmartData } from '../hooks/useSmartData'
import { API_BASE_URL } from '../config.js'
import { ChannelAnalyticsTab } from '../components/analytics/ChannelAnalyticsTab'
import { AudienceInsightsTab } from '../components/analytics/AudienceInsightsTab'
import { CaseStudyGenerator } from '../components/analytics/CaseStudyGenerator'
import { ReportGenerator } from '../components/analytics/ReportGenerator'

const TABS = [
    { id: 'overview', label: 'Обзор' },
    { id: 'channels', label: 'По платформам' },
    { id: 'audience', label: 'Аудитория' },
    { id: 'reports', label: 'Отчёты' },
    { id: 'cases', label: 'Кейсы' },
]

const DEMO_STATS = { views: 0, ctr: 0, subscribers: 0, engagement: 0, reach: 0, clicks: 0, shares: 0 }

function AnalyticsPage() {
    const [period, setPeriod] = useState('7d')
    const [activeTab, setActiveTab] = useState('overview')
    const [showExportMenu, setShowExportMenu] = useState(false)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const { data: stats, isDemo } = useSmartData(`${API_BASE_URL}/analytics/overview`, DEMO_STATS, token)

    // Данные по периодам
    const dataByPeriod = {
        '7d': [
            { name: 'Пн', views: 12000, likes: 3400, comments: 890, shares: 450, followers: 120 },
            { name: 'Вт', views: 15000, likes: 4200, comments: 1100, shares: 580, followers: 145 },
            { name: 'Ср', views: 18000, likes: 5100, comments: 1350, shares: 720, followers: 180 },
            { name: 'Чт', views: 14000, likes: 3900, comments: 980, shares: 510, followers: 95 },
            { name: 'Пт', views: 22000, likes: 6300, comments: 1700, shares: 890, followers: 210 },
            { name: 'Сб', views: 28000, likes: 8100, comments: 2200, shares: 1150, followers: 340 },
            { name: 'Вс', views: 35000, likes: 10200, comments: 2800, shares: 1450, followers: 450 },
        ],
        '30d': [
            { name: 'Нед 1', views: 89000, likes: 25400, comments: 6800, shares: 3400, followers: 2100 },
            { name: 'Нед 2', views: 112000, likes: 32100, comments: 8500, shares: 4200, followers: 2800 },
            { name: 'Нед 3', views: 98000, likes: 27800, comments: 7200, shares: 3800, followers: 1900 },
            { name: 'Нед 4', views: 134000, likes: 38700, comments: 10200, shares: 5100, followers: 3200 },
        ],
        '90d': [
            { name: 'Мес 1', views: 340000, likes: 98000, comments: 26000, shares: 13000, followers: 8500 },
            { name: 'Мес 2', views: 420000, likes: 121000, comments: 32000, shares: 16500, followers: 11200 },
            { name: 'Мес 3', views: 510000, likes: 148000, comments: 39000, shares: 19800, followers: 15600 },
        ]
    }

    const currentData = dataByPeriod[period]

    // Данные для Pie chart (платформы)
    const platformData = [
        { name: 'TikTok', value: 45, color: '#10b981' },
        { name: 'Instagram', value: 25, color: '#3b82f6' },
        { name: 'YouTube', value: 20, color: '#f59e0b' },
        { name: 'Twitter', value: 10, color: '#8b5cf6' },
    ]

    // Данные для Pie chart (типы контента)
    const contentTypeData = [
        { name: 'Видео', value: 55, color: '#10b981' },
        { name: 'Reels/Shorts', value: 30, color: '#3b82f6' },
        { name: 'Фото', value: 10, color: '#f59e0b' },
        { name: 'Текст', value: 5, color: '#8b5cf6' },
    ]

    // Топ видео
    const topVideos = [
        { title: 'Топ 5 лайфхаков для TikTok', platform: 'TikTok', views: '1.2M', likes: '45K', ctr: '12.5%', trend: 'up' },
        { title: 'Как я заработал $10K за месяц', platform: 'YouTube', views: '890K', likes: '32K', ctr: '10.2%', trend: 'up' },
        { title: 'Мотивация понедельника', platform: 'Instagram', views: '650K', likes: '28K', ctr: '9.8%', trend: 'down' },
        { title: 'POV: Ты в 2026 году', platform: 'TikTok', views: '520K', likes: '22K', ctr: '8.7%', trend: 'up' },
        { title: '3 ошибки начинающих блогеров', platform: 'YouTube', views: '410K', likes: '18K', ctr: '7.9%', trend: 'up' },
    ]

    // Аудитория по времени
    const audienceTimeData = [
        { time: '06:00', online: 1200 },
        { time: '09:00', online: 4500 },
        { time: '12:00', online: 6800 },
        { time: '15:00', online: 8200 },
        { time: '18:00', online: 12000 },
        { time: '21:00', online: 15000 },
        { time: '00:00', online: 8900 },
    ]

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    const metrics = useMemo(() => [
        { label: 'Всего просмотров', value: formatNumber(stats?.views ?? 0), change: '+23%', positive: true, icon: Eye },
        { label: 'Средний CTR', value: `${stats?.ctr ?? 0}%`, change: '+1.2%', positive: true, icon: Target },
        { label: 'Время просмотра', value: '4:32', change: '+18%', positive: true, icon: Clock },
        { label: 'Подписчики', value: formatNumber(stats?.subscribers ?? 0), change: '+324', positive: true, icon: Users },
    ], [stats])

    const extraMetrics = useMemo(() => [
        { label: 'Вовлечённость', value: `${stats?.engagement ?? 0}%`, change: '+0.5%', positive: true, icon: Heart },
        { label: 'Охват', value: formatNumber(stats?.reach ?? 0), change: '+15%', positive: true, icon: Globe },
        { label: 'Сохранения', value: formatNumber(stats?.clicks ?? 0), change: '+32%', positive: true, icon: Award },
        { label: 'Репосты', value: formatNumber(stats?.shares ?? 0), change: '+8%', positive: true, icon: Share2 },
    ], [stats])

    const handleExport = (format) => {
        setShowExportMenu(false)
        // Мок экспорта
        alert(`Экспорт в ${format.toUpperCase()} запущен!`)
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Аналитика</h1>
                        <p className="text-gray-400">Отслеживай рост и эффективность контента</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Экспорт */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a24] border border-white/10 rounded-xl text-sm hover:border-emerald-500/30 transition-colors"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Экспорт</span>
                                <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a24] rounded-xl border border-white/10 shadow-xl z-50">
                                    {['PDF', 'Excel', 'CSV', 'PNG'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => handleExport(fmt)}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Период */}
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/30"
                        >
                            <option value="7d">Последние 7 дней</option>
                            <option value="30d">Последние 30 дней</option>
                            <option value="90d">Последние 90 дней</option>
                        </select>
                    </div>
                </div>

                {isDemo && (
                    <div className="bg-yellow-900/30 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-4">
                        📈 Пример аналитики — начните публикацию, чтобы увидеть свои данные
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                activeTab === t.id
                                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <>

                {/* Main Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {metrics.map((metric, i) => {
                        const MetricIcon = metric.icon
                        return (
                            <div key={i} className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <MetricIcon size={18} className="text-emerald-400" />
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${metric.positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {metric.positive ? <ArrowUpRight size={12} className="inline" /> : <ArrowDownRight size={12} className="inline" />}
                                        {metric.change}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                                <span className="text-2xl font-black">{metric.value}</span>
                            </div>
                        )
                    })}
                </div>

                {/* Extra Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {extraMetrics.map((metric, i) => {
                        const MetricIcon = metric.icon
                        return (
                            <div key={i} className="bg-[#1a1a24]/50 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <MetricIcon size={14} className="text-gray-500" />
                                    <span className="text-xs text-gray-400">{metric.label}</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-xl font-bold">{metric.value}</span>
                                    <span className={`text-xs ${metric.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {metric.change}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Main Chart — Вовлечённость */}
                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-400" />
                            Вовлечённость аудитории
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Просмотры</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Лайки</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={currentData}>
                            <defs>
                                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={formatNumber} />
                            <Tooltip
                                contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                formatter={(value) => formatNumber(value)}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="views" stroke="#10b981" fill="url(#viewsGrad)" strokeWidth={2} name="Просмотры" />
                            <Area type="monotone" dataKey="likes" stroke="#3b82f6" fill="url(#likesGrad)" strokeWidth={2} name="Лайки" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Second Row — 3 графика */}
                <div className="grid lg:grid-cols-3 gap-6 mb-6">
                    {/* Platform Distribution */}
                    <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5">
                        <h3 className="font-bold mb-2 text-sm">Распределение по платформам</h3>
                        <p className="text-xs text-gray-500 mb-4">Просмотры по соцсетям</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={platformData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(value) => `${value}%`}
                                />
                                <Legend fontSize={11} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Content Types */}
                    <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5">
                        <h3 className="font-bold mb-2 text-sm">Типы контента</h3>
                        <p className="text-xs text-gray-500 mb-4">Что публикуется чаще</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={contentTypeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {contentTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(value) => `${value}%`}
                                />
                                <Legend fontSize={11} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Audience by Time */}
                    <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5">
                        <h3 className="font-bold mb-2 text-sm">Активность аудитории</h3>
                        <p className="text-xs text-gray-gray-500 mb-4">Онлайн по времени суток</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={audienceTimeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={formatNumber} />
                                <Tooltip
                                    contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    formatter={(value) => formatNumber(value)}
                                />
                                <Bar dataKey="online" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Онлайн" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Engagement Stats Bar Chart */}
                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 mb-6">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <BarChartIcon size={18} className="text-blue-400" />
                        Статистика взаимодействий
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={currentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={formatNumber} />
                            <Tooltip
                                contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                formatter={(value) => formatNumber(value)}
                            />
                            <Legend />
                            <Bar dataKey="comments" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Комментарии" />
                            <Bar dataKey="shares" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Репосты" />
                            <Bar dataKey="followers" fill="#10b981" radius={[4, 4, 0, 0]} name="Новые подписчики" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Growth Line Chart */}
                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 mb-6">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <Zap size={18} className="text-amber-400" />
                        Рост подписчиков
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={currentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={formatNumber} />
                            <Tooltip
                                contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                formatter={(value) => formatNumber(value)}
                            />
                            <Line type="monotone" dataKey="followers" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} name="Новые подписчики" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Videos */}
                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2">
                            <Play size={18} className="text-pink-400" />
                            Топ видео
                        </h3>
                        <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                            Все видео <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">#</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Видео</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Платформа</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Просмотры</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Лайки</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CTR</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Тренд</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topVideos.map((video, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 px-4">
                                            <span className="text-lg font-bold text-gray-500">{i + 1}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="font-medium">{video.title}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full ${video.platform === 'TikTok' ? 'bg-emerald-500/10 text-emerald-400' :
                                                video.platform === 'YouTube' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {video.platform}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right font-medium">{video.views}</td>
                                        <td className="py-4 px-4 text-right text-gray-400">{video.likes}</td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="text-emerald-400 font-medium">{video.ctr}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {video.trend === 'up' ? (
                                                <ArrowUpRight size={16} className="text-emerald-400 inline" />
                                            ) : (
                                                <ArrowDownRight size={16} className="text-red-400 inline" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Insights */}
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={16} className="text-emerald-400" />
                            <span className="font-medium text-sm">Лучшее время публикации</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">18:00 — 21:00</p>
                        <p className="text-xs text-gray-500 mt-1">Максимальная активность аудитории</p>
                    </div>
                    <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Target size={16} className="text-blue-400" />
                            <span className="font-medium text-sm">Лучшая платформа</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">TikTok</p>
                        <p className="text-xs text-gray-500 mt-1">45% всех просмотров</p>
                    </div>
                    <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap size={16} className="text-amber-400" />
                            <span className="font-medium text-sm">Рекомендация AI</span>
                        </div>
                        <p className="text-sm text-gray-300">Увеличь частоту публикаций в TikTok на 20% для роста охвата</p>
                    </div>
                </div>
            </>
            )}

            {activeTab === 'channels' && <ChannelAnalyticsTab />}
            {activeTab === 'audience' && <AudienceInsightsTab />}
            {activeTab === 'reports' && <ReportGenerator />}
            {activeTab === 'cases' && <CaseStudyGenerator />}
        </div>
    </div>
    )
}

export default AnalyticsPage