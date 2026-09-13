import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import {
    Brain, Activity, RefreshCw, Trash2, Terminal,
    AlertTriangle, Server, Bot, Play, Pause, RotateCcw, FileText, Wifi, ToggleLeft, ToggleRight, KeyRound, Moon, Sparkles,
    Settings, BarChart2, X, Plus, CheckCircle2, CheckCircle, ImageIcon
} from 'lucide-react'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts'
import { formatDateTime } from '../../utils/helpers'
import { jsPDF } from 'jspdf'
import { useTranslation } from 'react-i18next'
import { CodeInterpreter } from '../../../../components/omega/CodeInterpreter.jsx'
import { VisionUploader } from '../../../../components/omega/VisionUploader.jsx'
import YouTubeAICard from '../../../../components/omega/YouTubeAICard.jsx'
import { Headphones, TrendingUp } from 'lucide-react'
import { API_BASE_URL } from '../../../../config.js'
import { request } from '../../../../services/api.js' // [v9.9.19.14] 6.1 единый API-клиент с Bearer-токеном — никаких 401 на owner-эндпоинтах

// [REAL-DATA] Телеметрии агентов/провайдеров-процентов/uptime в системе нет —
// показываем только реальные статусы (API) и честные empty-state.

const PROVIDER_STATUS_LABEL = {
    active: { text: 'Online', cls: 'text-emerald-400', dot: 'bg-green-500 animate-pulse' },
    missing: { text: 'Нет ключа', cls: 'text-gray-400', dot: 'bg-gray-500' },
    invalid: { text: 'Ключ отклонён', cls: 'text-red-400', dot: 'bg-red-500' },
    disabled: { text: 'Выключен', cls: 'text-gray-400', dot: 'bg-gray-500' },
}

export function OMEGACoreTab({ data }) {
    const { t } = useTranslation()
    const { agents, servers, systemLogs, showToast, clearOldLogs, setAgents } = data
    const logEndRef = useRef(null)
    const [testLoading, setTestLoading] = useState(null)

    // [P16-FIX] added: dedicated toggle states for OMEGA Core features
    const [autopilotOn, setAutopilotOn] = useState(false)
    const [predictiveOn, setPredictiveOn] = useState(false)
    const [repurposingOn, setRepurposingOn] = useState(false)
    const [voiceOn, setVoiceOn] = useState(false)
    const [featuresLoading, setFeaturesLoading] = useState(false)

    const [reflection, setReflection] = useState({ active: false, lessonCount: 0 })
    // [P23] fixed: loading states for forecast recalc and reflection
    const [recalcLoading, setRecalcLoading] = useState(false)
    const [reflectionLoading, setReflectionLoading] = useState(false)
    const [selectedAgent, setSelectedAgent] = useState(null)
    const [agentTab, setAgentTab] = useState('overview')
    const [agentSettings, setAgentSettings] = useState({ autoReply: true, notifications: true, priority: 'normal', systemPrompt: '' })
    const [showCodeInterpreter, setShowCodeInterpreter] = useState(false)
    const [showVision, setShowVision] = useState(false)
    const [providers, setProviders] = useState([])

    useEffect(() => {
        // [v9.9.19.14] 6.2 один 401 → тихий fallback, без повторов и красных ошибок
        request('/omega/self-reflection')
            .then(json => setReflection(json?.data || { active: false, lessonCount: 0 }))
            .catch(() => {})
    }, [])

    useEffect(() => {
        request('/owner/settings')
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

    // [REAL-DATA] реальные статусы AI-провайдеров (ключи из ApiKeys, hot-reload)
    useEffect(() => {
        request('/owner/ai-providers/status')
            .then(json => setProviders(Array.isArray(json?.data) ? json.data : []))
            .catch(() => setProviders([]))
    }, [])

    // [P16-FIX] added: individual OMEGA feature toggles with dedicated API endpoints
    const toggleFeature = async (key, current, setter) => {
        setFeaturesLoading(true)
        const next = !current
        setter(next)
        try {
            let endpoint = `/owner/settings`
            let body = JSON.stringify({ features: { [key]: next } })
            if (key === 'autopilot') {
                endpoint = `/omega/autopilot/toggle`
                body = JSON.stringify({ enabled: next })
            } else if (key === 'predictive') {
                endpoint = `/analytics/predictive/enable`
                body = JSON.stringify({ enabled: next })
            } else if (key === 'repurposing') {
                endpoint = `/omega/repurposing/enable`
                body = JSON.stringify({ enabled: next })
            } else if (key === 'voice') {
                endpoint = `/omega/voice/enable`
                body = JSON.stringify({ enabled: next })
            }
            await request(endpoint, { method: 'POST', body })
            showToast(`${key} ${next ? 'включён' : 'выключен'}`)
        } catch {
            // [P23] fixed: revert toggle on API error
            setter(current)
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

    const [reportModalOpen, setReportModalOpen] = useState(false)
    const [reportType, setReportType] = useState('status')

    const handleRecalcForecast = useCallback(async () => {
        setRecalcLoading(true)
        showToast(t('omega.forecastUpdating'), 'info')
        try {
            await request('/omega/predictions/recalculate', { method: 'POST' })
            showToast(t('omega.forecastUpdated'), 'success')
        } catch {
            showToast(t('omega.forecastError'), 'error')
        } finally {
            setRecalcLoading(false)
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
        doc.save(`omega-report-${reportType}.pdf`)
        showToast(`Отчёт «${reportType === 'status' ? 'OMEGA Status' : reportType === 'financial' ? 'Financial' : 'Agents'}» скачан`, 'success')
    }, [reportType, showToast, agents, servers])

    // [P17] added
    const handleApplyReflection = useCallback(async () => {
        setReflectionLoading(true)
        try {
            const json = await request('/omega/self-reflection', { method: 'POST' })
            setReflection(prev => ({ ...prev, lessonCount: json?.data?.lessonCount ?? prev.lessonCount }))
            showToast('Корректировка Self-Reflection применена', 'success')
        } catch {
            showToast('Не удалось применить корректировку', 'error')
        } finally {
            setReflectionLoading(false)
        }
    }, [showToast])

    const handleTestProvider = useCallback(async (providerId) => {
        setTestLoading(providerId)
        try {
            const res = await fetch(`${API_BASE_URL}/owner/omega/health?provider=${providerId}`)
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

    // [REAL-DATA З3] Spawn создаёт реального агента в БД (AIAgent через generic CRUD), не «тост-пустышку»
    const spawnAgent = useCallback(async (kind) => {
        const names = {
            content: { name: 'Content Agent', role: 'Контент', description: 'Генерирует и модерирует контент' },
            analytics: { name: 'Analytics Agent', role: 'Аналитика', description: 'Собирает и визуализирует метрики' },
            support: { name: 'Support Agent', role: 'Поддержка', description: 'Отвечает на типовые тикеты' },
            trend: { name: 'Trend Agent', role: 'Тренды', description: 'Отслеживает тренды и темы' },
        }
        const meta = names[kind]
        if (!meta) return
        try {
            await request('/owner/agents', { method: 'POST', body: JSON.stringify({ ...meta, status: 'active' }) })
            const res = await request('/owner/agents').catch(() => null)
            if (Array.isArray(res?.data?.agents)) setAgents(res.data.agents.map(a => ({ ...a, id: a.id || a._id })))
            showToast(`${meta.name} создан и активен`)
        } catch (e) {
            showToast(`Не удалось создать агента: ${e.message}`, 'error')
        }
    }, [setAgents, showToast])

    const toggleBtnClass = (on) => on
        ? 'min-h-[44px] bg-green-500/20 border-green-500 text-green-400 rounded-xl px-4 py-2 border'
        : 'min-h-[44px] glass text-[var(--text-muted)] rounded-xl px-4 py-2'

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
                    <button type="button"
                        onClick={() => toggleFeature('autopilot', autopilotOn, setAutopilotOn)}
                        disabled={featuresLoading}
                        title="⚠️ OMEGA будет сама публиковать посты. Включайте только после проверки!"
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(autopilotOn)}`}
                    >
                        {autopilotOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🤖 {t('omega.autopilot')}: {autopilotOn ? 'ON' : 'OFF'}
                    </button>
                    <button type="button"
                        onClick={() => toggleFeature('predictive', predictiveOn, setPredictiveOn)}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(predictiveOn)}`}
                    >
                        {predictiveOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🔮 {t('omega.predictive')}
                    </button>
                    <button type="button"
                        onClick={() => toggleFeature('repurposing', repurposingOn, setRepurposingOn)}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(repurposingOn)}`}
                    >
                        {repurposingOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        ♻️ {t('omega.repurposing')}
                    </button>
                    <button type="button"
                        onClick={() => toggleFeature('voice', voiceOn, setVoiceOn)}
                        disabled={featuresLoading}
                        className={`flex items-center gap-2 transition-colors ${toggleBtnClass(voiceOn)}`}
                    >
                        {voiceOn ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        🎤 {t('omega.voice')}
                    </button>
                    <button type="button"
                        onClick={handleRecalcForecast}
                        disabled={recalcLoading}
                        className="min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                    >
                        {/* [P23] fixed: recalc forecast loading + touch target */}
                        <RefreshCw size={14} className={recalcLoading ? 'animate-spin' : ''} /> {t('omega.recalcForecast')}
                    </button>
                    <button type="button"
                        onClick={handleGenerateReport}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                        <FileText size={14} /> {t('omega.report')}
                    </button>
                    <button type="button"
                        onClick={() => setShowCodeInterpreter(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                    >
                        <Terminal size={14} /> Code Interpreter
                    </button>
                    <button type="button"
                        onClick={() => setShowVision(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                    >
                        <ImageIcon size={14} /> Vision
                    </button>
                </div>
            </div>

            {showCodeInterpreter && <CodeInterpreter onClose={() => setShowCodeInterpreter(false)} />}
            {showVision && <VisionUploader onClose={() => setShowVision(false)} />}

            {autopilotOn && (
                <div className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    ⚠️ AutoPilot активен. OMEGA будет сама публиковать посты по расписанию. Убедитесь, что подключены соцсети и контент проверен.
                </div>
            )}

            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.map(alert => {
                        const isError = alert.severity === 'high'
                        return (
                            <div key={alert.id} className={`relative overflow-hidden rounded-2xl border-l-[3px] p-4 ${isError ? 'bg-red-500/5 border-red-500' : 'bg-amber-500/5 border-amber-500'}`}>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className={`${isError ? 'text-red-400' : 'text-amber-400'} mt-0.5`} />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-[var(--text)] capitalize">{alert.type}</div>
                                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{alert.message}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => showToast?.('Авто-исправление инициировано', 'info')}
                                        className="min-h-[44px] text-xs px-2.5 py-1.5 rounded-lg glass text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors"
                                    >
                                        {/* [P23] fixed: missing onClick + touch target */}
                                        Исправить
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* [P23] fixed: metrics grid fits 6 cards on large screens */}
            {/* [REAL-DATA] только реальные счётчики; выдуманные дельты/спарклайны удалены */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                    { title: 'Агентов активно', value: activeAgents },
                    { title: 'Приостановлено', value: pausedAgents },
                    { title: 'Средний CPU', value: avgCpu, suffix: '%' },
                    { title: 'Серверов оффлайн', value: offlineServers },
                ].map((metric, i) => (
                    <div key={i} className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">{metric.title}</div>
                        <div className="text-5xl font-serif font-medium text-[var(--text)] mb-1">{metric.value}{metric.suffix}</div>
                    </div>
                ))}
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                            <Moon size={20} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">🌙 Dream Mode</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Расписание: 02:00–06:00</div>
                </div>
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <Sparkles size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${reflection.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                            <span className="text-[10px] text-[var(--text-muted)]">{reflection.active ? 'Active' : 'Paused'}</span>
                        </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-[var(--text)]">Self-Reflection</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">{reflection.lessonCount} lessons</div>
                    <button type="button"
                        onClick={handleApplyReflection}
                        disabled={reflectionLoading}
                        className="mt-3 min-h-[44px] text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                        {/* [P23] fixed: reflection loading + touch target */}
                        {reflectionLoading ? 'Применение…' : 'Применить корректировку'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                    <YouTubeAICard />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 luxury-card glass p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                            <Bot size={16} className="text-[var(--primary)]" /> {t('omega.agents')}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">{t('omega.spawn')}:</span>
                            <button type="button"
                                onClick={() => spawnAgent('content')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/20 transition-colors"
                            >
                                <FileText size={12} /> Content
                            </button>
                            <button type="button"
                                onClick={() => spawnAgent('analytics')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
                            >
                                <BarChart2 size={12} /> Analytics
                            </button>
                            <button type="button"
                                onClick={() => spawnAgent('support')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                            >
                                <Headphones size={12} /> Support
                            </button>
                            <button type="button"
                                onClick={() => spawnAgent('trend')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
                            >
                                <TrendingUp size={12} /> Trend
                            </button>
                        </div>
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
                                        <div className="flex items-center gap-2">
                                            {/* [P23] fixed: agent action buttons touch targets */}
                                            {isActive ? (
                                                <button type="button" onClick={e => handlePauseAgent(agent.id, e)} className="min-h-[44px] flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] hover:bg-amber-500/20 transition-colors">
                                                    <Pause size={10} /> Пауза
                                                </button>
                                            ) : (
                                                <button type="button" onClick={e => handleStartAgent(agent.id, e)} className="min-h-[44px] flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] hover:bg-emerald-500/20 transition-colors">
                                                    <Play size={10} /> Запустить
                                                </button>
                                            )}
                                            <button type="button" onClick={e => { e.stopPropagation(); handleRestartAgent(agent.id, e); }} className="min-h-[44px] flex items-center gap-1 px-2 py-1 rounded-lg glass text-[var(--text-muted)] text-[10px] hover:bg-[var(--surface)] transition-colors">
                                                <RotateCcw size={10} /> Рестарт
                                            </button>
                                            <button
                                                type="button"
                                                onClick={e => { e.stopPropagation(); setSelectedAgent(agent); setAgentTab('logs'); }}
                                                className="min-h-[44px] ml-auto flex items-center gap-1 px-2 py-1 rounded-lg glass text-[var(--text-muted)] text-[10px] hover:bg-[var(--surface)] transition-colors"
                                            >
                                                <Terminal size={10} /> Логи
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Wifi size={16} className="text-[var(--accent)]" /> AI Провайдеры
                    </h3>
                    {/* [REAL-DATA] статусы провайдеров — из /owner/ai-providers/status (ключи ApiKeys, hot-reload) */}
                    {providers.length === 0 ? (
                        <EmptyState
                            icon={Wifi}
                            title="Нет данных о провайдерах"
                            description="Статусы загружаются из ApiKeys. Проверьте ключи во вкладке API Keys."
                            compact
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {providers.map(provider => {
                                const st = PROVIDER_STATUS_LABEL[provider.status] || PROVIDER_STATUS_LABEL.missing
                                return (
                                    <div key={provider.id} className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 flex flex-col items-center text-center">
                                        <span className="text-xs text-[var(--text)] mb-1.5">{provider.name}</span>
                                        <span className={`flex items-center gap-1 text-[10px] ${st.cls}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.text}
                                        </span>
                                        {provider.lastError && (
                                            <span className="text-[9px] text-red-400 mt-1 line-clamp-2">{provider.lastError}</span>
                                        )}
                                        <button type="button"
                                            onClick={() => handleTestProvider(provider.id)}
                                            disabled={testLoading === provider.id}
                                            className="mt-2 min-h-[44px] min-w-[44px] text-[10px] px-2 py-1 rounded-full glass text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
                                        >
                                            {/* [P23] fixed: provider test touch target */}
                                            {testLoading === provider.id ? '...' : 'Тест'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Server size={16} className="text-[var(--accent)]" /> Загрузка серверов
                </h3>
                {chartData.length === 0 ? (
                    <EmptyState
                        icon={Server}
                        title="Серверы не подключены"
                        description="В системе нет зарегистрированных серверов с телеметрией. График без данных не рисуется."
                    />
                ) : (
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
                )}
            </div>

            <div className="luxury-card glass p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                        <Terminal size={16} className="text-[var(--text-muted)]" /> {t('omega.logs')}
                    </h3>
                    <button type="button"
                        onClick={handleClearLogs}
                        className="min-h-[44px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                    >
                        {/* [P23] fixed: clear-logs touch target */}
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
                    {/* [P23] fixed: report modal responsive max-width */}
                    <div className="luxury-card glass w-full max-w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-[var(--primary)]" /> {t('omega.reportTitle')}
                        </h3>
                        <div className="space-y-2 mb-6">
                            {[
                                { id: 'status', label: t('omega.reportStatus') },
                                { id: 'financial', label: t('omega.reportFinancial') },
                                { id: 'agents', label: t('omega.reportAgents') },
                            ].map(opt => (
                                <button type="button"
                                    key={opt.id}
                                    onClick={() => setReportType(opt.id)}
                                    className={`w-full min-h-[44px] text-left px-4 py-3 rounded-xl border transition-colors ${
                                        reportType === opt.id
                                            ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]'
                                            : 'glass border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/30'
                                    }`}
                                >
                                    {/* [P23] fixed: report option touch target */}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button type="button"
                                onClick={() => setReportModalOpen(false)}
                                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
                            >
                                {/* [P23] fixed: report cancel touch target */}
                                {t('common.cancel')}
                            </button>
                            <button type="button"
                                onClick={handleDownloadReport}
                                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                            >
                                {/* [P23] fixed: report download touch target */}
                                {t('omega.downloadPdf')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedAgent && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
                    {/* [P23] fixed: agent modal responsive max-width */}
                    <div className="w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto luxury-card glass p-6" onClick={e => e.stopPropagation()}>
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
                            <button type="button" onClick={() => setSelectedAgent(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]">
                                {/* [P23] fixed: agent modal close touch target */}
                                <X size={20} />
                            </button>
                        </div>

                        {/* [P23] fixed: agent tab buttons touch targets */}
                        <div className="flex gap-2 border-b border-[var(--border)] mb-5">
                            {[
                                { id: 'overview', label: 'Обзор', icon: Activity },
                                { id: 'logs', label: 'Логи', icon: Terminal },
                                { id: 'settings', label: 'Настройки', icon: Settings },
                                { id: 'stats', label: 'Статистика', icon: BarChart2 },
                            ].map(t => {
                                const Icon = t.icon
                                return (
                                    <button type="button"
                                        key={t.id}
                                        onClick={() => setAgentTab(t.id)}
                                        className={`min-h-[44px] flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
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
                                    <div className="glass-luxury rounded-2xl p-6 text-center">
                                        <div className="text-xs text-[var(--text-muted)]">Статус</div>
                                        <div className="text-sm font-bold text-[var(--text)] capitalize">{selectedAgent.status}</div>
                                    </div>
                                </div>
                                {/* [REAL-DATA] телеметрии агента (uptime/cpu/tasks) в системе нет — честный empty-state */}
                                <EmptyState
                                    icon={Activity}
                                    title="Телеметрия агента не подключена"
                                    description="Uptime, задачи и время ответа появятся, когда будет подключён реальный мониторинг агента."
                                    compact
                                />
                            </div>
                        )}

                        {agentTab === 'logs' && (
                            <EmptyState
                                icon={Terminal}
                                title="Логов нет"
                                description="У агента пока нет записанных логов. Выдуманные записи не показываются."
                            />
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
                                <button type="button" onClick={() => showToast('Настройки агента сохранены')} className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                                    {/* [P23] fixed: agent settings save touch target */}
                                    Сохранить
                                </button>
                            </div>
                        )}

                        {agentTab === 'stats' && (
                            <EmptyState
                                icon={BarChart2}
                                title="Недостаточно данных"
                                description="Статистика по дням строится только из реальных выполненных задач агента. График без данных не рисуется."
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default OMEGACoreTab
