import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api.js'
import {
    Building2, Play, Loader2, ChevronDown, ChevronUp,
    CheckCircle2, XCircle, AlertCircle, History
} from 'lucide-react'

const ROLE_COLORS = {
    CEO: 'text-violet-400',
    CMO: 'text-pink-400',
    CTO: 'text-cyan-400',
    CFO: 'text-emerald-400',
    CHRO: 'text-amber-400',
}

const PRIORITY_BADGES = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
}

export default function BoardroomCommandCenter() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()

    if (!['owner', 'admin'].includes(user?.role)) {
        navigate('/dashboard', { replace: true })
        return null
    }

    const [context, setContext] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState(null)
    const [history, setHistory] = useState([])
    const [historyOpen, setHistoryOpen] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('boardroom_history')
        if (saved) {
            try { setHistory(JSON.parse(saved)) } catch {}
        }
    }, [])

    const runMeeting = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/boardroom/run', {
                method: 'POST',
                body: JSON.stringify({ context }),
            })
            setResult(data)
            const entry = { date: new Date().toISOString(), context: context.slice(0, 100), tasks: data.tasks?.length || 0, approved: data.vote?.approved?.length || 0 }
            const next = [entry, ...history].slice(0, 5)
            setHistory(next)
            localStorage.setItem('boardroom_history', JSON.stringify(next))
        } catch (err) {
            setError(err.message || t('boardroom.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const runAutoExecute = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/boardroom/run', {
                method: 'POST',
                body: JSON.stringify({ context }),
            })
            setResult(data)
        } catch (err) {
            setError(err.message || t('boardroom.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Building2 className="w-7 h-7 text-violet-400" />
                    {t('boardroom.title', '🏢 Boardroom — Совет Директоров (Auto-Task)')}
                </h1>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Control Panel */}
                <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                    <h2 className="text-lg font-semibold text-white">{t('boardroom.context', 'Контекст для совета')}</h2>
                    <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder={t('boardroom.placeholder', 'MRR упал на 20%, конкурент запустил новую фичу...')}
                        rows={4}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                    <button
                        onClick={runMeeting}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <Play className="w-4 h-4" />
                        {t('boardroom.runMeeting', 'Запустить заседание совета')}
                    </button>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-6">
                        {/* Tasks */}
                        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-violet-400" />
                                {t('boardroom.tasks', 'Задачи')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {result.tasks?.map((task, i) => (
                                    <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-white/5 hover:border-violet-500/30 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold uppercase ${ROLE_COLORS[task.role] || 'text-gray-400'}`}>{task.role}</span>
                                            <span className="text-sm">{PRIORITY_BADGES[task.priority] || '⚪'}</span>
                                        </div>
                                        <h3 className="text-white font-semibold text-sm mb-1">{task.title}</h3>
                                        <p className="text-gray-400 text-xs mb-2">{task.description}</p>
                                        {task.deadline && <p className="text-gray-500 text-xs">{t('boardroom.deadline', 'Дедлайн')}: {task.deadline}</p>}
                                        {task.expectedOutcome && <p className="text-gray-500 text-xs mt-1">{t('boardroom.expectedOutcome', 'Результат')}: {task.expectedOutcome}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vote */}
                        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-violet-400" />
                                {t('boardroom.vote', 'Голосование')}
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">{t('boardroom.role', 'Роль')}</th>
                                            <th className="px-4 py-3">{t('boardroom.tasks', 'Задача')}</th>
                                            <th className="px-4 py-3">{t('boardroom.vote', 'Голос')}</th>
                                            <th className="px-4 py-3 rounded-r-lg">{t('boardroom.reasoning', 'Обоснование')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.vote?.votes?.map((v, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="px-4 py-3 text-white font-medium">{v.role}</td>
                                                <td className="px-4 py-3 text-gray-300 text-xs">{result.tasks?.[v.taskIndex]?.title}</td>
                                                <td className="px-4 py-3">
                                                    {v.vote === 'approve' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('boardroom.approve', 'Одобрено')}</span>}
                                                    {v.vote === 'reject' && <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> {t('boardroom.reject', 'Отклонено')}</span>}
                                                    {v.vote === 'modify' && <span className="text-yellow-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {t('boardroom.modify', 'Изменить')}</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">{v.reasoning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/50">
                                <div className="text-sm text-gray-300">
                                    <span className="text-emerald-400 font-semibold">✅ {t('boardroom.approved', 'Одобрено')}: {result.vote?.approved?.length || 0}</span>
                                    <span className="mx-3">|</span>
                                    <span className="text-red-400 font-semibold">❌ {t('boardroom.rejected', 'Отклонено')}: {result.vote?.rejected?.length || 0}</span>
                                </div>
                                <button
                                    onClick={runAutoExecute}
                                    disabled={loading || (result.vote?.approved?.length || 0) === 0}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    ▶️ {t('boardroom.autoExecute', 'Авто-выполнить одобренные')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History */}
                <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                    <button
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-violet-400" />
                            <h2 className="text-lg font-semibold text-white">{t('boardroom.history', 'История заседаний')}</h2>
                        </div>
                        {historyOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                    {historyOpen && (
                        <div className="space-y-2">
                            {history.length === 0 && <p className="text-gray-500 text-sm">{t('boardroom.noHistory', 'Нет истории')}</p>}
                            {history.map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 text-sm">
                                    <span className="text-gray-300">{h.context || '—'}</span>
                                    <span className="text-gray-500 text-xs">{new Date(h.date).toLocaleString()} • {h.approved} ✅</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
