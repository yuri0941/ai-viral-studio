import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'
import { Microscope, Loader2, Zap, Filter } from 'lucide-react'

const TIME_FILTERS = [
    { key: '24h', label: '24ч' },
    { key: '7d', label: '7д' },
    { key: '30d', label: '30д' },
    { key: 'all', label: 'Всё' },
]

export default function OmegaResearchDashboard() {
    const [logs, setLogs] = useState([])
    const [insights, setInsights] = useState([])
    const [status, setStatus] = useState({ currentTopic: '', progress: 0 })
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(false)
    const [deepLoading, setDeepLoading] = useState(false)
    const token = localStorage.getItem('token') || ''

    const load = async () => {
        setLoading(true)
        try {
            const [logsRes, insightsRes, statusRes] = await Promise.all([
                fetch(`${API_BASE_URL}/omega/research/logs`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/omega/research/insights`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/omega/research/status`, { headers: { Authorization: `Bearer ${token}` } }),
            ])
            const logsData = await logsRes.json()
            const insightsData = await insightsRes.json()
            const statusData = await statusRes.json()
            if (logsData.status === 'success') setLogs(logsData.data?.logs || [])
            if (insightsData.status === 'success') setInsights(insightsData.data || [])
            if (statusData.status === 'success') setStatus(statusData.data || {})
        } catch (err) {
            console.warn('[OmegaResearchDashboard] load failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [filter])

    const filtered = logs.filter(l => {
        if (filter === 'all') return true
        const now = new Date()
        const created = new Date(l.createdAt)
        if (filter === '24h') return now - created < 24 * 60 * 60 * 1000
        if (filter === '7d') return now - created < 7 * 24 * 60 * 60 * 1000
        if (filter === '30d') return now - created < 30 * 24 * 60 * 60 * 1000
        return true
    })

    const trends = filtered.filter(l => l.type === 'trend' || l.type === 'general')
    const competitors = filtered.filter(l => l.type === 'competitor')
    const tech = filtered.filter(l => l.type === 'tech')

    const deepResearch = async () => {
        setDeepLoading(true)
        try {
            await fetch(`${API_BASE_URL}/omega/research/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ topic: 'viral content trends 2026', depth: 3 })
            })
            await load()
        } catch (err) {
            console.error('[OmegaResearchDashboard] deep research failed:', err.message)
        } finally {
            setDeepLoading(false)
        }
    }

    return (
        <div className="w-full space-y-6">
            <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Microscope className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">OMEGA Research</h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                OMEGA изучает сейчас: <span className="text-violet-300">{status.currentTopic || 'тренды 2026'}</span> — прогресс {status.progress || 0}%
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={deepResearch}
                        disabled={deepLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/80 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {deepLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                        Глубокое исследование
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {TIME_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                filter === f.key
                                    ? 'bg-violet-500/20 text-violet-200 border-violet-500/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
                        <Loader2 size={24} className="animate-spin mr-2" /> Загрузка...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Trends */}
                        <div className="rounded-2xl p-4 glass-card border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">🔥 Тренды</h3>
                            <div className="space-y-3">
                                {trends.slice(0, 5).map(t => (
                                    <div key={t._id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="text-xs font-medium text-white line-clamp-2">{t.topic}</div>
                                        <div className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">{t.summary}</div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                                                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((t.confidence || 0.5) * 100)}%` }} />
                                            </div>
                                            <span className="text-[10px] text-gray-400">{Math.round((t.confidence || 0.5) * 100)}%</span>
                                        </div>
                                        <button className="mt-2 text-[10px] text-violet-300 hover:text-violet-200">Применить к шаблонам</button>
                                    </div>
                                ))}
                                {trends.length === 0 && <p className="text-xs text-[var(--text-muted)]">Нет трендов.</p>}
                            </div>
                        </div>

                        {/* Competitors */}
                        <div className="rounded-2xl p-4 glass-card border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">🕵️ Конкуренты</h3>
                            <div className="space-y-3">
                                {competitors.slice(0, 5).map(c => (
                                    <div key={c._id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="text-xs font-medium text-white">{c.topic}</div>
                                        <div className="text-[11px] text-[var(--text-muted)] mt-1">{c.summary}</div>
                                        <div className="text-[10px] text-gray-400 mt-2">Дата анализа: {new Date(c.createdAt).toLocaleDateString('ru-RU')}</div>
                                    </div>
                                ))}
                                {competitors.length === 0 && (
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-muted)]">
                                        Добавьте URL конкурентов в настройках.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tech */}
                        <div className="rounded-2xl p-4 glass-card border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">⚡ Технологии</h3>
                            <div className="space-y-3">
                                {tech.slice(0, 5).map(t => (
                                    <div key={t._id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-medium text-white">{t.topic}</div>
                                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.summary}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${t.sources?.some(s => /security|vuln|CVE/i.test(s.title)) ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                                            {t.sources?.some(s => /security|vuln|CVE/i.test(s.title)) ? 'Alert' : 'OK'}
                                        </span>
                                    </div>
                                ))}
                                {tech.length === 0 && <p className="text-xs text-[var(--text-muted)]">Нет данных по технологиям.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
