import { useEffect, useState } from 'react'
import { Wallet, ArrowUpRight } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

function calculateLimit(mrr) {
    if (mrr < 1000) return 20
    if (mrr < 5000) return 100
    return Math.max(200, Math.round(mrr * 0.02))
}

export default function OmegaBudgetWidget({ onOpenFinance }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const load = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/owner/omega-finance/limit`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed')
            const json = await res.json()
            setData(json.data || json)
        } catch (err) {
            console.error('[OmegaBudgetWidget]', err.message)
            setData({ mrr: 39690, limit: 794, used: 320, remaining: 474 })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const mrr = data?.mrr || 0
    const limit = data?.limit || calculateLimit(mrr)
    const used = data?.used || 0
    const remaining = data?.remaining ?? Math.max(0, limit - used)
    const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0

    return (
        <div className="glass-card glow-border rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer" onClick={onOpenFinance}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Бюджет OMEGA</h3>
                        <p className="text-xs text-[var(--text-muted)]">2% от MRR</p>
                    </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)]" />
            </div>

            <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${percent}%` }} />
            </div>

            <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Осталось</span>
                <span className="font-semibold">${remaining} из ${limit}</span>
            </div>

            {loading && <p className="text-xs text-[var(--text-muted)] mt-2">Загрузка...</p>}
        </div>
    )
}
