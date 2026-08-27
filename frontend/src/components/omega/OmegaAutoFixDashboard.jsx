import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'
import { Wrench, CheckCircle, XCircle, Loader2, AlertTriangle, Filter } from 'lucide-react'

const STATUS_MAP = {
    detected: { label: 'Обнаружено', color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
    analyzing: { label: 'Анализ', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
    proposed: { label: 'Предложено', color: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
    approved: { label: 'Одобрено', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
    rejected: { label: 'Отклонено', color: 'bg-red-500/10 text-red-300 border-red-500/20' },
    deployed: { label: 'Развёрнуто', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
}

const PRIORITY_MAP = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-gray-400',
}

export default function OmegaAutoFixDashboard() {
    const [logs, setLogs] = useState([])
    const [status, setStatus] = useState({})
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const token = localStorage.getItem('token') || ''

    const load = async () => {
        setLoading(true)
        try {
            const [statusRes, logsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/omega/autofix/status`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/omega/autofix/logs`, { headers: { Authorization: `Bearer ${token}` } }),
            ])
            const statusData = await statusRes.json()
            const logsData = await logsRes.json()
            if (statusData.status === 'success') setStatus(statusData.data || {})
            if (logsData.status === 'success') setLogs(Array.isArray(logsData.data) ? logsData.data : [])
        } catch (err) {
            console.warn('[OmegaAutoFixDashboard] load failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const action = async (id, type) => {
        try {
            await fetch(`${API_BASE_URL}/omega/autofix/${id}/${type}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            await load()
        } catch (err) {
            console.error('[OmegaAutoFixDashboard] action failed:', err.message)
        }
    }

    const scan = async () => {
        setScanning(true)
        try {
            await fetch(`${API_BASE_URL}/omega/autofix/scan`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            await load()
        } catch (err) {
            console.error('[OmegaAutoFixDashboard] scan failed:', err.message)
        } finally {
            setScanning(false)
        }
    }

    const filtered = filter === 'all' ? logs : logs.filter(l => l.priority === filter || l.status === filter)
    const total = status.detected + status.analyzing + status.proposed + status.approved + status.rejected + status.deployed
    const savedHours = ((status.approved || 0) * 0.9).toFixed(1)

    return (
        <div className="w-full space-y-6">
            <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">OMEGA AutoFix</h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                Найдено: {total || 0} | Предложено: {status.proposed || 0} | Одобрено: {status.approved || 0} | Сэкономлено: {savedHours}ч
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={scan}
                        disabled={scanning}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/80 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {scanning ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                        Запустить сканирование
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {['all', 'critical', 'proposed', 'approved', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                filter === f
                                    ? 'bg-violet-500/20 text-violet-200 border-violet-500/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {f === 'all' ? 'Все' : f === 'critical' ? '🔥 Критические' : f}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
                        <Loader2 size={24} className="animate-spin mr-2" /> Загрузка...
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Нет ошибок по выбранному фильтру.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filtered.map(log => (
                            <div key={log._id} className="rounded-2xl p-4 glass-card border border-white/10">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        {log.priority === 'critical' && <AlertTriangle size={16} className="text-red-400" />}
                                        <span className="text-sm font-medium text-white">{log.errorType}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${STATUS_MAP[log.status]?.color || 'bg-white/5'}`}>
                                        {STATUS_MAP[log.status]?.label || log.status}
                                    </span>
                                </div>
                                <div className="text-xs text-[var(--text-muted)] mb-2">Модуль: {log.module} • <span className={PRIORITY_MAP[log.priority]}>{log.priority}</span></div>
                                <div className="rounded-xl bg-[#0a0a1f]/50 border border-white/10 p-3 mb-3">
                                    <div className="text-[10px] text-gray-500 mb-1">Исправление:</div>
                                    <div className="text-xs text-emerald-300 font-mono line-clamp-4">{log.fixCode || log.fixExplanation}</div>
                                </div>
                                <div className="flex gap-2">
                                    {log.status === 'proposed' && (
                                        <>
                                            <button onClick={() => action(log._id, 'approve')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs hover:bg-emerald-500/20">
                                                <CheckCircle size={14} /> Одобрить
                                            </button>
                                            <button onClick={() => action(log._id, 'reject')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20">
                                                <XCircle size={14} /> Отклонить
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
