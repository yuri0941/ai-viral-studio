import { KPICard } from '../common/KPICard'
import { StatusBadge } from '../common/StatusBadge'
import { getSparklineData, formatCurrency } from '../../utils/helpers'
import { OmegaPanel } from '../../../../components/omega/OmegaPanel'
import {
    Users, CreditCard, TrendingUp, Server, Activity,
    DollarSign, BarChart3, Zap, ArrowUpRight
} from 'lucide-react'

export function OverviewTab({ data }) {
    const { staff, subscriptions, servers, payments, campaigns, agents } = data

    const totalRevenue = payments.filter(p => p.type === 'income').reduce((a, b) => a + b.amount, 0)
    const totalExpenses = payments.filter(p => p.type === 'expense').reduce((a, b) => a + b.amount, 0)
    const activeServers = servers.filter(s => s.status === 'online').length
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    const activeAgents = agents.filter(a => a.status === 'active').length
    const totalUsers = subscriptions.reduce((a, b) => a + b.users, 0)
    const mrr = subscriptions.reduce((a, b) => a + (b.price * b.users), 0)

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Всего пользователей" value={totalUsers} icon={Users} color="blue" change={12.5} sparklineData={getSparklineData(totalUsers, 7, 30)} />
                <KPICard title="MRR (ежемесячно)" value={mrr} prefix="$" icon={DollarSign} color="emerald" change={8.3} sparklineData={getSparklineData(mrr, 7, 200)} />
                <KPICard title="Активные кампании" value={activeCampaigns} icon={TrendingUp} color="purple" change={-2.1} sparklineData={getSparklineData(activeCampaigns, 7, 3)} />
                <KPICard title="AI Агенты онлайн" value={activeAgents} icon={Zap} color="orange" change={5.0} sparklineData={getSparklineData(activeAgents, 7, 1)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Сотрудники', value: staff.length, icon: Users, color: 'text-blue-400' },
                            { label: 'Серверы онлайн', value: `${activeServers}/${servers.length}`, icon: Server, color: 'text-emerald-400' },
                            { label: 'Доход', value: formatCurrency(totalRevenue), icon: CreditCard, color: 'text-emerald-400' },
                            { label: 'Расходы', value: formatCurrency(totalExpenses), icon: Activity, color: 'text-red-400' },
                        ].map((s, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <s.icon size={14} className={s.color} />
                                    <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                                </div>
                                <div className="text-lg font-bold text-[var(--text)]">{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Activity */}
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-400" /> Последняя активность
                        </h3>
                        <div className="space-y-3">
                            {data.auditLogs.slice(0, 5).map((log, idx) => (
                                <div key={log.id ?? log.timestamp ?? `log-${idx}`} className="flex items-center gap-3 text-sm">
                                    <StatusBadge status={log.severity} label={log.type} />
                                    <span className="text-gray-300 flex-1">{log.action}</span>
                                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString('ru-RU')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <OmegaPanel />

                    {/* Business Health */}
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Здоровье бизнеса</h3>
                        <div className="flex items-center justify-center py-4">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--card-hover)" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#00ff41" strokeWidth="8"
                                        strokeDasharray={`${data.aiAnalytics.businessHealth * 2.64} 264`}
                                        strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-[var(--text)]">{data.aiAnalytics.businessHealth}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-center text-[var(--text-muted)]">Индекс здоровья: <span className="text-emerald-400">Отлично</span></p>
                    </div>

                    {/* AI Recommendations */}
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                            <BarChart3 size={16} className="text-purple-400" /> AI Инсайты
                        </h3>
                        <div className="space-y-3">
                            {data.aiAnalytics.recommendations.map((rec, idx) => (
                                <div key={rec.id ?? rec.title ?? `rec-${idx}`} className="p-3 rounded-xl bg-[var(--glass)] border border-[var(--border)] hover:border-emerald-500/30 transition-colors group cursor-pointer">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-xs font-medium text-[var(--text)]">{rec.title}</div>
                                            <div className="text-[10px] text-emerald-400 mt-1">{rec.impact}</div>
                                        </div>
                                        <ArrowUpRight size={14} className="text-gray-500 group-hover:text-[var(--text)] transition-colors" />
                                    </div>
                                    <div className="mt-2 w-full bg-gray-800 rounded-full h-1">
                                        <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${rec.confidence}%` }} />
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">Уверенность: {rec.confidence}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
