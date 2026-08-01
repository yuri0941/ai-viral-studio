import { useState } from 'react'
import { Users, Send, Loader2, CheckCircle, XCircle, MinusCircle, Briefcase, Lightbulb, AlertTriangle, Clock } from 'lucide-react'
import { API_URL } from '../../config.js'

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers,
        },
        ...options,
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
    }
    return res.json()
}

const CATEGORIES = [
    { id: 'стратегия', label: 'Стратегия' },
    { id: 'маркетинг', label: 'Маркетинг' },
    { id: 'финансы', label: 'Финансы' },
    { id: 'технология', label: 'Технология' },
    { id: 'команда', label: 'Команда' },
]

const VOTE_ICONS = {
    for: <CheckCircle size={16} className="text-emerald-400" />,
    against: <XCircle size={16} className="text-rose-400" />,
    abstain: <MinusCircle size={16} className="text-gray-400" />,
}

export function BoardroomPage() {
    const [question, setQuestion] = useState('')
    const [category, setCategory] = useState('стратегия')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [accepted, setAccepted] = useState(false)

    const runBoardroom = async () => {
        if (!question.trim()) return
        setLoading(true)
        setError(null)
        setResult(null)
        setAccepted(false)
        try {
            const data = await api('/boardroom/run', {
                method: 'POST',
                body: JSON.stringify({ question, category }),
            })
            setResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const acceptRecommendation = () => {
        setAccepted(true)
        const task = {
            title: `Решение Boardroom: ${result.recommendation}`,
            description: result.summary,
            source: 'boardroom',
            createdAt: new Date().toISOString(),
        }
        const existing = JSON.parse(localStorage.getItem('boardroom_tasks') || '[]')
        localStorage.setItem('boardroom_tasks', JSON.stringify([task, ...existing]))
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="text-purple-400" size={28} />
                    Совет директоров OMEGA
                </h1>
                <p className="text-sm text-gray-400 mt-1">5 агентов проведут дебаты и проголосуют по вашему вопросу.</p>
            </div>

            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6 space-y-4">
                <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">Вопрос для совета директоров</label>
                    <textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Например: Открывать ли новое направление — кофейни?"
                        rows={3}
                        className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30 resize-none"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">Категория</label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCategory(c.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
                                    category === c.id
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={runBoardroom}
                    disabled={loading || !question.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {loading ? 'Совет собирается...' : 'Запустить Boardroom'}
                </button>
            </div>

            {error && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-6">
                    {/* Agents */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {result.agents?.map(agent => {
                            const vote = result.votes?.find(v => v.agent === agent.id)
                            return (
                                <div key={agent.id} className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 text-center">
                                    <div className="text-2xl mb-2">{agent.avatar}</div>
                                    <div className="text-sm text-white font-medium">{agent.name}</div>
                                    <div className="text-[10px] text-gray-500">{agent.role}</div>
                                    {vote && (
                                        <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                                            {VOTE_ICONS[vote.vote]}
                                            <span className={vote.vote === 'for' ? 'text-emerald-400' : vote.vote === 'against' ? 'text-rose-400' : 'text-gray-400'}>
                                                {vote.vote === 'for' ? 'ЗА' : vote.vote === 'against' ? 'ПРОТИВ' : 'Воздерж.'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Debates */}
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Lightbulb size={18} className="text-purple-400" /> Дебаты
                        </h2>
                        {result.rounds?.map((round, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="text-xs text-gray-500 font-medium">Раунд {round.round}</div>
                                <div className="space-y-2">
                                    {round.arguments?.map((arg, i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <div className="text-lg">{arg.avatar}</div>
                                            <div>
                                                <div className="text-xs text-purple-400 font-medium">{arg.agentName}</div>
                                                <div className="text-sm text-white mt-0.5">{arg.text}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Result */}
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <AlertTriangle size={18} className="text-yellow-400" /> Итоговое решение
                            </h2>
                            <div className={`px-3 py-1 rounded-xl text-xs font-medium ${
                                result.recommendation === 'Делать' ? 'bg-emerald-500/10 text-emerald-400' :
                                result.recommendation === 'Не делать' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-gray-500/10 text-gray-400'
                            }`}>
                                {result.recommendation}
                            </div>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{result.summary}</p>
                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-400" /> {result.voteCounts?.for || 0} ЗА</span>
                            <span className="flex items-center gap-1"><XCircle size={12} className="text-rose-400" /> {result.voteCounts?.against || 0} ПРОТИВ</span>
                            <span className="flex items-center gap-1"><MinusCircle size={12} className="text-gray-400" /> {result.voteCounts?.abstain || 0} Возд.</span>
                        </div>
                        {result.recommendation === 'Делать' && !accepted && (
                            <button
                                onClick={acceptRecommendation}
                                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
                            >
                                <Briefcase size={16} /> Принять рекомендацию
                            </button>
                        )}
                        {accepted && (
                            <div className="mt-5 text-sm text-emerald-400 flex items-center gap-2">
                                <CheckCircle size={16} /> Рекомендация принята. Задача создана в локальном хранилище.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default BoardroomPage
