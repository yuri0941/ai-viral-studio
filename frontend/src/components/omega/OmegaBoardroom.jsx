import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, MessageSquare, ThumbsUp, ThumbsDown, Minus, CheckCircle, Plus, History, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const VOTE_ICONS = {
    for: <ThumbsUp className="w-3.5 h-3.5" />,
    against: <ThumbsDown className="w-3.5 h-3.5" />,
    abstain: <Minus className="w-3.5 h-3.5" />,
}

function VoteBadge({ vote }) {
    const { t } = useTranslation()
    const colors = {
        for: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        against: 'bg-red-500/20 text-red-400 border-red-500/30',
        abstain: 'bg-white/10 text-[var(--text-muted)] border-white/10',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs border flex items-center gap-1 ${colors[vote] || colors.abstain}`}>
            {VOTE_ICONS[vote]} {t(`boardroom.votes.${vote}`)}
        </span>
    )
}

export default function OmegaBoardroom() {
    const { t } = useTranslation()
    const AGENTS = [
        { id: 'ceo', name: t('boardroom.agents.ceo.name'), role: t('boardroom.agents.ceo.role'), stance: t('boardroom.agents.ceo.stance'), color: 'from-violet-600 to-fuchsia-600' },
        { id: 'cmo', name: t('boardroom.agents.cmo.name'), role: t('boardroom.agents.cmo.role'), stance: t('boardroom.agents.cmo.stance'), color: 'from-pink-600 to-rose-600' },
        { id: 'cto', name: t('boardroom.agents.cto.name'), role: t('boardroom.agents.cto.role'), stance: t('boardroom.agents.cto.stance'), color: 'from-cyan-600 to-blue-600' },
        { id: 'cfo', name: t('boardroom.agents.cfo.name'), role: t('boardroom.agents.cfo.role'), stance: t('boardroom.agents.cfo.stance'), color: 'from-emerald-600 to-teal-600' },
        { id: 'chro', name: t('boardroom.agents.chro.name'), role: t('boardroom.agents.chro.role'), stance: t('boardroom.agents.chro.stance'), color: 'from-amber-600 to-orange-600' },
    ]
    const [topic, setTopic] = useState('')
    const [rounds, setRounds] = useState([])
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const loadHistory = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/boardroom/history`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed')
            const json = await res.json()
            setHistory(json.data || [])
        } catch (err) {
            console.error('[OmegaBoardroom history]', err.message)
        }
    }

    useEffect(() => { loadHistory() }, [])

    const runRound = async () => {
        if (!topic.trim()) return
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/boardroom/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ question: topic, category: 'стратегия' }),
            })
            if (!res.ok) throw new Error('Failed')
            const json = await res.json()
            const opinions = (json.opinions || AGENTS.map(a => ({
                agent: a.id,
                role: a.role,
                stance: 'abstain',
                argument: t('boardroom.defaultArgument'),
            })))
            const newRound = {
                topic,
                createdAt: new Date().toISOString(),
                opinions,
                votes: {},
                approved: false,
            }
            setRounds(prev => [newRound, ...prev])
            setTopic('')
            await loadHistory()
        } catch (err) {
            console.error('[OmegaBoardroom run]', err.message)
        } finally {
            setLoading(false)
        }
    }

    const setVote = (roundIndex, agentId, vote) => {
        setRounds(prev => prev.map((r, i) => {
            if (i !== roundIndex) return r
            const votes = { ...r.votes, [agentId]: vote }
            const forCount = Object.values(votes).filter(v => v === 'for').length
            return { ...r, votes, approved: forCount >= 4 }
        }))
    }

    const createTask = (round) => {
        alert(t('boardroom.taskCreated', { topic: round.topic }))
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-[var(--primary)]" />
                        {t('boardroom.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{t('boardroom.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-sm"
                >
                    <History className="w-4 h-4" /> {showHistory ? t('boardroom.hideHistory') : t('boardroom.showHistory')}
                </button>
            </div>

            <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-3">
                <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder={t('boardroom.topicPlaceholder')}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
                />
                <button
                    type="button"
                    onClick={runRound}
                    disabled={loading || !topic.trim()}
                    className="px-5 py-3 min-h-[44px] rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    {t('boardroom.startRound')}
                </button>
            </div>

            {showHistory && (
                <div className="glass-card rounded-2xl p-4 space-y-3">
                    <h3 className="font-semibold">{t('boardroom.historyTitle')}</h3>
                    {history.length ? history.map((h, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/5 text-sm">
                            <span className="text-[var(--text-muted)]">{new Date(h.createdAt).toLocaleDateString('ru-RU')}</span>
                            <p className="mt-1">{h.question || h.topic}</p>
                        </div>
                    )) : (
                        <p className="text-sm text-[var(--text-muted)]">{t('boardroom.emptyHistory')}</p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {AGENTS.map(agent => (
                    <div key={agent.id} className="glass-card rounded-2xl p-4 flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-lg font-bold shadow-lg`}>
                            {agent.name.split(' ')[0][0]}
                        </div>
                        <h4 className="font-semibold mt-3">{agent.name}</h4>
                        <p className="text-xs text-[var(--text-muted)]">{agent.role}</p>
                        <span className="mt-2 px-2 py-0.5 rounded-full bg-white/10 text-[10px]">{agent.stance}</span>
                        <span className="mt-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {rounds.map((round, idx) => {
                    const forCount = Object.values(round.votes).filter(v => v === 'for').length
                    return (
                        <div key={idx} className="glass-card rounded-2xl p-5 animate-fade-in-up">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">{round.topic}</h3>
                                {round.approved && (
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/30 flex items-center gap-1">
                                        <CheckCircle className="w-3.5 h-3.5" /> {t('boardroom.approved', { count: forCount })}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                {round.opinions.map((op, i) => {
                                    const agent = AGENTS.find(a => a.id === op.agent) || AGENTS[i]
                                    const vote = round.votes[op.agent] || 'abstain'
                                    return (
                                        <div key={i} className="p-3 rounded-xl bg-white/5 text-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{agent?.name || op.role}</span>
                                                <VoteBadge vote={vote} />
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">{op.argument}</p>
                                            <div className="flex gap-2">
                                                {['for', 'against', 'abstain'].map(v => (
                                                    <button
                                                        key={v}
                                                        type="button"
                                                        onClick={() => setVote(idx, op.agent, v)}
                                                        className={`flex-1 py-1.5 min-h-[44px] rounded-lg text-xs border transition-colors ${
                                                            vote === v
                                                                ? v === 'for' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                                                : v === 'against' ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                                                : 'bg-white/10 border-white/20'
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {t(`boardroom.votes.${v}`)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {round.approved && (
                                <button
                                    type="button"
                                    onClick={() => createTask(round)}
                                    className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> {t('boardroom.createTask')}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
