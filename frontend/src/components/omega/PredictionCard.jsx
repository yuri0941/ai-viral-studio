import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, TrendingDown, X, Loader2, Trophy, AlertCircle } from 'lucide-react'
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

export function PredictionCard({ postId, content, platform = 'tiktok', niche = '', onWager }) {
    const [prediction, setPrediction] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [wagered, setWagered] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            if (!content?.trim()) return
            setLoading(true)
            setError(null)
            try {
                const res = await api('/gamification/predictions', {
                    method: 'POST',
                    body: JSON.stringify({ postId, content, platform, niche }),
                })
                if (!cancelled) setPrediction(res)
            } catch (err) {
                if (!cancelled) setError(err.message)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [postId, content, platform, niche])

    const placeWager = async (wager) => {
        if (!prediction?.predictionId || wager === 'skip') {
            setWagered(true)
            onWager?.(wager)
            return
        }
        try {
            await api(`/gamification/predictions/${prediction.predictionId}/wager`, {
                method: 'POST',
                body: JSON.stringify({ wager }),
            })
            setWagered(true)
            onWager?.(wager)
        } catch (err) {
            setError(err.message)
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 flex items-center gap-3 text-sm text-gray-400">
                <Loader2 size={18} className="animate-spin text-purple-400" />
                OMEGA думает над прогнозом...
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 flex items-start gap-3 text-sm text-red-400">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>Не удалось загрузить прогноз: {error}</div>
            </div>
        )
    }

    if (!prediction || prediction.status === 'insufficient_data') {
        return (
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 text-sm text-gray-400">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <span className="text-white font-medium">🔮 OMEGA пока не спорит</span>
                </div>
                <p>{prediction?.message || 'Накопите 30 дней публикаций, чтобы OMEGA могла делать прогнозы и спорить.'}</p>
            </div>
        )
    }

    if (wagered) {
        return (
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 text-sm text-emerald-400 flex items-center gap-2">
                <Trophy size={16} />
                Спор принят. Через 48 часов сверимся с реальными данными.
            </div>
        )
    }

    return (
        <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Sparkles size={16} />
                    <span className="font-medium">🔮 OMEGA предсказывает</span>
                </div>
                <div className="text-xs text-gray-500">Score: {prediction.score}/100</div>
            </div>

            <div className="text-white text-lg font-semibold">
                {prediction.estimatedViews} просмотров <span className="text-gray-500 text-sm">(±15%)</span>
            </div>

            {prediction.reasoning && (
                <p className="text-xs text-gray-400 leading-relaxed">{prediction.reasoning}</p>
            )}

            <div className="text-sm text-white font-medium">Спорим?</div>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => placeWager('more')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                >
                    <TrendingUp size={14} /> Больше
                </button>
                <button
                    onClick={() => placeWager('less')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 text-xs hover:bg-rose-500/20 transition-colors"
                >
                    <TrendingDown size={14} /> Меньше
                </button>
                <button
                    onClick={() => placeWager('skip')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition-colors"
                >
                    <X size={14} /> Пропустить
                </button>
            </div>
        </div>
    )
}

export default PredictionCard
