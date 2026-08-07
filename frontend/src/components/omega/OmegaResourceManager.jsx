import { useEffect, useState } from 'react'
import { Cpu, Database, Wifi, AlertCircle, RefreshCw, Plus, TrendingUp } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

function Progress({ value, color = 'bg-[var(--primary)]' }) {
    return (
        <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
        </div>
    )
}

function ResourceCard({ icon: Icon, title, value, percent, color, children }) {
    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-white/5 ${color}`}><Icon className="w-5 h-5" /></div>
                    <h3 className="font-bold">{title}</h3>
                </div>
                <span className="text-sm text-[var(--text-muted)]">{value}</span>
            </div>
            <Progress value={percent} color={color} />
            {children}
        </div>
    )
}

export default function OmegaResourceManager() {
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(false)
    const [autoUpgrade, setAutoUpgrade] = useState(false)
    const [limit, setLimit] = useState(5000)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const load = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/admin/resources`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setStatus(data)
            setAutoUpgrade(data.autoUpgrade?.enabled || false)
            setLimit(data.autoUpgrade?.limitRUB || 5000)
        } catch (err) {
            console.error('[OmegaResourceManager]', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const toggleAutoUpgrade = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/resources/auto-upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enabled: !autoUpgrade, limitRUB: Number(limit) }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setAutoUpgrade(data.enabled)
            setLimit(data.limitRUB)
        } catch (err) {
            console.error(err.message)
        }
    }

    const runCheck = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/admin/resources/check`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setStatus(data)
        } catch (err) {
            console.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const credits = status?.credits || {}
    const db = status?.database || {}
    const bw = status?.bandwidth || {}

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">⚡ OMEGA Resource Manager</h2>
                    <p className="text-sm text-[var(--text-muted)]">Мониторинг API-кредитов, хранилища, трафика и авто-докупка</p>
                </div>
                <button type="button" onClick={runCheck} disabled={loading} className="btn btn-secondary text-sm flex items-center gap-2 min-w-[44px] min-h-[44px]">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Проверить сейчас
                </button>
            </div>

            {status?.alerts?.length > 0 && (
                <div className="glass-card rounded-2xl p-4 border-l-4 border-yellow-400 space-y-2">
                    {status.alerts.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-yellow-400 text-sm">
                            <AlertCircle className="w-4 h-4" /> {a}
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ResourceCard icon={Cpu} title="API Credits" value={`${credits.percent || 0}% used`} percent={credits.percent || 0} color="text-blue-400">
                    <div className="text-xs text-[var(--text-muted)]">Баланс: {credits.totalBalance || 0} · Использовано: {credits.totalUsage || 0}</div>
                    <button type="button" onClick={() => alert('Открыть провайдеры API')} className="mt-2 text-xs btn btn-primary w-full min-h-[44px]">Докупить кредиты</button>
                </ResourceCard>
                <ResourceCard icon={Database} title="MongoDB Storage" value={db.sizeHuman || '—'} percent={db.percent || 0} color="text-purple-400">
                    <div className="text-xs text-[var(--text-muted)]">{Math.round(db.size / 1024 / 1024 || 0)} MB</div>
                    <button type="button" onClick={() => alert('Апгрейд Atlas')} className="mt-2 text-xs btn btn-secondary w-full min-h-[44px]">Апгрейд БД</button>
                </ResourceCard>
                <ResourceCard icon={Wifi} title="Bandwidth" value={`${bw.percent || 0}%`} percent={bw.percent || 0} color="text-teal-400">
                    <div className="text-xs text-[var(--text-muted)]">Uptime: {Math.floor((bw.uptimeMinutes || 0) / 60)}h</div>
                    <button type="button" onClick={() => alert('Render dashboard')} className="mt-2 text-xs btn btn-secondary w-full min-h-[44px]">Проверить Render</button>
                </ResourceCard>
                <ResourceCard icon={TrendingUp} title="429 Errors" value={status?.errors429 || 0} percent={Math.min(100, (status?.errors429 || 0) / 50 * 100)} color="text-red-400">
                    <div className="text-xs text-[var(--text-muted)]">за последний час</div>
                    <button type="button" onClick={() => alert('Добавить провайдера')} className="mt-2 text-xs btn btn-secondary w-full min-h-[44px] flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Добавить провайдера</button>
                </ResourceCard>
            </div>

            <div className="glass-card rounded-2xl p-5">
                <h3 className="text-lg font-bold mb-3">Авто-докупка ресурсов</h3>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <button
                        type="button"
                        onClick={toggleAutoUpgrade}
                        className={`relative w-14 h-8 min-h-[44px] rounded-full transition-colors ${autoUpgrade ? 'bg-[var(--primary)]' : 'bg-white/10'}`}
                    >
                        <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${autoUpgrade ? 'translate-x-6' : ''}`} />
                    </button>
                    <span className="text-sm">{autoUpgrade ? 'Включено' : 'Выключено'} — OMEGA может докупать ресурсы до {limit} ₽/мес</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="number"
                        value={limit}
                        onChange={e => setLimit(e.target.value)}
                        className="glass-luxury rounded-lg px-3 py-2 text-sm w-32 bg-transparent"
                    />
                    <button type="button" onClick={toggleAutoUpgrade} className="btn btn-primary text-sm min-w-[44px] min-h-[44px]">Сохранить лимит</button>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
                <h3 className="text-lg font-bold mb-3">История операций</h3>
                {(status?.history || []).length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">Пока нет операций.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-[var(--text-muted)] border-b border-[var(--border)]/30">
                                <tr><th className="text-left p-2">Операция</th><th className="text-left p-2">Провайдер</th><th className="text-left p-2">Сумма</th><th className="text-left p-2">Статус</th><th className="text-left p-2">Дата</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]/30">
                                {(status.history || []).map((h, i) => (
                                    <tr key={i}>
                                        <td className="p-2">{h.operation}</td>
                                        <td className="p-2">{h.provider}</td>
                                        <td className="p-2">{h.amount} {h.currency}</td>
                                        <td className="p-2"><span className={`text-xs px-2 py-1 rounded-full ${h.status === 'success' ? 'bg-green-500/20 text-green-400' : h.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-white/10'}`}>{h.status}</span></td>
                                        <td className="p-2 text-[var(--text-muted)]">{new Date(h.createdAt).toLocaleString('ru-RU')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
