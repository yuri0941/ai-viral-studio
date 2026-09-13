import { useEffect, useMemo, useState } from 'react'
import {
    TrendingUp, Eye, Heart, MessageCircle, Share2, Download,
    Calendar, ArrowUpRight, Filter, ChevronDown,
    Play, Clock, Users, Target, Zap, BarChart as BarChartIcon, Globe, Award
} from 'lucide-react'
import { useSmartData } from '../hooks/useSmartData'
import toast from 'react-hot-toast'
import { selfImprovementApi } from '../services/api'
import { API_BASE_URL } from '../config.js'
import { ChannelAnalyticsTab } from '../components/analytics/ChannelAnalyticsTab'
import { AudienceInsightsTab } from '../components/analytics/AudienceInsightsTab'
import { CaseStudyGenerator } from '../components/analytics/CaseStudyGenerator'
import { ReportGenerator } from '../components/analytics/ReportGenerator'
import { EmptyState } from '../components/common/EmptyState.jsx'
import { useNavigate } from 'react-router-dom'
import { VirtualTable } from '../components/shared/VirtualTable'

const TABS = [
    { id: 'overview', label: 'Обзор' },
    { id: 'channels', label: 'По платформам' },
    { id: 'audience', label: 'Аудитория' },
    { id: 'niche', label: 'Моя ниша' },
    { id: 'reports', label: 'Отчёты' },
    { id: 'cases', label: 'Кейсы' },
]

// [REAL-DATA] DEMO_STATS — честные нули; хардкод-серии графиков (36K просмотров при нулях) удалены.
const DEMO_STATS = { views: 0, ctr: 0, subscribers: 0, engagement: 0, reach: 0, clicks: 0, shares: 0 }

function AnalyticsPage() {
    const [period, setPeriod] = useState('7d')
    const [activeTab, setActiveTab] = useState('overview')
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [nicheData, setNicheData] = useState(null)
    const [nicheLoading, setNicheLoading] = useState(false)
    const [nicheError, setNicheError] = useState('')
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const navigate = useNavigate()

    const { data: stats, isDemo } = useSmartData(`${API_BASE_URL}/analytics/overview`, DEMO_STATS, token)

    useEffect(() => {
        if (activeTab !== 'niche') return
        setNicheLoading(true)
        setNicheError('')
        selfImprovementApi.nicheMe()
            .then(res => setNicheData(res?.data || null))
            .catch(err => setNicheError(err.message || 'Не удалось загрузить данные по нише'))
            .finally(() => setNicheLoading(false))
    }, [activeTab])

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    // [REAL-DATA] без выдуманных «+23%»/«+324» — динамика показывается только при реальном источнике
    const metrics = useMemo(() => [
        { label: 'Всего просмотров', value: formatNumber(stats?.views ?? 0), icon: Eye },
        { label: 'Средний CTR', value: `${stats?.ctr ?? 0}%`, icon: Target },
        { label: 'Подписчики', value: formatNumber(stats?.subscribers ?? 0), icon: Users },
        { label: 'Вовлечённость', value: `${stats?.engagement ?? 0}%`, icon: Heart },
    ], [stats])

    const extraMetrics = useMemo(() => [
        { label: 'Охват', value: formatNumber(stats?.reach ?? 0), icon: Globe },
        { label: 'Сохранения', value: formatNumber(stats?.clicks ?? 0), icon: Award },
        { label: 'Репосты', value: formatNumber(stats?.shares ?? 0), icon: Share2 },
    ], [stats])

    // [REAL-DATA] реальных таймсерий пока нет — графики не рисуются без данных
    const hasSeries = !isDemo && Array.isArray(stats?.series) && stats.series.length > 0

    const topVideosColumns = useMemo(() => [
        { key: 'rank', header: '#', width: '60px', cell: (_, i) => <span className="text-lg font-bold text-gray-500">{i + 1}</span> },
        { key: 'title', header: 'Видео', width: '3fr', cell: (v) => <span className="font-medium">{v.title}</span> },
        {
            key: 'platform',
            header: 'Платформа',
            width: '120px',
            cell: (v) => (
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                    v.platform === 'TikTok' ? 'bg-emerald-500/10 text-emerald-400' :
                    v.platform === 'YouTube' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                }`}>
                    {v.platform}
                </span>
            ),
        },
        { key: 'views', header: 'Просмотры', width: '110px', cell: (v) => <span className="text-right font-medium block">{v.views}</span> },
        { key: 'likes', header: 'Лайки', width: '100px', cell: (v) => <span className="text-right text-gray-400 block">{v.likes}</span> },
        { key: 'ctr', header: 'CTR', width: '80px', cell: (v) => <span className="text-right text-emerald-400 font-medium block">{v.ctr}</span> },
    ], [])

    // [REAL-DATA] топ видео — только из API; без данных таблица показывает честный emptyMessage
    const topVideos = Array.isArray(stats?.topVideos) ? stats.topVideos : []

    const handleExport = (format) => {
        setShowExportMenu(false)
        if (!hasSeries) {
            toast.error('Нет данных для экспорта — подключите соцсети в Интеграциях')
            return
        }
        toast.success(`Экспорт в ${format.toUpperCase()} запущен!`)
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

                {/* Main Metrics — реальные скаляры из /analytics/overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {metrics.map((metric, i) => {
                        const MetricIcon = metric.icon
                        return (
                            <div key={i} className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <MetricIcon size={18} className="text-emerald-400" />
                                </div>
                                <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                                <span className="text-2xl font-black">{metric.value}</span>
                            </div>
                        )
                    })}
                </div>

                {/* Extra Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {extraMetrics.map((metric, i) => {
                        const MetricIcon = metric.icon
                        return (
                            <div key={i} className="bg-[#1a1a24]/50 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <MetricIcon size={14} className="text-gray-500" />
                                    <span className="text-xs text-gray-400">{metric.label}</span>
                                </div>
                                <span className="text-xl font-bold">{metric.value}</span>
                            </div>
                        )
                    })}
                </div>

                {/* [REAL-DATA] Графики — только при реальных таймсериях из API */}
                {!hasSeries ? (
                    <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 mb-6">
                        <EmptyState
                            icon={BarChartIcon}
                            title="Нет данных для графиков"
                            description="Подключите Instagram, TikTok или YouTube в Интеграциях — графики вовлечённости, роста и активности аудитории построятся по реальным данным."
                            actionLabel="Перейти в Интеграции"
                            onAction={() => navigate('/settings?tab=integrations')}
                        />
                    </div>
                ) : null}

                {/* Top Videos — реальные данные из API или честный empty */}
                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2">
                            <Play size={18} className="text-pink-400" />
                            Топ видео
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <VirtualTable
                            data={topVideos}
                            columns={topVideosColumns}
                            rowHeight={56}
                            maxHeight={400}
                            keyExtractor={(v, i) => `${v.title}-${i}`}
                            emptyMessage="Нет данных о видео — подключите соцсети в Интеграциях"
                        />
                    </div>
                </div>
            </>
            )}

            {activeTab === 'channels' && <ChannelAnalyticsTab />}
            {activeTab === 'audience' && <AudienceInsightsTab />}

            {activeTab === 'niche' && (
                <div className="space-y-6">
                    {nicheLoading && <div className="text-center text-gray-500 text-sm py-10">Загрузка данных по нише...</div>}
                    {nicheError && <div className="p-4 rounded-xl bg-red-500/10 text-red-400 text-sm">{nicheError}</div>}
                    {!nicheLoading && !nicheError && !nicheData && (
                        <EmptyState
                            icon={BarChartIcon}
                            title="Нет данных по нише"
                            description="OMEGA ещё не накопила статистику. Публикуйте контент регулярно — через 30 дней появятся персональные рекомендации."
                        />
                    )}
                    {!nicheLoading && nicheData && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Ваша ниша</div>
                                    <div className="text-2xl font-bold text-white capitalize">{nicheData.userNiche}</div>
                                </div>
                                <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Ваш средний CTR</div>
                                    <div className={`text-2xl font-bold ${nicheData.userCtr >= nicheData.nicheAvgCtr ? 'text-emerald-400' : 'text-yellow-400'}`}>{nicheData.userCtr}%</div>
                                </div>
                                <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Средний CTR по нише</div>
                                    <div className="text-2xl font-bold text-white">{nicheData.nicheAvgCtr}%</div>
                                </div>
                            </div>

                            {nicheData.formatRecommendations?.length > 0 && (
                                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <Zap size={18} className="text-amber-400" /> Эффективность форматов в вашей нише
                                    </h3>
                                    <div className="space-y-3">
                                        {nicheData.formatRecommendations.map((fmt, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-gray-600">{i + 1}</span>
                                                    <span className="text-sm font-medium text-white capitalize">{fmt.type}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-gray-500">CTR {fmt.avgCtr}%</span>
                                                    <span className={`${fmt.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {fmt.delta >= 0 ? '+' : ''}{fmt.delta}% к среднему
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {nicheData.bestTimeSlots?.length > 0 && (
                                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <Clock size={18} className="text-blue-400" /> Лучшее время публикаций
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {nicheData.bestTimeSlots.map((slot, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-white/[0.02] text-center">
                                                <div className="text-lg font-bold text-white">{slot.slot}</div>
                                                <div className="text-xs text-gray-500">CTR {slot.avgCtr}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {nicheData.crossTrends?.length > 0 && (
                                <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <Globe size={18} className="text-purple-400" /> Кросс-индустриальные идеи
                                    </h3>
                                    <ul className="space-y-2">
                                        {nicheData.crossTrends.map((idea, i) => (
                                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="text-purple-400 mt-0.5">•</span>
                                                {idea}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'reports' && <ReportGenerator />}
            {activeTab === 'cases' && <CaseStudyGenerator />}
        </div>
    </div>
    )
}

export default AnalyticsPage
