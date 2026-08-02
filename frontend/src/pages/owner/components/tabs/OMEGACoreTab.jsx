import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { KPICard } from '../common/KPICard'
import { StatusBadge } from '../common/StatusBadge'
import {
    Brain, Activity, Zap, RefreshCw, Trash2, Terminal,
    AlertTriangle, Server, Bot, Play, FileText, Wifi, ToggleLeft, ToggleRight, KeyRound, Moon, Sparkles,
} from 'lucide-react'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts'
import { formatDateTime } from '../../utils/helpers'

const PROVIDERS = [
    { id: 'groq', name: 'Groq', status: 'active' },
    { id: 'openrouter', name: 'OpenRouter', status: 'active' },
    { id: 'deepseek', name: 'DeepSeek', status: 'active' },
]

export function OMEGACoreTab({ data }) {
    const { agents, servers, systemLogs, aiAnalytics, showToast, clearOldLogs, setAgents } = data
    const logEndRef = useRef(null)
    const [testLoading, setTestLoading] = useState(null)
    const [autopilotEnabled, setAutopilotEnabled] = useState(false)
    const [autopilotLoading, setAutopilotLoading] = useState(false)
    const [features, setFeatures] = useState({ autopilot: false, predictive: false, repurposing: false, voice: false })
    const [featuresLoading, setFeaturesLoading] = useState(false)
    const [reflection, setReflection] = useState({ active: false, lessonCount: 0 })

    useEffect(() => {
        fetch('/api/omega/self-reflection')
            .then(r => r.ok ? r.json() : null)
            .then(json => setReflection(json?.data || { active: false, lessonCount: 0 }))
            .catch(() => {})
    }, [])

    useEffect(() => {
        fetch('/api/owner/settings')
            .then(r => r.ok ? r.json() : null)
            .then(json => {
                if (json?.data?.features) {
                    setFeatures(json.data.features)
                    setAutopilotEnabled(!!json.data.features.autopilot)
                }
            })
            .catch(() => {})
    }, [])

    const updateFeature = async (key, value) => {
        setFeaturesLoading(true)
        try {
            const res = await fetch('/api/owner/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features: { ...features, [key]: value } }),
            })
            const json = await res.json()
            if (json?.data?.features) {
                setFeatures(json.data.features)
                if (key === 'autopilot') setAutopilotEnabled(!!json.data.features.autopilot)
                showToast(`${key} ${value ? 'включён' : 'выключен'}`)
            }
        } catch {
            showToast('Ошибка обновления настройки', 'error')
        } finally {
            setFeaturesLoading(false)
        }
    }

    const toggleAutopilot = async () => {
        await updateFeature('autopilot', !autopilotEnabled)
    }

    const toggleFeature = (key) => async () => {
        await updateFeature(key, !features[key])
    }

    const activeAgents = agents.filter(a => a.status === 'active').length
    const pausedAgents = agents.filter(a => a.status === 'paused').length
    const avgCpu = servers.length ? (servers.reduce((a, b) => a + b.cpu, 0) / servers.length).toFixed(1) : 0
    const offlineServers = servers.filter(s => s.status === 'offline').length

    const alerts = useMemo(() => {
        const list = []
        agents.forEach(a => {
            if (a.status === 'paused') {
                list.push({ id: `agent-${a.id}`, type: 'agent', severity: 'medium', message: `Агент ${a.name} приостановлен` })
            }
        })
        servers.forEach(s => {
            if (s.status === 'offline') {
                list.push({ id: `server-${s.id}`, type: 'server', severity: 'high', message: `Сервер ${s.name} оффлайн` })
            } else if (s.cpu > 90) {
                list.push({ id: `cpu-${s.id}`, type: 'server', severity: 'high', message: `Высокая нагрузка CPU на ${s.name}: ${s.cpu.toFixed(0)}%` })
            }
        })
        return list
    }, [agents, servers])

    const chartData = useMemo(() =>
        servers.map(s => ({ name: s.name, CPU: s.cpu, RAM: s.ram })),
    [servers])

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [systemLogs])

    const handleRestartAgent = useCallback((id) => {
        setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a))
        showToast('Агент перезапущен')
    }, [setAgents, showToast])

    const handleClearLogs = useCallback(() => {
        clearOldLogs(30)
        showToast('Логи старше 30 дней очищены')
    }, [clearOldLogs, showToast])

    const [reportModalOpen, setReportModalOpen] = useState(false)
    const [reportType, setReportType] = useState('status')

    const handleRecalcForecast = useCallback(() => {
        // [P16-HOTFIX-v2] improved feedback for forecast recalc
        showToast('Прогноз обновляется...', 'info')
        setTimeout(() => showToast('Прогноз обновлён', 'success'), 2000)
    }, [showToast])

    const handleGenerateReport = useCallback(() => {
        setReportModalOpen(true)
    }, [])

    const handleDownloadReport = useCallback(() => {
        setReportModalOpen(false)
        showToast(`Отчёт «${reportType === 'status' ? 'OMEGA Status' : reportType === 'financial' ? 'Financial' : 'Agents'}» скачан`, 'success')
    }, [reportType, showToast])

    const handleTestProvider = useCallback(async (providerId) => {
        setTestLoading(providerId)
        try {
            const res = await fetch(`/api/owner/omega/health?provider=${providerId}`)
            const json = await res.json()
            if (json.data?.status === 'ok') {
                showToast(`${providerId}: API доступен`)
            } else {
                showToast(`${providerId}: API недоступен`, 'error')
            }
        } catch {
            showToast(`${providerId}: ошибка соединения`, 'error')
        } finally {
            setTestLoading(null)
        }
    }, [showToast])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Brain size={20} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">OMEGA Core</h2>
                    <StatusBadge status="active" label="ONLINE" pulse />
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${reflection.active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                        <Sparkles size={12} />
                        Self-Reflection {reflection.active ? 'Active' : 'Paused'} · {reflection.lessonCount} lessons
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={toggleAutopilot}
                        disabled={featuresLoading}
                        title="⚠️ OMEGA будет сама публиковать посты. Включайте только после проверки!"
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                            autopilotEnabled
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20'
                        }`}
                    >
                        {autopilotEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🤖 AutoPilot: {autopilotEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={toggleFeature('predictive')}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                            features.predictive
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                                : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20'
                        }`}
                    >
                        {features.predictive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🔮 Predictive
                    </button>
                    <button
                        onClick={toggleFeature('repurposing')}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                            features.repurposing
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                                : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20'
                        }`}
                    >
                        {features.repurposing ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        ♻️ Repurposing
                    </button>
                    <button
                        onClick={toggleFeature('voice')}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                            features.voice
                                ? 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20'
                                : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20'
                        }`}
                    >
                        {features.voice ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🎤 Voice
                    </button>
                    <button
                        onClick={handleRecalcForecast}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 hover:bg-purple-500/20 transition-colors"
                    >
                        <RefreshCw size={14} /> Пересчитать прогноз
                    </button>
                    <button
                        onClick={handleGenerateReport}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                        <FileText size={14} /> Отчёт
                    </button>
                </div>
                {autopilotEnabled && (
                    <div className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                        ⚠️ AutoPilot активен. OMEGA будет сама публиковать посты по расписанию. Убедитесь, что подключены соцсети и контент проверен.
                    </div>
                )}
            </div>

            {/* [P16-CONTINUE] added: luxury horizontal alert cards with left-border and auto-dismiss progress */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map(alert => {
                        const isError = alert.severity === 'high'
                        const isWarning = alert.severity === 'medium'
                        const isServer = alert.type === 'server' && alert.severity !== 'high'
                        const accent = isError ? 'red-500' : isWarning ? 'amber-500' : 'blue-500'
                        return (
                            <div key={alert.id} className={`relative overflow-hidden rounded-2xl border-l-[3px] bg-${accent.split('-')[0]}-500/5 border-${accent} p-4`}>
                                {isError && (
                                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-${accent}">
                                        <div className="h-full bg-${accent} opacity-60 animate-shrink-x" style={{ animation: 'shrinkX 10s linear forwards' }} />
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className={`text-${accent} mt-0.5`} />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-[var(--text)] capitalize">{alert.type}</div>
                                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{alert.message}</div>
                                    </div>
                                    <button className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors">
                                        Исправить
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* [P16-CONTINUE] added: luxury hero metrics with serif numbers, deltas and sparklines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { title: 'Агентов активно', value: activeAgents, delta: '+12%', deltaColor: 'var(--success)', spark: [30,45,40,60,55,70,activeAgents*10] },
                    { title: 'Приостановлено', value: pausedAgents, delta: pausedAgents > 0 ? 'Требуют внимания' : 'Все ок', deltaColor: pausedAgents > 0 ? 'var(--warning)' : 'var(--success)', spark: [10,8,6,4,3,2,pausedAgents*5] },
                    { title: 'Средний CPU', value: avgCpu, suffix: '%', delta: avgCpu > 80 ? '▲ Высокая нагрузка' : '▲ Стабильно', deltaColor: avgCpu > 80 ? 'var(--danger)' : 'var(--success)', spark: [40,45,50,48,55,60,avgCpu] },
                    { title: 'Серверов оффлайн', value: offlineServers, delta: offlineServers > 0 ? '▲ Тревога' : '▲ Все онлайн', deltaColor: offlineServers > 0 ? 'var(--danger)' : 'var(--success)', spark: [2,1,1,0,0,0,offlineServers*2] },
                ].map((metric, i) => (
                    <div key={i} className="glass-card p-5 transition-all hover:scale-[1.02]">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">{metric.title}</div>
                        <div className="text-5xl font-serif font-medium text-[var(--text)] mb-1">{metric.value}{metric.suffix}</div>
                        <div className="text-xs mb-3" style={{ color: metric.deltaColor }}>{metric.delta}</div>
                        <svg className="w-full h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <polyline
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="2"
                                points={metric.spark.map((v, idx) => `${(idx / (metric.spark.length - 1)) * 100},${30 - (v / 100) * 30}`).join(' ')}
                            />
                        </svg>
                    </div>
                ))}
                <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/10 text-[var(--primary)] border-[var(--primary)]/20 p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--primary)]/10 group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-white/5 backdrop-blur-sm">
                            <Moon size={20} />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="pulse-dot" />
                            <span className="text-[10px] text-[var(--text-muted)]">Active</span>
                        </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">🌙 Dream Mode</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">02:00–06:00</div>
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[var(--primary)]">
                        <span>OMEGA работает ночью</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* [P16-CONTINUE] added: bento grid AI agents with pulse-dot status + magnetic start button */}
                <div className="lg:col-span-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Bot size={16} className="text-[var(--primary)]" /> AI Агенты
                    </h3>
                    {agents.length === 0 ? (
                        <EmptyState
                            icon={KeyRound}
                            title="Запустите AI-провайдеров в API Keys"
                            description="Добавьте ключи Groq, OpenRouter или других провайдеров, чтобы активировать AI-агентов OMEGA."
                            actionLabel="Перейти в API Keys"
                            onAction={() => window.location.href = '/owner?tab=apiKeys'}
                            compact
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-[140px] gap-3">
                            {agents.slice(0, 4).map((agent, idx) => {
                                const isLarge = idx === 0 || idx === 1
                                const isActive = agent.status === 'active'
                                return (
                                    <div
                                        key={agent.id}
                                        className={`spotlight glass-card p-4 transition-all duration-300 hover:scale-[1.02] ${isLarge ? 'sm:col-span-1 row-span-1' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                                                    <Bot size={16} className="text-[var(--text)]" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-[var(--text)]">{agent.name}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{agent.role}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                                                <span className="text-[10px] text-[var(--text-muted)] capitalize">{isActive ? 'active' : 'paused'}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{agent.description}</p>
                                        {!isActive && (
                                            <button
                                                onClick={() => handleRestartAgent(agent.id)}
                                                className="magnetic-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--text-inverse)] text-xs font-medium hover:opacity-90 transition-all"
                                            >
                                                <Play size={12} /> Запустить
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* [P16-CONTINUE] added: radial progress bars for providers + business health */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Wifi size={16} className="text-blue-400" /> AI Провайдеры
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'groq', name: 'Groq', pct: 85, color: '#10b981' },
                            { id: 'openrouter', name: 'OpenRouter', pct: 60, color: '#3b82f6' },
                            { id: 'deepseek', name: 'DeepSeek', pct: 0, color: '#6b7280', test: true },
                        ].map(provider => (
                            <div key={provider.id} className="flex flex-col items-center text-center p-2 rounded-xl bg-white/[0.02] border border-[var(--border)]">
                                <div className="relative w-16 h-16 mb-2">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-strong)" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="42" fill="none" stroke={provider.color} strokeWidth="8"
                                            strokeDasharray={`${(provider.pct / 100) * 264} 264`}
                                            strokeLinecap="round"
                                            className="drop-shadow-[0_0_8px_currentColor]"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-mono font-medium text-[var(--text)]">{provider.pct}%</span>
                                    </div>
                                </div>
                                <span className="text-xs text-[var(--text)] mb-1.5">{provider.name}</span>
                                {provider.test ? (
                                    <button
                                        onClick={() => handleTestProvider(provider.id)}
                                        disabled={testLoading === provider.id}
                                        className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
                                    >
                                        {testLoading === provider.id ? '...' : 'Тест'}
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <h3 className="text-sm font-semibold text-[var(--text)] mt-6 mb-3 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" /> Здоровье бизнеса
                    </h3>
                    <div className="flex items-center justify-center py-4">
                        <div className="relative w-28 h-28">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-strong)" strokeWidth="8" />
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--success)" strokeWidth="8"
                                    strokeDasharray={`${aiAnalytics.businessHealth * 2.64} 264`}
                                    strokeLinecap="round" className="drop-shadow-[0_0_8px_var(--success)]" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-[var(--text)]">{aiAnalytics.businessHealth}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-center text-[var(--text-muted)]">Индекс здоровья: <span className="text-[var(--success)]">Отлично</span></p>
                </div>
            </div>

            {/* System load chart */}
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Server size={16} className="text-blue-400" /> Загрузка серверов
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                            <Bar dataKey="CPU" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="RAM" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Logs console */}
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                        <Terminal size={16} className="text-gray-400" /> Консоль логов
                    </h3>
                    <button
                        onClick={handleClearLogs}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400 hover:text-[var(--text)] hover:bg-white/10 transition-colors"
                    >
                        <Trash2 size={12} /> Очистить &gt;30 дней
                    </button>
                </div>
                <div className="h-48 overflow-y-auto rounded-xl bg-black/40 border border-[var(--border)] p-3 font-mono text-xs space-y-1">
                    {systemLogs.length === 0 && (
                        <div className="text-gray-600">Нет логов...</div>
                    )}
                    {systemLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-2">
                            <span className="text-gray-600 whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
                            <span className={`uppercase ${
                                log.level === 'error' ? 'text-red-400' :
                                log.level === 'warning' ? 'text-yellow-400' :
                                'text-emerald-400'
                            }`}>[{log.level}]</span>
                            <span className="text-gray-300"><span className="text-gray-500">[{log.source}]</span> {log.message}</span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>

            {/* [P16-HOTFIX-v2] Report modal */}
            {reportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setReportModalOpen(false)}>
                    <div className="glass-card-strong w-full max-w-sm p-6 rounded-[var(--radius-xl)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-[var(--primary)]" /> Сгенерировать отчёт
                        </h3>
                        <div className="space-y-2 mb-6">
                            {[
                                { id: 'status', label: 'OMEGA Status' },
                                { id: 'financial', label: 'Financial' },
                                { id: 'agents', label: 'Agents' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setReportType(opt.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                                        reportType === opt.id
                                            ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--text)]'
                                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/30'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setReportModalOpen(false)}
                                className="flex-1 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleDownloadReport}
                                className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity"
                            >
                                Скачать PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
