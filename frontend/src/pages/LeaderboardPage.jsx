import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config.js'
import {
    Trophy, Medal, Award, Flame, TrendingUp, Filter,
    Crown, Star, ChevronRight, Loader2
} from 'lucide-react'

const PERIODS = [
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'all', label: 'Всё время' },
]

const NICHES = [
    { id: 'all', label: 'Все ниши' },
    { id: 'tech', label: 'Технологии' },
    { id: 'fitness', label: 'Фитнес' },
    { id: 'travel', label: 'Путешествия' },
    { id: 'food', label: 'Еда' },
    { id: 'gaming', label: 'Игры' },
    { id: 'business', label: 'Бизнес' },
]

function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

function Avatar({ name }) {
    return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-sm font-bold text-white">
            {name ? name.charAt(0).toUpperCase() : '?'}
        </div>
    )
}

function PodiumCard({ entry, place, prize }) {
    const gradients = {
        1: 'from-yellow-400 to-amber-600',
        2: 'from-slate-300 to-slate-500',
        3: 'from-orange-300 to-orange-500',
    }
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

    if (!entry) {
        return (
            <div className="glass p-5 rounded-2xl text-center opacity-50">
                <div className="text-3xl mb-2">{medals[place]}</div>
                <p className="text-sm text-[var(--text-muted)]">Пока нет данных</p>
            </div>
        )
    }

    return (
        <div className={`glass p-5 rounded-2xl text-center border border-[var(--border-strong)] relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[place]}`} />
            <div className="text-4xl mb-2">{medals[place]}</div>
            <div className="flex justify-center mb-3">
                <Avatar name={entry.name} />
            </div>
            <p className="text-sm font-medium text-[var(--text)] truncate">{entry.anonymous ? 'Anonymous' : entry.name}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize mb-2">{entry.niche}</p>
            <div className="text-2xl font-bold text-[var(--success)]">{formatNumber(entry.viralScore)}</div>
            <p className="text-xs text-[var(--text-muted)]">Viral Score</p>
            <div className="mt-3 p-2 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20">
                <p className="text-xs text-[var(--success)] font-medium">{prize?.label || `${place} место`}</p>
            </div>
        </div>
    )
}

export default function LeaderboardPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [period, setPeriod] = useState('week')
    const [niche, setNiche] = useState('all')
    const [leaderboard, setLeaderboard] = useState([])
    const [top3, setTop3] = useState([])
    const [myScore, setMyScore] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadLeaderboard()
        loadTop3()
        loadMyScore()
    }, [period, niche])

    async function loadLeaderboard() {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/gamification/leaderboard?period=${period}&niche=${niche}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') {
                setLeaderboard(data.data || [])
            }
        } catch (err) {
            console.warn('[Leaderboard] load failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    async function loadTop3() {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/gamification/leaderboard/top3?period=${period}&niche=${niche}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') {
                setTop3(data.data || [])
            }
        } catch (err) {
            console.warn('[Leaderboard] top3 failed:', err.message)
        }
    }

    async function loadMyScore() {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/gamification/leaderboard/score`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') {
                setMyScore(data.data)
            }
        } catch (err) {
            console.warn('[Leaderboard] my score failed:', err.message)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                        <Trophy className="w-7 h-7 text-[var(--accent-warm)]" />
                        Viral Leaderboard
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Топ-100 креаторов по вирусности. Анонимно по умолчанию.
                    </p>
                </div>
                {myScore && (
                    <div className="glass px-5 py-3 rounded-2xl flex items-center gap-4">
                        <div>
                            <p className="text-xs text-[var(--text-muted)]">Мой Viral Score</p>
                            <p className="text-xl font-bold text-[var(--success)]">{formatNumber(myScore.viralScore)}</p>
                        </div>
                        <div className="h-8 w-px bg-[var(--border)]" />
                        <div>
                            <p className="text-xs text-[var(--text-muted)]">Просмотров за неделю</p>
                            <p className="text-sm font-medium text-[var(--text)]">{formatNumber(myScore.views)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="glass p-4 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-[var(--primary)]" />
                    <span className="text-sm text-[var(--text-muted)]">Период</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {PERIODS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                period === p.id
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="h-6 w-px bg-[var(--border)] hidden md:block" />
                <div className="flex flex-wrap gap-2">
                    {NICHES.map(n => (
                        <button
                            key={n.id}
                            onClick={() => setNiche(n.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                niche === n.id
                                    ? 'bg-[var(--success)]/20 text-[var(--success)]'
                                    : 'glass text-[var(--text-muted)] hover:text-[var(--text)]'
                            }`}
                        >
                            {n.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PodiumCard entry={top3[0]} place={1} prize={top3[0]?.prize} />
                <PodiumCard entry={top3[1]} place={2} prize={top3[1]?.prize} />
                <PodiumCard entry={top3[2]} place={3} prize={top3[2]?.prize} />
            </div>

            {/* Leaderboard Table */}
            <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <TrendingUp size={18} className="text-[var(--success)]" />
                        Топ-100
                    </h2>
                    {loading && <Loader2 size={18} className="animate-spin text-[var(--primary)]" />}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                                <th className="p-4 font-medium">Место</th>
                                <th className="p-4 font-medium">Креатор</th>
                                <th className="p-4 font-medium">Ниша</th>
                                <th className="p-4 font-medium">Просмотры</th>
                                <th className="p-4 font-medium">Лайки</th>
                                <th className="p-4 font-medium">Shares</th>
                                <th className="p-4 font-medium">ER</th>
                                <th className="p-4 font-medium text-right">Viral Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-[var(--text-muted)] text-sm">
                                        Пока нет данных за выбранный период
                                    </td>
                                </tr>
                            )}
                            {leaderboard.map((entry, i) => (
                                <tr key={entry.userId || i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/50 transition-colors">
                                    <td className="p-4">
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                            entry.rank <= 3
                                                ? 'bg-[var(--accent-warm)]/20 text-[var(--accent-warm)]'
                                                : 'text-[var(--text-muted)]'
                                        }`}>
                                            {entry.rank}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={entry.anonymous ? 'Anonymous' : entry.name} />
                                            <span className="text-sm font-medium text-[var(--text)]">
                                                {entry.anonymous ? 'Anonymous' : entry.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-[var(--text-muted)] capitalize">{entry.niche}</td>
                                    <td className="p-4 text-sm text-[var(--text)]">{formatNumber(entry.views)}</td>
                                    <td className="p-4 text-sm text-[var(--text)]">{formatNumber(entry.likes)}</td>
                                    <td className="p-4 text-sm text-[var(--text)]">{formatNumber(entry.shares)}</td>
                                    <td className="p-4 text-sm text-[var(--success)]">{entry.engagementRate}%</td>
                                    <td className="p-4 text-right">
                                        <span className="text-sm font-bold text-[var(--text)]">{formatNumber(entry.viralScore)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
