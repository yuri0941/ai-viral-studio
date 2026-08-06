import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'
import { GraduationCap, ChevronDown, ChevronUp, Pause, Play } from 'lucide-react'

const AGENT_META = {
    research: { emoji: '🔍', color: 'from-violet-500/20 to-fuchsia-500/5', bar: 'from-violet-500 to-fuchsia-500' },
    code: { emoji: '💻', color: 'from-cyan-500/20 to-blue-500/5', bar: 'from-cyan-500 to-blue-500' },
    design: { emoji: '🎨', color: 'from-pink-500/20 to-rose-500/5', bar: 'from-pink-500 to-rose-500' },
    data: { emoji: '📊', color: 'from-emerald-500/20 to-teal-500/5', bar: 'from-emerald-500 to-teal-500' },
}

export default function OmegaLearningDashboard() {
    const [agents, setAgents] = useState([])
    const [expanded, setExpanded] = useState(null)
    const token = localStorage.getItem('token') || ''

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`${API_BASE_URL}/omega/learning/status`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.status === 'success') setAgents(data.data || [])
            } catch (err) {
                console.warn('[OmegaLearningDashboard] load failed:', err.message)
            }
        }
        load()
    }, [token])

    useEffect(() => {
        const interval = setInterval(() => {
            setAgents(prev => prev.map(a => {
                if (a.status !== 'active') return a
                const delta = Math.random() * 2 - 0.5
                const next = Math.min(100, Math.max(0, a.progress + delta))
                return { ...a, progress: next }
            }))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const toggle = (id) => setExpanded(prev => prev === id ? null : id)
    const toggleStatus = (id) => {
        setAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a))
    }

    return (
        <div className="w-full space-y-6">
            <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">OMEGA Learning</h2>
                        <p className="text-xs text-[var(--text-muted)]">4 агента постоянно учатся и улучшают OMEGA</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agents.map(agent => {
                        const meta = AGENT_META[agent.id] || AGENT_META.research
                        return (
                            <div key={agent.id} className={`rounded-2xl p-4 glass-card border border-white/10 bg-gradient-to-br ${meta.color} relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
                                <div className="flex items-start justify-between mb-3 relative">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{agent.emoji || meta.emoji}</span>
                                        <div>
                                            <div className="text-sm font-semibold text-white">{agent.name}</div>
                                            <div className="text-xs text-[var(--text-muted)] line-clamp-1">{agent.task}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleStatus(agent.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${agent.status === 'active' ? 'bg-white/10 hover:bg-white/20' : 'bg-amber-500/10 hover:bg-amber-500/20'}`}
                                    >
                                        {agent.status === 'active' ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-amber-300" />}
                                    </button>
                                </div>

                                <div className="relative h-3 rounded-full bg-white/10 overflow-hidden mb-2">
                                    <div
                                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${meta.bar} shimmer`}
                                        style={{ width: `${Math.min(100, agent.progress)}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs mb-3">
                                    <span className={agent.status === 'active' ? 'text-violet-300' : 'text-amber-300'}>
                                        {agent.status === 'active' ? 'active' : 'paused'}
                                    </span>
                                    <span className="text-white font-medium">{Math.round(agent.progress)}%</span>
                                </div>

                                <button
                                    onClick={() => toggle(agent.id)}
                                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    Подробнее {expanded === agent.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {expanded === agent.id && (
                                    <div className="mt-3 space-y-2 rounded-xl bg-[#0a0a1f]/50 border border-white/10 p-3">
                                        {agent.logs?.map((log, i) => (
                                            <div key={i} className="text-xs text-gray-300 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
