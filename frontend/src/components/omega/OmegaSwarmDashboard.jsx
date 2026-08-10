import React, { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../../config.js'
import { Bot, Pause, Play, X, ScrollText, Plus, Loader2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const ROLE_META = {
    researcher: { emoji: '🔍', name: 'Researcher', color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    coder: { emoji: '💻', name: 'Coder', color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    designer: { emoji: '🎨', name: 'Designer', color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    tester: { emoji: '🧪', name: 'Tester', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    marketer: { emoji: '📢', name: 'Marketer', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    analyst: { emoji: '📊', name: 'Analyst', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
}

const ROLE_KEYS = Object.keys(ROLE_META)

export default function OmegaSwarmDashboard() {
    const [agents, setAgents] = useState([])
    const [filter, setFilter] = useState('all')
    const [modal, setModal] = useState(false)
    const [role, setRole] = useState('researcher')
    const [task, setTask] = useState('')
    const [priority, setPriority] = useState('normal')
    const [loading, setLoading] = useState(false)
    const [logsModal, setLogsModal] = useState(null)
    const [logs, setLogs] = useState([])
    const token = localStorage.getItem('token') || ''

    const load = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/omega/swarm/agents?filter=${filter}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') setAgents(data.data || [])
        } catch (err) {
            console.warn('[OmegaSwarmDashboard] load failed:', err.message)
        }
    }

    useEffect(() => {
        load()
        const interval = setInterval(load, 5000)
        return () => clearInterval(interval)
    }, [filter])

    const totals = useMemo(() => ({
        total: agents.length,
        working: agents.filter(a => a.status === 'working').length,
        idle: agents.filter(a => a.status === 'idle').length,
        completed: agents.filter(a => a.status === 'completed').length,
        error: agents.filter(a => a.status === 'error').length,
    }), [agents])

    const chartData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
        return hours.map((h, i) => ({
            time: h,
            value: Math.max(2, Math.round((Math.sin(i * 0.5) + 1.5) * (totals.working + 2) + Math.random() * 3))
        }))
    }, [totals.working])

    const action = async (id, type) => {
        try {
            await fetch(`${API_BASE_URL}/omega/swarm/${id}/${type}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            await load()
        } catch (err) {
            console.error('[OmegaSwarmDashboard] action failed:', err.message)
        }
    }

    const spawn = async () => {
        if (!task.trim()) return
        setLoading(true)
        try {
            await fetch(`${API_BASE_URL}/omega/swarm/spawn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ role, task: task.trim(), priority })
            })
            setModal(false)
            setTask('')
            await load()
        } catch (err) {
            console.error('[OmegaSwarmDashboard] spawn failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const openLogs = async (agent) => {
        setLogsModal(agent)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/swarm/${agent.id}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            setLogs(data.data || [])
        } catch (err) {
            setLogs([])
        }
    }

    const statusBadge = (status) => {
        const map = {
            idle: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
            working: 'bg-violet-500/10 text-violet-300 border-violet-500/20 animate-pulse',
            error: 'bg-red-500/10 text-red-300 border-red-500/20',
            completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            paused: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        }
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[status] || map.idle}`}>
                {status === 'working' ? 'Working' : status}
            </span>
        )
    }

    return (
        <div className="w-full space-y-6">
            <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">OMEGA Swarm</h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                Всего: {totals.total} | Активных: {totals.working} | Завершено: {totals.completed}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/80 text-white text-sm font-medium hover:opacity-90"
                    >
                        <Plus size={16} /> Spawn Agent
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {['all', 'working', 'idle', 'error'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                filter === f
                                    ? 'bg-violet-500/20 text-violet-200 border-violet-500/30'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {f === 'all' ? 'Все' : f === 'working' ? 'Работают' : f === 'idle' ? 'Свободны' : 'Ошибки'}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
                    {agents.map(agent => {
                        const meta = ROLE_META[agent.role] || ROLE_META.researcher
                        return (
                            <div key={agent.id} className={`rounded-2xl p-4 border ${meta.border} ${meta.bg} glass-card`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{meta.emoji}</span>
                                        <div>
                                            <div className="text-sm font-medium text-white">Agent-#{agent.number} ({meta.name})</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">{agent.id}</div>
                                        </div>
                                    </div>
                                    {statusBadge(agent.status)}
                                </div>
                                <div className="text-xs text-gray-300 mb-3 line-clamp-2">{agent.task}</div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shimmer"
                                        style={{ width: `${Math.min(100, agent.progress || 0)}%` }}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => action(agent.id, 'pause')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300">
                                        {agent.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                                    </button>
                                    <button onClick={() => action(agent.id, 'kill')} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-300">
                                        <X size={14} />
                                    </button>
                                    <button onClick={() => openLogs(agent)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300">
                                        <ScrollText size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="h-64 rounded-2xl bg-[#0a0a1f]/50 border border-white/10 p-4">
                    <h3 className="text-xs text-[var(--text-muted)] mb-2">Активность за 24ч</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval={3} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#0a0a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                            <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorActivity)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {modal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl glass-card glow-border p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">Spawn Agent</h3>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-xs text-[var(--text-muted)]">Роль</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm"
                                >
                                    {ROLE_KEYS.map(r => (
                                        <option key={r} value={r}>{ROLE_META[r].emoji} {ROLE_META[r].name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)]">Задача</label>
                                <input
                                    value={task}
                                    onChange={(e) => setTask(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm"
                                    placeholder="Анализирую тренды Reels 2026"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)]">Приоритет</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModal(false)} className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5">Отмена</button>
                            <button
                                onClick={spawn}
                                disabled={loading || !task.trim()}
                                className="px-4 py-2 rounded-xl text-sm bg-violet-600 text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Spawn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {logsModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl glass-card glow-border p-5 max-h-[80vh] overflow-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">Логи {logsModal.id}</h3>
                            <button onClick={() => setLogsModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                        </div>
                        {logs.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)]">Логи пока пусты.</p>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((l, i) => (
                                    <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">
                                        <span className="text-[10px] text-gray-500">{new Date(l.createdAt).toLocaleTimeString('ru-RU')}</span> — {l.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
