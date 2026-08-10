import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Eye, Check, Clock, X, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../../config.js'

const TYPE_ICONS = {
    post: Sparkles,
    competitor: Zap,
    pricing: Clock,
}

export default function OmegaPredictiveCard() {
    const { t } = useTranslation()
    const [predictions, setPredictions] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [expanded, setExpanded] = useState(false)
    const [hiddenUntil, setHiddenUntil] = useState(() => {
        try { return Number(localStorage.getItem('omega_predict_hidden')) || 0 } catch { return 0 }
    })
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const load = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/predictions`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed')
            const json = await res.json()
            console.log('[OmegaPredictiveCard] API response:', json)
            const raw = Array.isArray(json?.data) ? json.data
                : Array.isArray(json?.predictions) ? json.predictions
                : Array.isArray(json?.data?.predictions) ? json.data.predictions
                : []
            console.log('[OmegaPredictiveCard] Predictions:', raw)
            const items = raw.filter(p => p && p.type && TYPE_ICONS[p.type])
            setPredictions(items)
            setError(null)
        } catch (err) {
            setError(err.message)
            console.error('[OmegaPredictiveCard]', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const postpone = () => {
        const until = Date.now() + 24 * 60 * 60 * 1000
        setHiddenUntil(until)
        try { localStorage.setItem('omega_predict_hidden', String(until)) } catch {}
    }

    const apply = async (p) => {
        try {
            const res = await fetch(`${API_BASE_URL}/omega/predictions/${p.id}/apply`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Apply failed')
            toast.success(t('predictiveCard.applied', { title: p.title }))
            await load()
        } catch (err) {
            console.error('[OmegaPredictiveCard apply]', err.message)
        }
    }

    if (hiddenUntil > Date.now()) return null
    if (loading) return null
    if (error || predictions.length === 0) return null

    const current = predictions[0]
    const Icon = TYPE_ICONS[current.type] || Sparkles

    return (
        <div className="glass-card glow-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)]">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">{t('predictiveCard.title')}</h3>
                            <p className="text-xs text-[var(--text-muted)]">{t(`predictiveCard.types.${current.type}.title`, current.type)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={postpone}
                        className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/5 text-[var(--text-muted)]"
                        aria-label={t('predictiveCard.postpone')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-sm mt-3 text-[var(--text)] line-clamp-2">{current.title}</p>

                {expanded && current.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-2">{current.description}</p>
                )}

                <div className="flex items-center gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-white/5 hover:bg-white/10 text-xs"
                    >
                        <Eye className="w-3.5 h-3.5" /> {expanded ? t('predictiveCard.collapse') : t('predictiveCard.expand')}
                    </button>
                    <button
                        type="button"
                        onClick={() => apply(current)}
                        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 text-xs font-medium"
                    >
                        <Check className="w-3.5 h-3.5" /> {t(`predictiveCard.types.${current.type}.action`, current.type)}
                    </button>
                </div>
            </div>
        </div>
    )
}
