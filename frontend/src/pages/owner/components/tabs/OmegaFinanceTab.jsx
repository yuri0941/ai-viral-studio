import { useState, useMemo } from 'react'
import { DollarSign, PieChart, TrendingUp, Wallet, Bitcoin, AlertTriangle } from 'lucide-react'
import { KPICard } from '../common/KPICard'

const BUDGET_CATEGORIES = [
    { id: 'ads', label: 'Реклама', percent: 50, color: '#2563eb' },
    { id: 'infra', label: 'Инфраструктура', percent: 20, color: '#8b5cf6' },
    { id: 'api', label: 'API/AI', percent: 15, color: '#f0883e' },
    { id: 'freelance', label: 'Фриланс', percent: 10, color: '#00ff41' },
    { id: 'emergency', label: 'Экстренный', percent: 5, color: '#ec4899' },
]

const PORTFOLIOS = [
    { id: 'quick', name: 'Quick', allocation: 20, risk: 'low', return: '5-10%' },
    { id: 'growth', name: 'Growth', allocation: 50, risk: 'medium', return: '15-25%' },
    { id: 'wealth', name: 'Wealth', allocation: 25, risk: 'medium', return: '10-15%' },
    { id: 'reserve', name: 'Reserve', allocation: 5, risk: 'low', return: '2-5%' },
]

export function OmegaFinanceTab({ data }) {
    const { payments = [] } = data
    const [mrr, setMrr] = useState(39690)
    const [cryptoShare, setCryptoShare] = useState(15)

    const income = useMemo(() => payments.filter(p => p.type === 'income').reduce((a, b) => a + (b.amount || 0), 0), [payments])
    const expense = useMemo(() => payments.filter(p => p.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0), [payments])
    const profit = income - expense

    const dynamicLimit = mrr * 0.02
    const budget = BUDGET_CATEGORIES.map(c => ({
        ...c,
        amount: Math.round(mrr * (c.percent / 100)),
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DollarSign size={20} className="text-emerald-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">OMEGA Finance</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>MRR:</span>
                    <input
                        type="number"
                        value={mrr}
                        onChange={e => setMrr(Number(e.target.value))}
                        className="w-24 bg-white/5 border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text)] text-right outline-none focus:border-emerald-500/30"
                    />
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Доход" value={income} prefix="$" icon={TrendingUp} color="emerald" />
                <KPICard title="Расход" value={expense} prefix="$" icon={Wallet} color="red" />
                <KPICard title="Прибыль" value={profit} prefix="$" icon={DollarSign} color="blue" />
                <KPICard title="Динамический лимит" value={Math.round(dynamicLimit)} prefix="$" icon={PieChart} color="purple" />
            </div>

            {/* Budget allocation */}
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Распределение бюджета OMEGA</h3>
                <div className="h-4 w-full rounded-full overflow-hidden flex mb-4">
                    {budget.map(c => (
                        <div key={c.id} style={{ width: `${c.percent}%`, backgroundColor: c.color }} title={`${c.label}: $${c.amount}`} />
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {budget.map(c => (
                        <div key={c.id} className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                <span className="text-xs text-[var(--text)]">{c.label}</span>
                            </div>
                            <div className="text-sm font-medium text-[var(--text)]">${c.amount.toLocaleString()}</div>
                            <div className="text-[10px] text-gray-500">{c.percent}%</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Crypto panel */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <Bitcoin size={18} className="text-orange-400" />
                        <h3 className="text-sm font-semibold text-[var(--text)]">Крипто-портфель</h3>
                    </div>
                    <div className="mb-4">
                        <label className="text-[10px] text-gray-500 mb-1.5 block">Доля крипто в резервах: {cryptoShare}%</label>
                        <input
                            type="range"
                            min={0}
                            max={50}
                            value={cryptoShare}
                            onChange={e => setCryptoShare(Number(e.target.value))}
                            className="w-full accent-orange-400"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                            <div className="text-xs text-[var(--text)]">USDT</div>
                            <div className="text-[10px] text-gray-500">{cryptoShare * 0.5}%</div>
                        </div>
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                            <div className="text-xs text-[var(--text)]">BTC</div>
                            <div className="text-[10px] text-gray-500">{cryptoShare * 0.3}%</div>
                        </div>
                        <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                            <div className="text-xs text-[var(--text)]">ETH</div>
                            <div className="text-[10px] text-gray-500">{cryptoShare * 0.2}%</div>
                        </div>
                    </div>
                </div>

                {/* Investment portfolios */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp size={18} className="text-blue-400" />
                        <h3 className="text-sm font-semibold text-[var(--text)]">Инвестиционные портфели</h3>
                    </div>
                    <div className="space-y-3">
                        {PORTFOLIOS.map(p => (
                            <div key={p.id} className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="text-sm text-[var(--text)]">{p.name}</div>
                                    <div className="text-[10px] text-gray-500">Риск: {p.risk} • Доходность: {p.return}</div>
                                </div>
                                <div className="text-sm font-medium text-emerald-400">{p.allocation}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0" />
                <div>
                    <div className="text-sm font-medium text-red-400">Автономные лимиты OMEGA</div>
                    <div className="text-xs text-gray-400 mt-1">
                        OMEGA может тратить до 2% MRR без одобрения. При превышении — запрос на утверждение владельцу.
                        Текущий лимит: <span className="text-[var(--text)]">${Math.round(dynamicLimit)}</span>.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OmegaFinanceTab
