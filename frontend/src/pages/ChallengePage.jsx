import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config.js'
import {
    Trophy, Clock, Flame, Calendar, Send, ChevronRight,
    Loader2, Award, Sparkles, Crown, Star, History, Users
} from 'lucide-react'

function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

function timeLeft(endDate) {
    const diff = new Date(endDate) - Date.now()
    if (diff <= 0) return 'Завершён'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${days}д ${hours}ч ${minutes}м`
}

export default function ChallengePage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [challenge, setChallenge] = useState(null)
    const [archive, setArchive] = useState([])
    const [form, setForm] = useState({ contentUrl: '', caption: '', platform: 'tiktok', niche: 'general' })
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        loadChallenge()
        loadArchive()
    }, [])

    async function loadChallenge() {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/challenges/current`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') {
                setChallenge(data.data)
            }
        } catch (err) {
            console.warn('[Challenge] load failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    async function loadArchive() {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/challenges/archive?limit=6`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') {
                setArchive(Array.isArray(data.data) ? data.data : [])
            }
        } catch (err) {
            console.warn('[Challenge] archive failed:', err.message)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.caption && !form.contentUrl) return
        setSubmitting(true)
        setMessage('')
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/challenges/submit`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.status === 'success') {
                setMessage('✅ Работа отправлена на оценку OMEGA')
                setForm({ contentUrl: '', caption: '', platform: 'tiktok', niche: 'general' })
                loadChallenge()
            } else {
                setMessage('❌ ' + (data.message || 'Ошибка отправки'))
            }
        } catch (err) {
            setMessage('❌ Ошибка сети')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-6 max-w-[1200px] mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-[var(--text)] flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8 text-[var(--accent-warm)]" />
                    OMEGA Challenge
                </h1>
                <p className="text-[var(--text-muted)]">Ежемесячный конкурс вирусного контента с AI-оценкой и призами</p>
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            )}

            {!loading && challenge && (
                <div className="glass rounded-3xl p-6 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] text-xs font-medium flex items-center gap-1">
                                <Flame size={12} /> {challenge.status === 'active' ? 'Активный' : challenge.status}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-xs font-medium flex items-center gap-1">
                                <Clock size={12} /> {timeLeft(challenge.endDate)}
                            </span>
                        </div>

                        <h2 className="text-2xl md:text-4xl font-serif font-bold text-[var(--text)] mb-3">
                            {challenge.theme}
                        </h2>
                        <p className="text-[var(--text-muted)] max-w-2xl mb-6">
                            {challenge.description || 'Создай самый вирусный контент на тему месяца. OMEGA оценит вирусность, креатив и вовлечённость.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="glass px-5 py-3 rounded-2xl flex items-center gap-3">
                                <Crown className="w-5 h-5 text-[var(--accent-warm)]" />
                                <div>
                                    <p className="text-xs text-[var(--text-muted)]">Главный приз</p>
                                    <p className="text-sm font-medium text-[var(--text)]">{challenge.prize?.label || '500 кредитов'}</p>
                                </div>
                            </div>
                            <div className="glass px-5 py-3 rounded-2xl flex items-center gap-3">
                                <Users className="w-5 h-5 text-[var(--primary)]" />
                                <div>
                                    <p className="text-xs text-[var(--text-muted)]">Участников</p>
                                    <p className="text-sm font-medium text-[var(--text)]">{formatNumber(challenge.participants?.length || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">Ссылка на контент</label>
                                <input
                                    value={form.contentUrl}
                                    onChange={e => setForm({ ...form, contentUrl: e.target.value })}
                                    placeholder="https://tiktok.com/@user/video/..."
                                    className="w-full px-4 py-3 glass rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/50 bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">Хук / описание</label>
                                <textarea
                                    value={form.caption}
                                    onChange={e => setForm({ ...form, caption: e.target.value })}
                                    rows={3}
                                    placeholder="Опиши идею или вставь первые строки..."
                                    className="w-full px-4 py-3 glass rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/50 bg-transparent resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">Платформа</label>
                                    <select
                                        value={form.platform}
                                        onChange={e => setForm({ ...form, platform: e.target.value })}
                                        className="w-full px-4 py-3 glass rounded-xl text-[var(--text)] bg-transparent"
                                    >
                                        <option value="tiktok">TikTok</option>
                                        <option value="youtube">YouTube Shorts</option>
                                        <option value="instagram">Instagram Reels</option>
                                        <option value="telegram">Telegram</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">Ниша</label>
                                    <select
                                        value={form.niche}
                                        onChange={e => setForm({ ...form, niche: e.target.value })}
                                        className="w-full px-4 py-3 glass rounded-xl text-[var(--text)] bg-transparent"
                                    >
                                        <option value="general">Общая</option>
                                        <option value="tech">Технологии</option>
                                        <option value="fitness">Фитнес</option>
                                        <option value="travel">Путешествия</option>
                                        <option value="food">Еда</option>
                                        <option value="gaming">Игры</option>
                                        <option value="business">Бизнес</option>
                                    </select>
                                </div>
                            </div>
                            {message && (
                                <div className={`p-3 rounded-xl text-sm ${message.startsWith('✅') ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                                    {message}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={submitting || (!form.caption && !form.contentUrl)}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {submitting ? 'Отправка...' : 'Участвовать'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {!loading && !challenge && (
                <div className="glass rounded-3xl p-10 text-center">
                    <p className="text-[var(--text-muted)]">Сейчас нет активного челленджа. Следующий стартует скоро.</p>
                </div>
            )}

            {/* Archive */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                    <History className="w-5 h-5 text-[var(--primary)]" />
                    Архив челленджей
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archive.map((item) => (
                        <div key={item._id} className="glass p-5 rounded-2xl hover:border-[var(--border-strong)] transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-muted)] text-[10px]">
                                    {new Date(item.startDate).toLocaleDateString('ru-RU', { month: 'long' })}
                                </span>
                                {item.winnerId && <Award className="w-4 h-4 text-[var(--accent-warm)]" />}
                            </div>
                            <h4 className="font-medium text-[var(--text)] mb-1 line-clamp-2">{item.theme}</h4>
                            <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{item.description}</p>
                            {item.winnerId && (
                                <div className="p-2 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10">
                                    <p className="text-xs text-[var(--success)]">
                                        🏆 Победитель: {item.winnerId.name || 'Anonymous'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                    {archive.length === 0 && (
                        <div className="glass p-5 rounded-2xl text-center text-[var(--text-muted)] text-sm">
                            Архив пока пуст
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
