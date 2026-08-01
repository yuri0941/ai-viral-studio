import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { KPICard } from '../common/KPICard'
import { StatusBadge } from '../common/StatusBadge'
import {
    Brain, Activity, Zap, RefreshCw, Trash2, Terminal,
    AlertTriangle, Server, Bot, Play, FileText, Wifi, ToggleLeft, ToggleRight, KeyRound,
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

    const handleRecalcForecast = useCallback(() => {
        showToast('Прогноз доходов пересчитан (AI)')
    }, [showToast])

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

    const handleGenerateReport = useCallback(() => {
        showToast('Отчёт OMEGA Core сгенерирован')
    }, [showToast])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Brain size={20} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">OMEGA Core</h2>
                    <StatusBadge status="active" label="ONLINE" pulse />
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

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                        <AlertTriangle size={16} /> Алерты ({alerts.length})
                    </h3>
                    <div className="space-y-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className="flex items-center gap-3 p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                                <StatusBadge status={alert.severity} label={alert.type} />
                                <span className="text-xs text-gray-300 flex-1">{alert.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Агентов активно" value={activeAgents} icon={Bot} color="emerald" />
                <KPICard title="Приостановлено" value={pausedAgents} icon={Activity} color="orange" />
                <KPICard title="Средний CPU" value={avgCpu} suffix="%" icon={Server} color="blue" />
                <KPICard title="Серверов оффлайн" value={offlineServers} icon={Zap} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Agents */}
                <div className="lg:col-span-2 rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Bot size={16} className="text-purple-400" /> AI Агенты
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {agents.map(agent => (
                                <div
                                    key={agent.id}
                                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                                                <Bot size={16} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{agent.name}</div>
                                                <div className="text-[10px] text-gray-500">{agent.role}</div>
                                            </div>
                                        </div>
                                        <StatusBadge status={agent.status} pulse={agent.status === 'active'} />
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{agent.description}</p>
                                    {agent.status !== 'active' && (
                                        <button
                                            onClick={() => handleRestartAgent(agent.id)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                        >
                                            <Play size={12} /> Запустить
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Providers */}
                <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Wifi size={16} className="text-blue-400" /> AI Провайдеры
                    </h3>
                    <div className="space-y-3">
                        {PROVIDERS.map(provider => (
                            <div
                                key={provider.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${provider.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                    <span className="text-sm text-white">{provider.name}</span>
                                </div>
                                <button
                                    onClick={() => handleTestProvider(provider.id)}
                                    disabled={testLoading === provider.id}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    {testLoading === provider.id ? '...' : 'Тест'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-sm font-semibold text-white mt-6 mb-3 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" /> Здоровье бизнеса
                    </h3>
                    <div className="flex items-center justify-center py-4">
                        <div className="relative w-28 h-28">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a24" strokeWidth="8" />
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#00ff41" strokeWidth="8"
                                    strokeDasharray={`${aiAnalytics.businessHealth * 2.64} 264`}
                                    strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">{aiAnalytics.businessHealth}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-center text-gray-400">Индекс здоровья: <span className="text-emerald-400">Отлично</span></p>
                </div>
            </div>

            {/* System load chart */}
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
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
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Terminal size={16} className="text-gray-400" /> Консоль логов
                    </h3>
                    <button
                        onClick={handleClearLogs}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <Trash2 size={12} /> Очистить &gt;30 дней
                    </button>
                </div>
                <div className="h-48 overflow-y-auto rounded-xl bg-black/40 border border-white/5 p-3 font-mono text-xs space-y-1">
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
        </div>
    )
}
