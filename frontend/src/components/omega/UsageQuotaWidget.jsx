import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, AlertCircle, Plus } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

export function UsageQuotaWidget() {
    const [quota, setQuota] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        loadQuota()
    }, [])

    const loadQuota = async () => {
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/users/me/quota`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') {
                const q = json.data
                setQuota({
                    used: q.generationsUsed ?? q.used ?? 0,
                    limit: q.generationsLimit ?? q.limit ?? 0,
                    remaining: q.remaining ?? 0,
                    plan: q.plan || 'free',
                })
            }
        } catch (err) {
            console.warn('[UsageQuotaWidget] load failed:', err.message)
            setQuota(null) // [v6.0] added: degrade gracefully to empty quota
        }
    }

    if (!quota) {
        // [v6.0] added: graceful quota placeholder
        return (
            <div className="px-3 py-2 rounded-xl border text-xs bg-white/5 border-white/10 text-gray-400">
                <div className="flex items-center gap-2">
                    <Zap size={14} />
                    <span>Данные обновляются...</span>
                </div>
            </div>
        )
    }

    const percent = Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100))
    const isLow = quota.used >= quota.limit * 0.8 && quota.used < quota.limit
    const isBlocked = quota.used >= quota.limit

    return (
        <div className={`px-3 py-2 rounded-xl border text-xs ${isBlocked ? 'bg-red-500/10 border-red-500/20 text-red-400' : isLow ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
            <div className="flex items-center gap-2 mb-1">
                {isBlocked ? <Zap size={14} className="text-red-400" /> : <Zap size={14} />}
                <span className="font-medium">Генераций: {quota.used}/{quota.limit}</span>
            </div>
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${isBlocked ? 'bg-red-400' : isLow ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${percent}%` }} />
            </div>
            {(isLow || isBlocked) && (
                <button
                    onClick={() => navigate('/settings?tab=subscriptions')}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${isBlocked ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'}`}
                >
                    <Plus size={12} /> <span className="text-[10px]">{isBlocked ? 'Лимит исчерпан' : '⚡ Осталось мало!'}</span>
                </button>
            )}
        </div>
    )
}

export default UsageQuotaWidget
