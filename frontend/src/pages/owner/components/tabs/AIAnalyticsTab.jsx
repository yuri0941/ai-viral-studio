import { useEffect, useState } from 'react'
import { KPICard } from '../common/KPICard'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import { ownerApi, selfImprovementApi } from '../../../../services/api'
import { Brain, Wallet, TrendingUp, Lightbulb, UserX } from 'lucide-react'

// [REAL-DATA] AI Аналитика: только реальные источники (churn из self-improvement,
// MRR/воронка из metricsService). Прогнозов без реальной истории не рисуем.
export function AIAnalyticsTab() {
    const [churnStats, setChurnStats] = useState(null)
    const [metrics, setMetrics] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        Promise.all([
            selfImprovementApi.churnStats().catch(() => null),
            ownerApi.metrics().catch(() => null),
        ]).then(([churnRes, metricsRes]) => {
            if (!mounted) return
            setChurnStats(churnRes?.data || null)
            setMetrics(metricsRes?.metrics || null)
        }).finally(() => mounted && setLoading(false))
        return () => { mounted = false }
    }, [])

    const hasChurn = churnStats && (churnStats.atRisk || churnStats.prevented || churnStats.highRisk)
    const mrr = metrics?.mrr || 0
    const paying = metrics?.paying || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Brain size={18} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">AI Аналитика</h2>
            </div>
            {loading ? (
                <div className="h-24 shimmer rounded-2xl" />
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KPICard title="Клиентов в риске оттока" value={churnStats?.atRisk || 0} icon={UserX} color="purple" />
                        <KPICard title="MRR (реальный)" value={mrr} suffix=" ₽" icon={Wallet} color="emerald" />
                        <KPICard title="Платящих подписчиков" value={paying} icon={TrendingUp} color="blue" />
                    </div>
                    {hasChurn && (
                        <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Отток (факт за неделю)</h3>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <span className="text-[var(--text-muted)]">В риске: <span className="text-[var(--text)] font-medium">{churnStats.atRisk || 0}</span></span>
                                <span className="text-rose-400">Высокий риск: {churnStats.highRisk || 0}</span>
                                <span className="text-emerald-400">Предотвращено: {churnStats.prevented || 0}</span>
                            </div>
                        </div>
                    )}
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Прогноз доходов</h3>
                        <EmptyState
                            icon={TrendingUp}
                            title="Недостаточно данных для прогноза"
                            description="Прогноз строится только на реальной истории платежей. Когда накопится статистика — график появится здесь автоматически."
                        />
                    </div>
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">AI Рекомендации</h3>
                        <EmptyState
                            icon={Lightbulb}
                            title="Рекомендаций пока нет"
                            description="OMEGA формирует рекомендации на основе реальных метрик. Выдуманных советов здесь не будет."
                        />
                    </div>
                </>
            )}
        </div>
    )
}
