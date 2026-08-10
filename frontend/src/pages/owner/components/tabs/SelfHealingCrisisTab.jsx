import { useEffect, useState } from 'react'
import {
    Shield, Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, HeartCrack,
    MessageSquare, Send, X, Loader2, BrainCircuit, Clock, Server, Database, Zap,
    ChevronDown, ChevronUp, Bell, PauseCircle, PlayCircle
} from 'lucide-react'
import { monitoringApi } from '../../../../services/api.js'
import toast from 'react-hot-toast'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const STATUS_COLORS = {
    active: '#ef4444',
    attention: '#eab308',
    resolved: '#22c55e',
    rejected: '#6b7280',
}

const CRISIS_TYPES = {
    hate_wave: 'Волна хейта',
    misinformation: 'Фейки о бренде',
    competitor_attack: 'Нападение конкурента',
    viral_negative: 'Вирусный негатив',
    other: 'Другое',
}

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-[var(--text)]"><X className="w-5 h-5" /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

export function SelfHealingCrisisTab() {
    const [status, setStatus] = useState(null)
    const [crises, setCrises] = useState([])
    const [crisisStats, setCrisisStats] = useState({ active: 0, attention: 0, resolved: 0, total: 0 })
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)
    const [selectedCrisis, setSelectedCrisis] = useState(null)
    const [autoHeal, setAutoHeal] = useState(true)
    const [togglingAutoHeal, setTogglingAutoHeal] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [sendingReport, setSendingReport] = useState(false)
    const [resolving, setResolving] = useState(false)
    const [rejecting, setRejecting] = useState(false)

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        setLoading(true)
        try {
            const [sh, cr, rep] = await Promise.all([
                monitoringApi.selfHealingStatus(),
                monitoringApi.listCrises(),
                monitoringApi.selfReflectionReport(),
            ])
            setStatus(sh.data)
            setCrises(cr.data?.crises || [])
            setCrisisStats(cr.data?.stats || { active: 0, attention: 0, resolved: 0, total: 0 })
            setReport(rep.data)
            setAutoHeal(sh.data?.autoHeal ?? true)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const toggleAutoHeal = async () => {
        setTogglingAutoHeal(true)
        try {
            const res = await monitoringApi.toggleAutoHeal(!autoHeal)
            setAutoHeal(res.data?.autoHeal)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setTogglingAutoHeal(false)
        }
    }

    const triggerHeal = async () => {
        setLoading(true)
        try {
            await monitoringApi.triggerSelfHeal()
            await loadAll()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resolveCrisis = async (id, response) => {
        setResolving(true)
        try {
            await monitoringApi.resolveCrisis(id, response, ['notify_owner'])
            setSelectedCrisis(null)
            loadAll()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setResolving(false)
        }
    }

    const rejectCrisis = async (id) => {
        setRejecting(true)
        try {
            await monitoringApi.rejectCrisis(id)
            setSelectedCrisis(null)
            loadAll()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setRejecting(false)
        }
    }

    const analyzeDemo = async () => {
        setAnalyzing(true)
        const demo = [
            'Это ужасно, ненавижу ваш сервис',
            'Полный развод, мошенники',
            'Ваш продукт — говно',
            'Конкуренты явно лучше',
            'Никогда не покупайте здесь',
            'Обманули на деньги',
            'Тупая поддержка',
            'Ужасный опыт',
            'Вернуть деньги!',
            'Гниды и жулики',
        ]
        try {
            await monitoringApi.analyzeCrisis({ platform: 'demo', comments: demo })
            loadAll()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setAnalyzing(false)
        }
    }

    const sendReport = async () => {
        setSendingReport(true)
        try {
            await monitoringApi.sendSelfReflectionReport()
            toast.success('Отчёт отправлен в Telegram')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSendingReport(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
                    <Shield className="w-6 h-6 text-[#00ff41]" />
                    Self-Healing + Кризис-центр
                </h2>
                <button type="button" onClick={loadAll} disabled={loading} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[var(--text)]">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Self-Healing Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusCard
                    icon={status?.healthy ? CheckCircle : XCircle}
                    title="Health Check"
                    value={status?.healthy ? 'OK' : 'FAIL'}
                    color={status?.healthy ? 'text-emerald-400' : 'text-red-400'}
                    bg={status?.healthy ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                />
                <StatusCard
                    icon={Database}
                    title="База данных"
                    value={status?.databaseConnected ? 'Подключена' : 'MOCK'}
                    color={status?.databaseConnected ? 'text-emerald-400' : 'text-yellow-400'}
                    bg={status?.databaseConnected ? 'bg-emerald-500/10' : 'bg-yellow-500/10'}
                />
                <StatusCard
                    icon={Zap}
                    title="AI-провайдеры"
                    value={status?.providers?.filter(p => p.status === 'active').length || 0}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <StatusCard
                    icon={Activity}
                    title="Авто-исправлений"
                    value={status?.logs?.length || 0}
                    color="text-purple-400"
                    bg="bg-purple-500/10"
                />
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[#00ff41]" /> Авто-восстановление
                    </h3>
                    <div className="flex items-center gap-3">
                        <button type="button"
                            onClick={toggleAutoHeal}
                            disabled={togglingAutoHeal}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                                autoHeal ? 'bg-[#00ff41] text-black' : 'bg-white/10 text-[var(--text)]'
                            }`}
                        >
                            {autoHeal ? '✅ Авто-восстановление ON' : '⛔ Авто-восстановление OFF'}
                        </button>
                        <button type="button"
                            onClick={triggerHeal}
                            disabled={loading}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-[var(--text)] transition-colors"
                        >
                            Запустить проверку
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-400">
                    Каждые 5 минут OMEGA проверяет AI-провайдеров, MongoDB, диск и память. При падении AI — авто-переключение, при падении MongoDB — MOCK-режим, при высокой нагрузке — алерт владельцу.
                </p>
            </div>

            {/* Log */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#8b5cf6]" /> Лог авто-исправлений
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(status?.logs || []).slice(0, 20).map(log => (
                        <div key={log.id} className="p-3 bg-white/5 rounded-xl border border-[var(--border)] text-sm">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : log.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                <span className="text-[var(--text)] font-medium">{log.action}</span>
                                <span className="text-gray-500 text-xs ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1">{log.problem}</p>
                        </div>
                    ))}
                    {(!status?.logs || status.logs.length === 0) && <p className="text-sm text-gray-500">Лог пуст — всё стабильно.</p>}
                </div>
            </div>

            {/* Crisis Center */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" /> Кризис-центр
                    </h3>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={analyzeDemo} disabled={analyzing} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-[var(--text)] disabled:opacity-50">Тестовый анализ</button>
                        <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400">🔴 {crisisStats.active}</span>
                            <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400">🟡 {crisisStats.attention}</span>
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">🟢 {crisisStats.resolved}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {crises.length === 0 ? (
                        <p className="text-sm text-gray-500">Активных кризисов нет. Подключите соцсети в Интеграциях для мониторинга.</p>
                    ) : (
                        crises.map(c => (
                            <div
                                key={c._id}
                                onClick={() => setSelectedCrisis(c)}
                                className="p-4 bg-white/5 rounded-xl border border-[var(--border)] hover:border-[var(--border)] cursor-pointer transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: STATUS_COLORS[c.status] }} />
                                        <div>
                                            <p className="text-[var(--text)] font-medium text-sm">{CRISIS_TYPES[c.type] || c.type}</p>
                                            <p className="text-xs text-gray-400">{c.platform} — {c.negativeComments} негативных / {c.totalComments} всего</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-lg ${c.status === 'active' ? 'bg-red-500/10 text-red-400' : c.status === 'attention' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {c.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Self-Reflection */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-[#f0883e]" /> Self-Reflection (24ч)
                    </h3>
                    <button type="button" onClick={sendReport} disabled={sendingReport} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-[var(--text)] transition-colors disabled:opacity-50">
                        Отправить отчёт в Telegram
                    </button>
                </div>
                {report ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 text-center">
                            <p className="text-xl font-bold text-red-400">{report.totalErrors}</p>
                            <p className="text-xs text-gray-400">Ошибок</p>
                        </div>
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 text-center">
                            <p className="text-xl font-bold text-blue-400">{report.apiErrors}</p>
                            <p className="text-xs text-gray-400">AI/API</p>
                        </div>
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 text-center">
                            <p className="text-xl font-bold text-yellow-400">{report.dbErrors}</p>
                            <p className="text-xs text-gray-400">БД</p>
                        </div>
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 text-center">
                            <p className="text-xl font-bold text-purple-400">{report.recommendations?.length || 0}</p>
                            <p className="text-xs text-gray-400">Рекомендаций</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">Загрузка отчёта...</p>
                )}
                {(report?.patterns?.length > 0 || report?.recommendations?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-[var(--text)] mb-2">Паттерны</p>
                            {report.patterns.map((p, i) => <p key={i} className="text-xs text-gray-400 py-1">• {p}</p>)}
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text)] mb-2">Рекомендации</p>
                            {report.recommendations.map((r, i) => <p key={i} className="text-xs text-gray-400 py-1">• {r}</p>)}
                        </div>
                    </div>
                )}
            </div>

            {selectedCrisis && (
                <Modal title={`Кризис: ${CRISIS_TYPES[selectedCrisis.type] || selectedCrisis.type}`} onClose={() => setSelectedCrisis(null)}>
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-[var(--border)]">
                            <p className="text-sm text-[var(--text)]">Платформа: <span className="text-gray-400">{selectedCrisis.platform}</span></p>
                            <p className="text-sm text-[var(--text)]">Негативных комментов: <span className="text-red-400">{selectedCrisis.negativeComments}</span></p>
                            <p className="text-sm text-[var(--text)]">Средний сентимент: <span className="text-yellow-400">{selectedCrisis.averageSentiment?.toFixed?.(1) || selectedCrisis.averageSentiment}</span></p>
                            <p className="text-sm text-[var(--text)] mt-2">Предложенный ответ OMEGA:</p>
                            <p className="text-sm text-gray-300 mt-1 bg-black/30 p-3 rounded-xl">{selectedCrisis.suggestedResponse}</p>
                        </div>
                        <textarea
                            defaultValue={selectedCrisis.suggestedResponse}
                            id="crisis-response"
                            rows={4}
                            className="w-full bg-black/30 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm"
                            placeholder="Ваш ответ или ответ OMEGA"
                        />
                        <div className="flex gap-3">
                            <button type="button"
                                onClick={() => resolveCrisis(selectedCrisis._id, document.getElementById('crisis-response').value)}
                                disabled={resolving}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00d936] rounded-xl text-black font-medium text-sm transition-colors disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" /> Одобрить ответ
                            </button>
                            <button type="button"
                                onClick={() => rejectCrisis(selectedCrisis._id)}
                                disabled={rejecting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[var(--text)] text-sm transition-colors disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" /> Отклонить
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

function StatusCard({ icon: Icon, title, value, color, bg }) {
    return (
        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm text-[var(--text)]/80">{title}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    )
}

export default SelfHealingCrisisTab
