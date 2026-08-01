import { useEffect, useState } from 'react'
import { Trophy, Clock, History, Loader2, Flame, Cpu, User } from 'lucide-react'
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

function formatTimeLeft(endAt) {
    if (!endAt) return '—'
    const diff = new Date(endAt).getTime() - Date.now()
    if (diff <= 0) return 'Голосование завершено'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}ч ${mins}м`
}

export function AIvsHumanPage() {
    const [round, setRound] = useState(null)
    const [archive, setArchive] = useState([])
    const [stats, setStats] = useState(null)
    const [humanPost, setHumanPost] = useState('')
    const [loading, setLoading] = useState(true)
    const [voting, setVoting] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const load = async () => {
        setLoading(true)
        try {
            const [currentRes, archiveRes, statsRes] = await Promise.all([
                api('/gamification/aivshuman/current'),
                api('/gamification/aivshuman/archive'),
                api('/gamification/aivshuman/stats'),
            ])
            setRound(currentRes.data)
            setArchive(archiveRes.data || [])
            setStats(statsRes.data || null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const vote = async (choice) => {
        if (!round?._id) return
        setVoting(true)
        try {
            await api('/gamification/aivshuman/vote', {
                method: 'POST',
                body: JSON.stringify({ roundId: round._id, choice }),
            })
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setVoting(false)
        }
    }

    const submitHumanPost = async () => {
        if (!round?._id || !humanPost.trim()) return
        setSubmitting(true)
        try {
            await api('/gamification/aivshuman/human-post', {
                method: 'POST',
                body: JSON.stringify({ roundId: round._id, humanPost: humanPost.trim() }),
            })
            setHumanPost('')
            await load()
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const endAt = round?.startedAt
        ? new Date(new Date(round.startedAt).getTime() + 48 * 60 * 60 * 1000).toISOString()
        : null

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Cpu className="text-purple-400" size={28} />
                    AI vs Human Challenge
                </h1>
                <p className="text-sm text-gray-400 mt-1">Каждую неделю OMEGA соревнуется с человеком в создании вирусного контента.</p>
            </div>

            {error && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 text-center">
                        <div className="text-2xl font-bold text-white">{stats.aiWins}</div>
                        <div className="text-xs text-gray-500">Побед AI</div>
                    </div>
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 text-center">
                        <div className="text-2xl font-bold text-white">{stats.humanWins}</div>
                        <div className="text-xs text-gray-500">Побед Human</div>
                    </div>
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 text-center">
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-xs text-gray-500">Раундов</div>
                    </div>
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-2xl font-bold text-white">
                            {stats.aiChampion ? <Flame size={20} className="text-orange-400" /> : null}
                            {stats.aiChampion ? 'AI' : stats.humanChampion ? 'Human' : '—'}
                        </div>
                        <div className="text-xs text-gray-500">Чемпион</div>
                    </div>
                </div>
            )}

            {/* Current round */}
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400 font-medium">
                        <Trophy size={18} />
                        Текущий раунд
                    </div>
                    {round?.status === 'active' && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={14} />
                            {formatTimeLeft(endAt)}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center gap-3 text-sm text-gray-400 py-8">
                        <Loader2 size={18} className="animate-spin" /> Загрузка раунда...
                    </div>
                ) : round ? (
                    <>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Тема недели</div>
                            <div className="text-white font-medium">{round.theme}</div>
                        </div>

                        {round.status === 'active' ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                                    <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
                                        <Cpu size={16} /> Вариант A
                                    </div>
                                    <p className="text-sm text-white whitespace-pre-line">{round.aiPost || 'AI ещё генерирует пост...'}</p>
                                    <button
                                        onClick={() => vote('ai')}
                                        disabled={voting}
                                        className="mt-4 w-full py-2 rounded-xl bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                                    >
                                        {voting ? 'Голосование...' : 'Голосовать за A'}
                                    </button>
                                </div>

                                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                                    <div className="flex items-center gap-2 text-sm text-emerald-400 mb-2">
                                        <User size={16} /> Вариант B
                                    </div>
                                    {round.humanPost ? (
                                        <>
                                            <p className="text-sm text-white whitespace-pre-line">{round.humanPost}</p>
                                            <button
                                                onClick={() => vote('human')}
                                                disabled={voting}
                                                className="mt-4 w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {voting ? 'Голосование...' : 'Голосовать за B'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <textarea
                                                value={humanPost}
                                                onChange={e => setHumanPost(e.target.value)}
                                                placeholder="Напишите свой пост на эту тему..."
                                                className="w-full h-32 bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/30 resize-none"
                                            />
                                            <button
                                                onClick={submitHumanPost}
                                                disabled={submitting || !humanPost.trim()}
                                                className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {submitting ? 'Отправка...' : 'Отправить human-пост'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 text-center text-sm text-gray-400">
                                Раунд завершён. Победитель: <span className="text-white font-medium">{round.winner === 'ai' ? 'AI' : round.winner === 'human' ? 'Human' : 'Ничья'}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-sm text-gray-400 py-8 text-center">Нет активного раунда.</div>
                )}
            </div>

            {/* Archive */}
            {archive.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History size={18} className="text-purple-400" /> Архив раундов
                    </h2>
                    <div className="space-y-3">
                        {archive.map(r => (
                            <div key={r._id} className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-white font-medium">{r.theme}</div>
                                    <div className="text-xs text-gray-500">{new Date(r.startedAt).toLocaleDateString('ru-RU')}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-sm font-medium ${r.winner === 'ai' ? 'text-purple-400' : r.winner === 'human' ? 'text-emerald-400' : 'text-gray-400'}`}>
                                        {r.winner === 'ai' ? 'AI' : r.winner === 'human' ? 'Human' : 'Ничья'}
                                    </div>
                                    <div className="text-[10px] text-gray-500">{r.aiVotes} / {r.humanVotes} голосов</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AIvsHumanPage
