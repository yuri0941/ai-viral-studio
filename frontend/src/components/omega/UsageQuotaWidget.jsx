import { useEffect, useState } from 'react'
import { Zap, Lock, Plus, AlertCircle, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

export function UsageQuotaWidget() {
    const [quota, setQuota] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadQuota()
    }, [])

    const loadQuota = async () => {
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/quota`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') setQuota(json.data)
        } catch (err) {
            console.warn('[UsageQuotaWidget] load failed:', err.message)
        }
    }

    const topUp = async () => {
        setLoading(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/quota/topup`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ packs: 1 }),
            })
            const json = await res.json()
            if (json.status === 'success') setQuota(json.data)
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!quota) return null

    const percent = Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100))
    const isLow = quota.remaining <= Math.max(5, quota.limit * 0.1)
    const isBlocked = quota.blocked

    return (
        <div className={`px-3 py-2 rounded-xl border text-xs ${isBlocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : isLow ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
            <div className="flex items-center gap-2 mb-1.5">
                {isBlocked ? <Lock size={14} /> : <Zap size={14} />}
                <span className="font-medium">Генераций: {quota.remaining}/{quota.limit}</span>
            </div>
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${isBlocked ? 'bg-red-400' : isLow ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${percent}%` }} />
            </div>
            {isBlocked ? (
                <button
                    onClick={topUp}
                    disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    +{quota.topUpPackSize} за ${quota.topUpPackPrice}
                </button>
            ) : isLow ? (
                <button
                    onClick={topUp}
                    disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    +{quota.topUpPackSize} за ${quota.topUpPackPrice}
                </button>
            ) : null}
            {isBlocked && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400/80">
                    <AlertCircle size={10} /> Лимит исчерпан. Докупите пакет.
                </div>
            )}
        </div>
    )
}

export default UsageQuotaWidget
