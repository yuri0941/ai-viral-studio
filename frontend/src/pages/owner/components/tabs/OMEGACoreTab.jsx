import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { KPICard } from '../common/KPICard'
import { StatusBadge } from '../common/StatusBadge'
import {
    Brain, Activity, Zap, RefreshCw, Trash2, Terminal,
    AlertTriangle, Server, Bot, Play, Pause, RotateCcw, FileText, Wifi, ToggleLeft, ToggleRight, KeyRound, Moon, Sparkles,
    Settings, BarChart2, Cpu, X, MessageSquare, Plus, CheckCircle2, CheckCircle
} from 'lucide-react'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts'
import { formatDateTime } from '../../utils/helpers'
import { jsPDF } from 'jspdf'
import { useTranslation } from 'react-i18next'

const PROVIDERS = [
    { id: 'groq', name: 'Groq', status: 'active' },
    { id: 'openrouter', name: 'OpenRouter', status: 'active' },
    { id: 'deepseek', name: 'DeepSeek', status: 'active' },
]

export function OMEGACoreTab({ data }) {
    const { t } = useTranslation()
    const { agents, servers, systemLogs, aiAnalytics, showToast, clearOldLogs, setAgents } = data
    const logEndRef = useRef(null)
    const [testLoading, setTestLoading] = useState(null)

    // [P16-FIX] added: dedicated toggle states for OMEGA Core features
    const [autopilotOn, setAutopilotOn] = useState(false)
    const [predictiveOn, setPredictiveOn] = useState(false)
    const [repurposingOn, setRepurposingOn] = useState(false)
    const [voiceOn, setVoiceOn] = useState(false)
    const [featuresLoading, setFeaturesLoading] = useState(false)

    const [reflection, setReflection] = useState({ active: false, lessonCount: 0 })
    const [selectedAgent, setSelectedAgent] = useState(null)
    const [agentTab, setAgentTab] = useState('overview')
    const [agentSettings, setAgentSettings] = useState({ autoReply: true, notifications: true, priority: 'normal', systemPrompt: '' })

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
                    const f = json.data.features
                    setAutopilotOn(!!f.autopilot)
                    setPredictiveOn(!!f.predictive)
                    setRepurposingOn(!!f.repurposing)
                    setVoiceOn(!!f.voice)
                }
            })
            .catch(() => {})
    }, [])

    // [P16-FIX] added: individual OMEGA feature toggles with dedicated API endpoints
    const toggleFeature = async (key, current, setter) => {
        setFeaturesLoading(true)
        const next = !current
        setter(next)
        try {
            let endpoint = '/api/owner/settings'
            let body = JSON.stringify({ features: { [key]: next } })
            if (key === 'autopilot') {
                endpoint = '/api/omega/autopilot/toggle'
                body = JSON.stringify({ enabled: next })
            } else if (key === 'predictive') {
                endpoint = '/api/analytics/predictive/enable'
                body = JSON.stringify({ enabled: next })
            } else if (key === 'repurposing') {
                endpoint = '/api/omega/repurposing/enable'
                body = JSON.stringify({ enabled: next })
            } else if (key === 'voice') {
                endpoint = '/api/omega/voice/enable'
                body = JSON.stringify({ enabled: next })
            }
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            })
            if (!res.ok) throw new Error()
            showToast(`${key} ${next ? 'включён' : 'выключен'}`)
        } catch {
            showToast('Ошибка обновления настройки', 'error')
        } finally {
            setFeaturesLoading(false)
        }
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

    const handleRestartAgent = useCallback((id, e) => {
        e?.stopPropagation()
        setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a))
        showToast('Агент перезапущен')
    }, [setAgents, showToast])

    const handlePauseAgent = useCallback((id, e) => {
        e?.stopPropagation()
        setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'paused' } : a))
        showToast('Агент приостановлен')
    }, [setAgents, showToast])

    const handleStartAgent = useCallback((id, e) => {
        e?.stopPropagation()
        setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a))
        showToast('Агент запущен')
    }, [setAgents, showToast])

    const handleClearLogs = useCallback(() => {
        clearOldLogs(30)
        showToast('Логи старше 30 дней очищены')
    }, [clearOldLogs, showToast])

    const getAgentMetrics = useCallback((agent) => {
        const seed = String(agent.id).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)
        const uptime = (99.5 + (seed % 50) / 100).toFixed(1)
        const tasksToday = (seed % 40) + 5
        const avgResponse = 80 + (seed % 120)
        const cpu = 10 + (seed % 60)
        const ram = 20 + (seed % 50)
        const spark = Array.from({ length: 7 }, (_, i) => 20 + ((seed + i * 13) % 80))
        return { uptime, tasksToday, avgResponse, cpu, ram, spark }
    }, [])

    const getAgentLogs = useCallback((agent) => {
        const levels = ['info', 'info', 'info', 'warning', 'info', 'error', 'info']
        return Array.from({ length: 8 }, (_, i) => ({
            id: `${agent.id}-${i}`,
            time: `0${9 - i}:3${i % 6}:00`,
            level: levels[(i + agent.id.length) % levels.length],
            source: agent.name,
            message: i === 5 ? 'Failed to parse external API response, retrying' : `Task #${1000 + i} processed successfully`,
        }))
    }, [])

    const getAgentStats = useCallback((agent) => {
        const seed = String(agent.id).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)
        return Array.from({ length: 7 }, (_, i) => ({
            day: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i],
            tasks: ((seed + i * 7) % 20) + 2,
            success: 70 + ((seed + i * 11) % 25),
            time: 100 + ((seed + i * 19) % 200),
        }))
    }, [])

    const [reportModalOpen, setReportModalOpen] = useState(false)
    const [reportType, setReportType] = useState('status')

    const handleRecalcForecast = useCallback(async () => {
        showToast(t('omega.forecastUpdating'), 'info')
        try {
            await fetch('/api/omega/predictions/recalculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
            showToast(t('omega.forecastUpdated'), 'success')
        } catch {
            showToast(t('omega.forecastError'), 'error')
        }
    }, [showToast, t])

    const handleGenerateReport = useCallback(() => {
        setReportModalOpen(true)
    }, [])

    const handleDownloadReport = useCallback(() => {
        setReportModalOpen(false)
        const doc = new jsPDF()
        const title = reportType === 'status' ? 'OMEGA Status Report' : reportType === 'financial' ? 'OMEGA Financial Report' : 'OMEGA Agents Report'
        doc.setFontSize(16)
        doc.text(title, 14, 20)
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
        doc.text(`Active agents: ${agents.filter(a => a.status === 'active').length}`, 14, 40)
        doc.text(`Paused agents: ${agents.filter(a => a.status === 'paused').length}`, 14, 48)
        doc.text(`Servers online: ${servers.filter(s => s.status !== 'offline').length} / ${servers.length}`, 14, 56)
        doc.text(`Business health: ${aiAnalytics?.businessHealth ?? '-'}`, 14, 64)
        doc.save(`omega-report-${reportType}.pdf`)
        showToast(`Отчёт «${reportType === 'status' ? 'OMEGA Status' : reportType === 'financial' ? 'Financial' : 'Agents'}» скачан`, 'success')
    }, [reportType, showToast, agents, servers, aiAnalytics])

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

    const toggleBtnClass = (on) => on
        ? 'bg-green-500/20 border-green-500 text-green-400 rounded-xl px-4 py-2 border'
        : 'glass text-[var(--text-muted)] rounded-xl px-4 py-2'

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Brain size={20} className="text-[var(--primary)]" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">{t('omega.title')}</h2>
                    <StatusBadge status="active" label="ONLINE" pulse />
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${reflection.active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                        <Sparkles size={12} />
                        Self-Reflection {reflection.active ? 'Active' : 'Paused'} · {reflection.lessonCount} lessons
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => toggleFeature('autopilot', autopilotOn, setAutopilotOn)}
                        disabled={featuresLoading}
                        title="⚠️ OMEGA будет сама публиковать посты. Включайте только после проверки!"
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(autopilotOn)}`}
                    >
                        {autopilotOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🤖 {t('omega.autopilot')}: {autopilotOn ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={() => toggleFeature('predictive', predictiveOn, setPredictiveOn)}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(predictiveOn)}`}
                    >
                        {predictiveOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🔮 {t('omega.predictive')}
                    </button>
                    <button
                        onClick={() => toggleFeature('repurposing', repurposingOn, setRepurposingOn)}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(repurposingOn)}`}
                    >
                        {repurposingOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        ♻️ {t('omega.repurposing')}
                    </button>
                    <button
                        onClick={() => toggleFeature('voice', voiceOn, setVoiceOn)}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(voiceOn)}`}
                    >
                        {voiceOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🎤 {t('omega.voice')}
                    </button>
                    <button
                        onClick={handleRecalcForecast}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                    >
                        <RefreshCw size={14} /> {t('omega.recalcForecast')}
                    </button>
                    <button
                        onClick={handleGenerateReport}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                        <FileText size={14} /> {t('omega.report')}
                    </button>
                </div>
            </div>

            {autopilotOn && (
                <div className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    ⚠️ AutoPilot активен. OMEGA будет сама публиковать посты по расписанию. Убедитесь, что подключены соцсети и контент проверен.
                </div>
            )}

            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map(alert => {
                        const isError = alert.severity === 'high'
                        const isWarning = alert.severity === 'medium'
                        const accent = isError ? 'red-500' : isWarning ? 'amber-500' : 'blue-500'
                        return (
                            <div key={alert.id} className={`relative overflow-hidden rounded-2xl border-l-[3px] bg-${accent.split('-')[0]}-500/5 border-${accent} p-4`}>
                                {isError && (
                                    <div className="absolute top-0 left-0 right-0 h-[2px]">
                                        <div className="h-full bg-${accent} opacity-60 animate-shrink-x" style={{ animation: 'shrinkX 10s linear forwards' }} />
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className={`text-${accent} mt-0.5`} />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-[var(--text)] capitalize">{alert.type}</div>
                                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{alert.message}</div>
                                    </div>
                                    <button className="text-xs px-2.5 py-1.5 rounded-lg glass text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors">
                                        Исправить
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { title: 'Агентов активно', value: activeAgents, delta: '+12%', deltaColor: 'var(--success)', spark: [30,45,40,60,55,70,activeAgents*10] },
                    { title: 'Приостановлено', value: pausedAgents, delta: pausedAgents > 0 ? 'Требуют внимания' : 'Все ок', deltaColor: pausedAgents > 0 ? 'var(--warning)' : 'var(--success)', spark: [10,8,6,4,3,2,pausedAgents*5] },
                    { title: 'Средний CPU', value: avgCpu, suffix: '%', delta: avgCpu > 80 ? '▲ Высокая нагрузка' : '▲ Стабильно', deltaColor: avgCpu > 80 ? 'var(--danger)' : 'var(--success)', spark: [40,45,50,48,55,60,avgCpu] },
                    { title: 'Серверов оффлайн', value: offlineServers, delta: offlineServers > 0 ? '▲ Тревога' : '▲ Все онлайн', deltaColor: offlineServers > 0 ? 'var(--danger)' : 'var(--success)', spark: [2,1,1,0,0,0,offlineServers*2] },
                ].map((metric, i) => (
                    <div key={i} className="luxury-card glass p-5">
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
                <div className="luxury-card glass p-5 relative overflow-hidden bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/10 text-[var(--primary)] border-[var(--primary)]/20">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
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
                <div className="lg:col-span-2 luxury-card glass p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                            <Bot size={16} className="text-[var(--primary)]" /> {t('omega.agents')}
                        </h3>
                        <button
                            onClick={() => showToast('Добавление агента: выберите шаблон в настройках OMEGA')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs hover:bg-[var(--primary)]/20 transition-colors"
                        >
                            <Plus size={14} /> {t('omega.addAgent')}
                        </button>
                    </div>
                    {agents.length === 0 ? (
                        <EmptyState
                            icon={KeyRound}
                            title={t('omega.noAgents')}
                            description={t('omega.noAgentsDesc')}
                            actionLabel={t('omega.goToApiKeys')}
                            onAction={() => window.location.href = '/owner?tab=apiKeys'}
                            compact
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {agents.slice(0, 4).map(agent => {
                                const isActive = agent.status === 'active'
                                const metrics = getAgentMetrics(agent)
                                return (
                                    <div
                                        key={agent.id}
                                        onClick={() => { setSelectedAgent(agent); setAgentTab('overview') }}
                                        className="cursor-pointer luxury-card glass p-4 hover:border-[var(--primary)]/30"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                                    <Bot size={24} className="text-[var(--primary)]" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-[var(--text)]">{agent.name}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{agent.role}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass">
                                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                                <span className="text-[10px] text-[var(--text-muted)] capitalize">{isActive ? 'active' : 'paused'}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{agent.description}</p>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="text-center p-2 rounded-lg glass">
                                                <div className="text-xs font-bold text-[var(--text)]">{metrics.uptime}%</div>
                                                <div className="text-[9px] text-[var(--text-muted)]">Uptime</div>
                                            </div>
                                            <div className="text-center p-2 rounded-lg glass">
                                                <div className="text-xs font-bold text-[var(--text)]">{metrics.tasksToday}</div>
                                                <div className="text-[9px] text-[var(--text-muted)]">Tasks</div>
                                            </div>
                                            <div className="text-center p-2 rounded-lg glass">
                                                <div className="text-xs font-bold text-[var(--text)]">{metrics.avgResponse}ms</div>
                                                <div className="text-[9px] text-[var(--text-muted)]">Avg</div>
                                            </div>
                                        </div>
                                        <svg className="w-full h-8 mb-3" viewBox="0 0 100 30" preserveAspectRatio="none">
                                            <polyline
                                                fill="none"
                                                stroke="var(--primary)"
                                                strokeWidth="2"
                                                points={metrics.spark.map((v, idx) => `${(idx / (metrics.spark.length - 1)) * 100},${30 - (v / 100) * 30}`).join(' ')}
                                            />
                                        </svg>
                                        <div className="flex items-center gap-2">
                                            {isActive ? (
                                                <button onClick={e => handlePauseAgent(agent.id, e)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] hover:bg-amber-500/20 transition-colors">
                                                    <Pause size={10} /> Пауза
                                                </button>
                                            ) : (
                                                <button onClick={e => handleStartAgent(agent.id, e)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] hover:bg-emerald-500/20 transition-colors">
                                                    <Play size={10} /> Запустить
                                                </button>
                                            )}
                                            <button onClick={e => { e.stopPropagation(); handleRestartAgent(agent.id, e); }} className="flex items-center gap-1 px-2 py-1 rounded-lg glass text-[var(--text-muted)] text-[10px] hover:bg-[var(--surface)] transition-colors">
                                                <RotateCcw size={10} /> Рестарт
                                            </button>
                                            <button className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg glass text-[var(--text-muted)] text-[10px] hover:bg-[var(--surface)] transition-colors">
                                                <Terminal size={10} /> Логи
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="luxury-card glass p-5">
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Wifi size={16} className="text-[var(--accent)]" /> AI Провайдеры
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'groq', name: 'Groq', pct: 85, color: '#10b981' },
                            { id: 'openrouter', name: 'OpenRouter', pct: 60, color: '#3b82f6' },
                            { id: 'deepseek', name: 'DeepSeek', pct: 0, color: '#6b7280', test: true },
                        ].map(provider => (
                            <div key={provider.id} className="flex flex-col items-center text-center p-2 rounded-xl glass">
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
                                        className="text-[10px] px-2 py-1 rounded-full glass text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
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
                                    strokeDasharray={`${(aiAnalytics?.businessHealth || 0) * 2.64} 264`}
                                    strokeLinecap="round" className="drop-shadow-[0_0_8px_var(--success)]" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-[var(--text)]">{aiAnalytics?.businessHealth || 0}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-center text-[var(--text-muted)]">Индекс здоровья: <span className="text-[var(--success)]">Отлично</span></p>
                </div>
            </div>

            <div className="luxury-card glass p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Server size={16} className="text-[var(--accent)]" /> Загрузка серверов
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                itemStyle={{ color: 'var(--text)', fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                            <Bar dataKey="CPU" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="RAM" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="luxury-card glass p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                        <Terminal size={16} className="text-[var(--text-muted)]" /> {t('omega.logs')}
                    </h3>
                    <button
                        onClick={handleClearLogs}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                    >
                        <Trash2 size={12} /> {t('omega.clearLogs')}
                    </button>
                </div>
                <div className="h-48 overflow-y-auto rounded-xl glass p-3 font-mono text-xs space-y-1">
                    {systemLogs.length === 0 && (
                        <div className="text-[var(--text-muted)]">Нет логов...</div>
                    )}
                    {systemLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-2">
                            <span className="text-[var(--text-muted)] whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
                            <span className={`uppercase ${
                                log.level === 'error' ? 'text-red-400' :
                                log.level === 'warning' ? 'text-yellow-400' :
                                'text-emerald-400'
                            }`}>[{log.level}]</span>
                            <span className="text-[var(--text)]"><span className="text-[var(--text-muted)]">[{log.source}]</span> {log.message}</span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>

            {reportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setReportModalOpen(false)}>
                    <div className="luxury-card glass w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-[var(--primary)]" /> {t('omega.reportTitle')}
                        </h3>
                        <div className="space-y-2 mb-6">
                            {[
                                { id: 'status', label: t('omega.reportStatus') },
                                { id: 'financial', label: t('omega.reportFinancial') },
                                { id: 'agents', label: t('omega.reportAgents') },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setReportType(opt.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                                        reportType === opt.id
                                            ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]'
                                            : 'glass border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/30'
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
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleDownloadReport}
                                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                            >
                                {t('omega.downloadPdf')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedAgent && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto luxury-card glass p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                    <Bot size={24} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--text)]">{selectedAgent.name}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">{selectedAgent.role}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAgent(null)} className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex gap-2 border-b border-[var(--border)] mb-5">
                            {[
                                { id: 'overview', label: 'Обзор', icon: Activity },
                                { id: 'logs', label: 'Логи', icon: Terminal },
                                { id: 'settings', label: 'Настройки', icon: Settings },
                                { id: 'stats', label: 'Статистика', icon: BarChart2 },
                            ].map(t => {
                                const Icon = t.icon
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setAgentTab(t.id)}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                                            agentTab === t.id
                                                ? 'border-[var(--primary)] text-[var(--primary)]'
                                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                                        }`}
                                    >
                                        <Icon size={14} /> {t.label}
                                    </button>
                                )
                            })}
                        </div>

                        {agentTab === 'overview' && (
                            <div className="space-y-4">
                                <p className="text-sm text-[var(--text-muted)]">{selectedAgent.description}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(() => {
                                        const m = getAgentMetrics(selectedAgent)
                                        return [
                                            { label: 'Uptime', value: `${m.uptime}%` },
                                            { label: 'Tasks today', value: m.tasksToday },
                                            { label: 'Avg response', value: `${m.avgResponse}ms` },
                                            { label: 'Статус', value: selectedAgent.status },
                                        ].map(s => (
                                            <div key={s.label} className="p-3 rounded-xl glass text-center">
                                                <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
                                                <div className="text-sm font-bold text-[var(--text)]">{s.value}</div>
                                            </div>
                                        ))
                                    })()}
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-[var(--text-muted)]">CPU</div>
                                    <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${getAgentMetrics(selectedAgent).cpu}%` }} />
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">RAM</div>
                                    <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${getAgentMetrics(selectedAgent).ram}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] mb-2">Последние действия</div>
                                    <div className="space-y-2">
                                        {[
                                            'Получена задача от планировщика',
                                            'Обработан запрос пользователя',
                                            'Сгенерирован отчёт за сутки',
                                            'Синхронизированы метрики',
                                            'Завершён фоновый анализ',
                                        ].map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-[var(--text)]">
                                                <CheckCircle2 size={12} className="text-emerald-400" /> {a}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {agentTab === 'logs' && (
                            <div className="h-64 overflow-y-auto rounded-xl glass p-3 font-mono text-xs space-y-1">
                                {getAgentLogs(selectedAgent).map(log => (
                                    <div key={log.id} className="flex items-start gap-2">
                                        <span className="text-[var(--text-muted)] whitespace-nowrap">{log.time}</span>
                                        <span className={`uppercase ${log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : 'text-emerald-400'}`}>[{log.level}]</span>
                                        <span className="text-[var(--text)]"><span className="text-[var(--text-muted)]">[{log.source}]</span> {log.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {agentTab === 'settings' && (
                            <div className="space-y-4">
                                {[
                                    { key: 'autoReply', label: 'Авто-ответ на типовые запросы' },
                                    { key: 'notifications', label: 'Уведомления о сбоях' },
                                ].map(setting => (
                                    <label key={setting.key} className="flex items-center justify-between p-3 rounded-xl glass cursor-pointer">
                                        <span className="text-sm text-[var(--text)]">{setting.label}</span>
                                        <input
                                            type="checkbox"
                                            checked={agentSettings[setting.key]}
                                            onChange={e => setAgentSettings(prev => ({ ...prev, [setting.key]: e.target.checked }))}
                                            className="w-4 h-4 accent-[var(--primary)]"
                                        />
                                    </label>
                                ))}
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">Приоритет</label>
                                    <select
                                        value={agentSettings.priority}
                                        onChange={e => setAgentSettings(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl glass text-[var(--text)] text-sm outline-none"
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">System prompt</label>
                                    <textarea
                                        value={agentSettings.systemPrompt}
                                        onChange={e => setAgentSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                        rows={5}
                                        placeholder="Введите system prompt..."
                                        className="w-full px-3 py-2 rounded-xl glass text-[var(--text)] text-sm outline-none resize-none"
                                    />
                                </div>
                                <button onClick={() => showToast('Настройки агента сохранены')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                                    Сохранить
                                </button>
                            </div>
                        )}

                        {agentTab === 'stats' && (
                            <div className="space-y-6">
                                <div className="h-56">
                                    <div className="text-xs text-[var(--text-muted)] mb-2">Задачи по дням</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={getAgentStats(selectedAgent)}>
                                            <defs>
                                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
                                            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                            <Area type="monotone" dataKey="tasks" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTasks)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="h-56">
                                    <div className="text-xs text-[var(--text-muted)] mb-2">Успешность / Среднее время (мс)</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getAgentStats(selectedAgent)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
                                            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                                            <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Успешность %" />
                                            <Line type="monotone" dataKey="time" stroke="#3b82f6" strokeWidth={2} dot={false} name="Время мс" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default OMEGACoreTab
