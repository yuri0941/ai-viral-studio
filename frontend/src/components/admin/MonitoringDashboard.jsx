import { useEffect, useState } from 'react'
import { Activity, Cpu, HardDrive, Database, Wifi, AlertTriangle, CheckCircle, Clock, Download } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { API_BASE_URL } from '../../config.js'

const METRIC_LABELS = {
    cpu: 'CPU Load',
    ram: 'RAM %',
    db: 'DB Ready',
    redis: 'Redis',
    latency: 'Latency ms',
    errors: 'Error rate',
}

function formatBytes(b) {
    if (!b) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = b
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${Math.round(size)} ${units[i]}`
}

function AlertBadge({ type, children }) {
    const colors = {
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        ok: 'bg-green-500/20 text-green-400 border-green-500/30',
    }
    return (
        <span className={`px-3 py-1 rounded-full text-xs border ${colors[type] || colors.ok}`}>{children}</span>
    )
}

export default function MonitoringDashboard() {
    const [metrics, setMetrics] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const load = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/admin/metrics`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to load metrics')
            const data = await res.json()
            setMetrics(data.current)
            setHistory(data.history || [])
            setError(null)
        } catch (err) {
            setError(err.message)
            console.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])
    useEffect(() => {
        const id = setInterval(load, 30000)
        return () => clearInterval(id)
    }, [])

    const handleDownloadLogs = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/admin/logs`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                // Fallback: download current metrics report
                const blob = new Blob([JSON.stringify({ metrics, history }, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `metrics_report_${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
                console.log('Отчёт метрик скачан')
                return
            }
            const text = await res.text()
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `logs_${new Date().toISOString().slice(0, 10)}.log`
            a.click()
            URL.revokeObjectURL(url)
            console.log('Логи скачаны')
        } catch (err) {
            console.error('Не удалось скачать логи')
        }
    }

    const chartData = history.map((h, i) => ({
        time: new Date(h.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        latency: h.apiLatency || 0,
        errorRate: Math.round((h.errorRate || 0) * 100),
    }))

    const alerts = []
    if (metrics) {
        if (metrics.errorRate > 0.05) alerts.push({ type: 'error', text: 'Error rate >5%' })
        if (metrics.apiLatency > 2000) alerts.push({ type: 'error', text: 'Latency >2s' })
        if (metrics.ram?.percent > 85) alerts.push({ type: 'warning', text: `RAM ${metrics.ram.percent}%` })
        if (!metrics.db?.ready) alerts.push({ type: 'error', text: 'DB disconnected' })
    }
    if (!alerts.length) alerts.push({ type: 'ok', text: 'Все системы в норме' })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">📊 Мониторинг системы</h2>
                    <p className="text-sm text-[var(--text-muted)]">Реальное время · обновление каждые 30 сек</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} disabled={loading} className="btn btn-secondary text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Обновить
                    </button>
                    <button onClick={handleDownloadLogs} className="btn btn-primary text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Скачать логи
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card rounded-xl p-4 text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard icon={Cpu} label="CPU Load" value={metrics?.cpu?.load1 ? metrics.cpu.load1.toFixed(2) : '—'} sub={`${metrics?.cpu?.cores || 0} cores`} color="text-blue-400" />
                <MetricCard icon={HardDrive} label="RAM" value={metrics?.ram?.percent !== undefined ? `${metrics.ram.percent}%` : '—'} sub={`${formatBytes(metrics?.ram?.used)} / ${formatBytes(metrics?.ram?.total)}`} color="text-purple-400" />
                <MetricCard icon={Database} label="MongoDB" value={metrics?.db?.ready ? 'OK' : 'FAIL'} sub={`state ${metrics?.db?.state || '—'}`} color={metrics?.db?.ready ? 'text-green-400' : 'text-red-400'} />
                <MetricCard icon={Wifi} label="API Latency" value={metrics?.apiLatency !== undefined ? `${metrics.apiLatency} ms` : '—'} sub="avg 5 min" color="text-yellow-400" />
                <MetricCard icon={AlertTriangle} label="Error Rate" value={metrics?.errorRate !== undefined ? `${(metrics.errorRate * 100).toFixed(1)}%` : '—'} sub="5 min window" color={metrics?.errorRate > 0.05 ? 'text-red-400' : 'text-green-400'} />
                <MetricCard icon={Clock} label="Uptime" value={metrics?.uptime ? `${Math.floor(metrics.uptime / 60)} min` : '—'} sub="process" color="text-teal-400" />
            </div>

            <div className="glass-card rounded-2xl p-4">
                <h3 className="text-lg font-bold mb-4">Алерты</h3>
                <div className="flex flex-wrap gap-2">
                    {alerts.map((a, i) => (
                        <AlertBadge key={i} type={a.type}>{a.text}</AlertBadge>
                    ))}
                </div>
            </div>

            <div className="glass-card rounded-2xl p-4 h-80">
                <h3 className="text-lg font-bold mb-2">Latency / Error Rate (24ч)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                        <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#00ff41" strokeWidth={2} dot={false} name="Latency ms" />
                        <Line yAxisId="right" type="monotone" dataKey="errorRate" stroke="#f43f5e" strokeWidth={2} dot={false} name="Error rate %" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
    return (
        <div className="glass-card rounded-2xl p-5 flex items-start justify-between hover:bg-white/5 transition-colors">
            <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>
            </div>
            <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    )
}
