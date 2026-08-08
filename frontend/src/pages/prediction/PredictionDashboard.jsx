import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api.js'
import {
    Telescope, RefreshCw, TrendingUp, DollarSign, Bitcoin,
    Briefcase, Calendar, AlertTriangle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'

const HORIZONS = ['7d', '30d', '90d']
const STAGES = ['pre-seed', 'seed', 'series-a']

export default function PredictionDashboard() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()

    if (!['owner', 'admin'].includes(user?.role)) {
        navigate('/dashboard', { replace: true })
        return null
    }

    const [activeTab, setActiveTab] = useState('trends')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Trends
    const [niche, setNiche] = useState('all')
    const [horizon, setHorizon] = useState('7d')
    const [trends, setTrends] = useState([])

    // Financial
    const [ticker, setTicker] = useState('AAPL')
    const [stockResult, setStockResult] = useState(null)
    const [coin, setCoin] = useState('BTC')
    const [cryptoResult, setCryptoResult] = useState(null)

    // Niches
    const [budget, setBudget] = useState(1000)
    const [niches, setNiches] = useState([])

    // Forecast
    const [forecastOpen, setForecastOpen] = useState(false)
    const [forecast, setForecast] = useState(null)

    const scanTrends = async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (niche && niche !== 'all') params.set('niche', niche)
            params.set('horizon', horizon)
            const data = await request(`/prediction/trends?${params.toString()}`)
            setTrends(data.trends || [])
        } catch (err) {
            setError(err.message || t('prediction.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const analyzeStock = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/stock', {
                method: 'POST',
                body: JSON.stringify({ ticker }),
            })
            setStockResult(data)
        } catch (err) {
            setError(err.message || t('prediction.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const analyzeCrypto = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/crypto', {
                method: 'POST',
                body: JSON.stringify({ coin }),
            })
            setCryptoResult(data)
        } catch (err) {
            setError(err.message || t('prediction.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const findNiches = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request(`/prediction/niches?budget=${budget}`)
            setNiches(data.niches || [])
        } catch (err) {
            setError(err.message || t('prediction.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const generateForecast = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/forecast')
            setForecast(data)
            setForecastOpen(true)
        } catch (err) {
            setError(err.message || t('prediction.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        scanTrends()
    }, [])

    const signalColor = (signal) => {
        if (signal === 'buy') return 'text-emerald-400'
        if (signal === 'sell') return 'text-red-400'
        return 'text-yellow-400'
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Telescope className="w-7 h-7 text-violet-400" />
                        {t('prediction.title', '🔮 Prediction Center — Разведка и Прогнозы')}
                    </h1>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Weekly Forecast */}
                <div className="glass-card rounded-2xl p-5 border border-white/10">
                    <button
                        onClick={() => setForecastOpen(!forecastOpen)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-violet-400" />
                            <h2 className="text-lg font-semibold text-white">{t('prediction.weeklyForecast', 'Еженедельный прогноз')}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); generateForecast() }}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('prediction.generateForecast', 'Сгенерировать прогноз')}
                            </button>
                            {forecastOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                    </button>
                    {forecastOpen && forecast && (
                        <div className="mt-4 space-y-4 text-sm text-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 rounded-xl p-4">
                                    <h3 className="text-violet-400 font-medium mb-2">{t('prediction.viralTrends', 'Вирусные тренды')}</h3>
                                    <ul className="space-y-1">
                                        {forecast.viralTrends?.map((t, i) => <li key={i}>• {t.platform}: {t.topic}</li>) || <li>—</li>}
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4">
                                    <h3 className="text-violet-400 font-medium mb-2">{t('prediction.businessNiches', 'Бизнес-ниши')}</h3>
                                    <ul className="space-y-1">
                                        {forecast.businessNiches?.map((n, i) => <li key={i}>• {n.name}</li>) || <li>—</li>}
                                    </ul>
                                </div>
                            </div>
                            {forecast.recommendations?.length > 0 && (
                                <div className="bg-slate-900/50 rounded-xl p-4">
                                    <h3 className="text-violet-400 font-medium mb-2">{t('prediction.recommendations', 'Рекомендации')}</h3>
                                    <ul className="space-y-1">
                                        {forecast.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'trends', label: t('prediction.viralTrends', 'Вирусные тренды'), icon: TrendingUp },
                        { id: 'financial', label: t('prediction.financialSignals', 'Финансовые сигналы'), icon: DollarSign },
                        { id: 'niches', label: t('prediction.businessNiches', 'Бизнес-ниши'), icon: Briefcase },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-900/50 text-gray-400 hover:text-white border border-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Trends Tab */}
                {activeTab === 'trends' && (
                    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                placeholder={t('prediction.niche', 'Ниша')}
                                className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                            <select
                                value={horizon}
                                onChange={(e) => setHorizon(e.target.value)}
                                className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            >
                                {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <button
                                onClick={scanTrends}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <RefreshCw className="w-4 h-4" />
                                {t('prediction.scan', 'Сканировать')}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-slate-900/50">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">{t('prediction.platform', 'Платформа')}</th>
                                        <th className="px-4 py-3">{t('prediction.topic', 'Тема')}</th>
                                        <th className="px-4 py-3">{t('prediction.growth', 'Рост')}</th>
                                        <th className="px-4 py-3">{t('prediction.audience', 'Аудитория')}</th>
                                        <th className="px-4 py-3">{t('prediction.bestTime', 'Лучшее время')}</th>
                                        <th className="px-4 py-3 rounded-r-lg">{t('prediction.hashtags', 'Хэштеги')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trends.map((t, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-4 py-3 text-white font-medium">{t.platform}</td>
                                            <td className="px-4 py-3 text-gray-300">{t.topic}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-semibold ${(t.growthScore || 0) > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {t.growthScore}
                                                </span>
                                                {(t.growthScore || 0) > 80 && (
                                                    <span className="ml-2 px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs">
                                                        {t('prediction.explosive', '🔥 Взрывной')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">{t.audience}</td>
                                            <td className="px-4 py-3 text-gray-300">{t.bestPostTime}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{Array.isArray(t.hashtags) ? t.hashtags.join(' ') : t.hashtags}</td>
                                        </tr>
                                    ))}
                                    {trends.length === 0 && (
                                        <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">{loading ? '...' : t('prediction.noData', 'Нет данных')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-violet-400" />
                                {t('prediction.stocks', 'Акции')}
                            </h2>
                            <div className="flex gap-2">
                                <input
                                    value={ticker}
                                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                    placeholder={t('prediction.ticker', 'Тикер')}
                                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                                />
                                <button
                                    onClick={analyzeStock}
                                    disabled={loading}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
                                >
                                    {t('prediction.analyze', 'Анализировать')}
                                </button>
                            </div>
                            {stockResult && (
                                <div className="bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.signal', 'Сигнал')}</span>
                                        <span className={`font-semibold uppercase ${signalColor(stockResult.signal)}`}>{stockResult.signal}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.confidence', 'Уверенность')}</span>
                                        <span className="text-white">{Math.round((stockResult.confidence || 0) * 100)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.targetPrice', 'Цель')}</span>
                                        <span className="text-white">{stockResult.targetPrice}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.stopLoss', 'Стоп-лосс')}</span>
                                        <span className="text-white">{stockResult.stopLoss}</span>
                                    </div>
                                    <p className="text-gray-300 pt-2 border-t border-white/5">{stockResult.reasoning}</p>
                                </div>
                            )}
                        </div>

                        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Bitcoin className="w-5 h-5 text-violet-400" />
                                {t('prediction.crypto', 'Крипто')}
                            </h2>
                            <div className="flex gap-2">
                                <input
                                    value={coin}
                                    onChange={(e) => setCoin(e.target.value.toUpperCase())}
                                    placeholder={t('prediction.coin', 'Монета')}
                                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                                />
                                <button
                                    onClick={analyzeCrypto}
                                    disabled={loading}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
                                >
                                    {t('prediction.analyze', 'Анализировать')}
                                </button>
                            </div>
                            {cryptoResult && (
                                <div className="bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.signal', 'Сигнал')}</span>
                                        <span className={`font-semibold uppercase ${signalColor(cryptoResult.signal)}`}>{cryptoResult.signal}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.confidence', 'Уверенность')}</span>
                                        <span className="text-white">{Math.round((cryptoResult.confidence || 0) * 100)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.targetPrice', 'Цель')}</span>
                                        <span className="text-white">{cryptoResult.targetPrice}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('prediction.stopLoss', 'Стоп-лосс')}</span>
                                        <span className="text-white">{cryptoResult.stopLoss}</span>
                                    </div>
                                    <p className="text-gray-300 pt-2 border-t border-white/5">{cryptoResult.reasoning}</p>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-2 flex items-start gap-2 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            {t('prediction.disclaimer', 'Образовательный анализ, не финансовая рекомендация')}
                        </div>
                    </div>
                )}

                {/* Niches Tab */}
                {activeTab === 'niches' && (
                    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(Number(e.target.value))}
                                placeholder={t('prediction.budget', 'Бюджет ($)')}
                                className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                            <button
                                onClick={findNiches}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('prediction.findNiches', 'Найти ниши')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {niches.map((n, i) => (
                                <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-white/5 hover:border-violet-500/30 transition-colors">
                                    <h3 className="text-lg font-semibold text-white mb-2">{n.name}</h3>
                                    <div className="space-y-1 text-sm text-gray-300">
                                        <p>{t('prediction.demand', 'Спрос')}: <span className="text-white">{n.demandScore}/10</span></p>
                                        <p>{t('prediction.competition', 'Конкуренция')}: <span className="text-white">{n.competitionScore}/10</span></p>
                                        <p>{t('prediction.startupCost', 'Стартовый капитал')}: <span className="text-white">${n.startupCost}</span></p>
                                        <p>{t('prediction.timeToRevenue', 'Срок до прибыли')}: <span className="text-white">{n.timeToRevenue}</span></p>
                                        <p>{t('prediction.channels', 'Каналы')}: <span className="text-white">{Array.isArray(n.recommendedChannels) ? n.recommendedChannels.join(', ') : n.recommendedChannels}</span></p>
                                        <p>{t('prediction.viralScore', 'Viral Score')}: <span className="text-violet-400 font-semibold">{n.viralPotential}</span></p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/project-factory')}
                                        className="mt-4 w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                                    >
                                        📋 {t('prediction.createProject', 'Создать проект')}
                                    </button>
                                </div>
                            ))}
                            {niches.length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-500">{loading ? '...' : t('prediction.noData', 'Нет данных')}</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
