import { KPICard } from '../common/KPICard'
import { Brain, DollarSign, TrendingUp, Lightbulb } from 'lucide-react'

export function AIAnalyticsTab({ data }) {
    const { aiAnalytics } = data

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Brain size={18} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">AI Аналитика</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard title="Churn (прогноз)" value={`${aiAnalytics.churnForecast.nextMonth}%`} icon={TrendingUp} color="purple" />
                <KPICard title="Прогноз Авг" value={aiAnalytics.revenueForecast[0]?.predicted || 0} prefix="$" icon={DollarSign} color="emerald" />
                <KPICard title="Рекомендаций" value={aiAnalytics.recommendations.length} icon={Lightbulb} color="blue" />
            </div>
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Прогноз доходов (AI)</h3>
                <div className="space-y-3">
                    {aiAnalytics.revenueForecast.map((f, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[var(--text)] font-medium">{f.month}</span>
                                <span className="text-emerald-400 font-mono">${f.predicted.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="relative h-full">
                                    <div className="absolute inset-y-0 left-0 bg-gray-700 rounded-full" style={{ width: `${(f.pessimistic / f.optimistic) * 100}%` }} />
                                    <div className="absolute inset-y-0 left-0 bg-purple-500/30 rounded-full" style={{ width: `${(f.predicted / f.optimistic) * 100}%` }} />
                                    <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${(f.predicted / f.optimistic) * 60}%` }} />
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Пессимистично: ${f.pessimistic.toLocaleString()}</span>
                                <span>Оптимистично: ${f.optimistic.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">AI Рекомендации</h3>
                <div className="space-y-3">
                    {aiAnalytics.recommendations.map(rec => (
                        <div key={rec.id} className="p-3 rounded-xl bg-white/[0.02] border border-[var(--border)]">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[var(--text)]">{rec.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${rec.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{rec.priority}</span>
                            </div>
                            <div className="text-xs text-emerald-400 mt-1">{rec.impact}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
