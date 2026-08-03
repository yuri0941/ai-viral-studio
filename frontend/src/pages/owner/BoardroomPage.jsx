import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Users, Send, Loader2, CheckCircle, XCircle, MinusCircle, Lightbulb,
    AlertTriangle, RefreshCw, Edit3, Check, Crown, TrendingUp, Shield,
    Code, DollarSign, HeartHandshake
} from 'lucide-react'
import { API_URL } from '../../config.js'

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : null
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

const BOARDROOM_AGENTS = [
    { id: 'ceo', name: 'Alex', role: 'CEO', icon: Crown, color: 'text-purple-400', quote: 'Рост выручки и укрепление бренда — приоритет. Риски приемлемы, если есть чёткий пилот.' },
    { id: 'cmo', name: 'Maya', role: 'CMO', icon: TrendingUp, color: 'text-pink-400', quote: 'Каналы готовы: запускаем кампанию с A/B-тестами и отслеживаем CAC первые 7 дней.' },
    { id: 'cto', name: 'Sam', role: 'CTO', icon: Code, color: 'text-blue-400', quote: 'Технически реализуемо за 2 недели. Нужно выделить инфраструктуру под нагрузку.' },
    { id: 'cfo', name: 'Liam', role: 'CFO', icon: DollarSign, color: 'text-emerald-400', quote: 'Бюджет окупается за 3 месяца при текущем LTV. Рекомендую начать с $1000.' },
    { id: 'chro', name: 'Eva', role: 'CHRO', icon: HeartHandshake, color: 'text-amber-400', quote: 'Команда справится, но стоит добавить 1 специалиста поддержки на пилот.' },
]

const VOTE_OPTIONS = [
    { id: 'for', label: 'ЗА', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { id: 'against', label: 'ПРОТИВ', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { id: 'abstain', label: 'Воздержался', icon: MinusCircle, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
]

function buildDemoResult(question) {
    const votes = [
        { agent: 'ceo', vote: 'for' },
        { agent: 'cmo', vote: 'for' },
        { agent: 'cto', vote: 'for' },
        { agent: 'cfo', vote: 'for' },
        { agent: 'chro', vote: 'abstain' },
    ]
    return {
        agents: BOARDROOM_AGENTS.map(a => ({ id: a.id, name: a.name, role: a.role, avatar: '' })),
        rounds: [
            {
                round: 1,
                arguments: BOARDROOM_AGENTS.map(a => ({ agentName: a.name, avatar: a.role.charAt(0), text: a.quote })),
            },
        ],
        votes,
        voteCounts: {
            for: votes.filter(v => v.vote === 'for').length,
            against: votes.filter(v => v.vote === 'against').length,
            abstain: votes.filter(v => v.vote === 'abstain').length,
        },
        recommendation: 'Делать',
        summary: `Консенсус достигнут: 4/5 ЗА. ${question ? `По теме «${question}»` : ''} Рекомендуем запустить пилот на $1000, чтобы проверить гипотезу с минимальными рисками.`,
    }
}

export function BoardroomPage() {
    const [question, setQuestion] = useState('')
    const [category, setCategory] = useState('стратегия')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [isDemo, setIsDemo] = useState(false)
    const [accepted, setAccepted] = useState(false)
    const [revealedCount, setRevealedCount] = useState(0)

    const categories = ['стратегия', 'маркетинг', 'финансы', 'технология', 'команда']

    useEffect(() => {
        if (!result) {
            setRevealedCount(0)
            return
        }
        setRevealedCount(0)
        const interval = setInterval(() => {
            setRevealedCount(c => {
                if (c >= BOARDROOM_AGENTS.length) {
                    clearInterval(interval)
                    return BOARDROOM_AGENTS.length
                }
                return c + 1
            })
        }, 1500)
        return () => clearInterval(interval)
    }, [result])

    const runBoardroom = useCallback(async () => {
        if (!question.trim()) return
        setLoading(true)
        setResult(null)
        setAccepted(false)
        setIsDemo(false)
        try {
            const data = await api('/boardroom/run', {
                method: 'POST',
                body: JSON.stringify({ question, category }),
            })
            setResult(data)
        } catch (err) {
            console.warn('[BoardroomPage] backend failed, using demo:', err.message)
            setResult(buildDemoResult(question))
            setIsDemo(true)
        } finally {
            setLoading(false)
        }
    }, [question, category])

    const revote = useCallback(() => {
        setResult(null)
        setAccepted(false)
        setRevealedCount(0)
    }, [])

    const editRequest = useCallback(() => {
        setResult(null)
        setAccepted(false)
        setRevealedCount(0)
    }, [])

    const acceptRecommendation = useCallback(() => {
        setAccepted(true)
        const task = {
            title: `Решение Boardroom: ${result?.recommendation || 'Пилот'}`,
            description: result?.summary || '',
            source: 'boardroom',
            createdAt: new Date().toISOString(),
        }
        const existing = JSON.parse(localStorage.getItem('boardroom_tasks') || '[]')
        localStorage.setItem('boardroom_tasks', JSON.stringify([task, ...existing]))
    }, [result])

    const voteCounts = useMemo(() => {
        if (!result?.votes) return { for: 0, against: 0, abstain: 0 }
        return {
            for: result.votes.filter(v => v.vote === 'for').length,
            against: result.votes.filter(v => v.vote === 'against').length,
            abstain: result.votes.filter(v => v.vote === 'abstain').length,
        }
    }, [result])

    const total = BOARDROOM_AGENTS.length
    const consensusReached = voteCounts.for > total / 2

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Users className="text-[var(--primary)]" size={28} />
                        🧠 AI Boardroom
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">5 агентов обсуждают ваш запрос и голосуют за решение.</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 space-y-4">
                    <div>
                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Введите тему для обсуждения</label>
                        <textarea
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="Например: Запустить рекламу на $5000"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]/50 resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Категория</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setCategory(c)}
                                    className={`px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                                        category === c
                                            ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                                            : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/30'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={runBoardroom}
                        disabled={loading || !question.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {loading ? 'Совет собирается…' : 'Начать совещание'}
                    </button>
                </div>

                {isDemo && result && (
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} /> Демо-режим: backend недоступен, показаны примерные ответы.
                    </div>
                )}

                {result && (
                    <div className="space-y-6">
                        {/* Agents */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {BOARDROOM_AGENTS.map((agent, idx) => {
                                const Icon = agent.icon
                                const vote = result.votes?.find(v => v.agent === agent.id)
                                const revealed = idx < revealedCount
                                return (
                                    <div key={agent.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center transition-all hover:scale-[1.02]">
                                        <div className={`w-12 h-12 mx-auto rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mb-3`}>
                                            <Icon size={20} className={agent.color} />
                                        </div>
                                        <div className="text-sm text-[var(--text)] font-medium">{agent.name}</div>
                                        <div className="text-[10px] text-[var(--text-muted)]">{agent.role}</div>
                                        {!revealed ? (
                                            <div className="mt-3 flex items-center justify-center gap-0.5 text-xs text-[var(--text-muted)]">
                                                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                                                <span className="ml-1">Думает…</span>
                                            </div>
                                        ) : (
                                            <div className="mt-3">
                                                <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1">
                                                    <Check size={10} /> Высказался
                                                </div>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">{agent.quote}</p>
                                                {vote && (
                                                    <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                                                        {VOTE_OPTIONS.find(v => v.id === vote.vote)?.icon && (
                                                            <span className={VOTE_OPTIONS.find(v => v.id === vote.vote).color}>
                                                                {/* eslint-disable-next-line no-undef */}
                                                                {(() => {
                                                                    const V = VOTE_OPTIONS.find(v => v.id === vote.vote).icon
                                                                    return <V size={14} />
                                                                })()}
                                                            </span>
                                                        )}
                                                        <span className={VOTE_OPTIONS.find(v => v.id === vote.vote)?.color || ''}>
                                                            {VOTE_OPTIONS.find(v => v.id === vote.vote)?.label}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Voting */}
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                                <Shield size={18} className="text-[var(--primary)]" /> Голосование
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {VOTE_OPTIONS.map(option => {
                                    const Icon = option.icon
                                    const count = voteCounts[option.id]
                                    return (
                                        <div key={option.id} className={`p-4 rounded-xl border text-center ${option.bg}`}>
                                            <Icon size={20} className={`mx-auto mb-2 ${option.color}`} />
                                            <div className="text-2xl font-bold text-[var(--text)]">{count}</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">{option.label}</div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className={`p-4 rounded-xl border ${consensusReached ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}>
                                <div className="text-sm font-medium text-[var(--text)]">
                                    {consensusReached
                                        ? `Консенсус достигнут: ${voteCounts.for}/${total} ЗА`
                                        : `Требуется доработка: ${voteCounts.against}/${total} ПРОТИВ`}
                                </div>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
                            <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2 mb-3">
                                <Lightbulb size={18} className="text-[var(--primary)]" /> Рекомендация OMEGA
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">{result.summary || 'Рекомендуем запустить пилот на $1000'}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={acceptRecommendation}
                                disabled={accepted}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                                <Check size={16} /> {accepted ? 'Принято' : '✅ Принять рекомендацию'}
                            </button>
                            <button
                                onClick={revote}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors"
                            >
                                <RefreshCw size={16} /> 🔄 Переголосовать
                            </button>
                            <button
                                onClick={editRequest}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors"
                            >
                                <Edit3 size={16} /> 📝 Редактировать запрос
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BoardroomPage
