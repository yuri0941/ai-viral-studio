import { useState, useMemo, useEffect } from 'react'
import { DollarSign, PieChart, TrendingUp, Wallet, Bitcoin, AlertTriangle } from 'lucide-react'
import { KPICard } from '../common/KPICard'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import { ownerControlApi } from '../../../../services/api'

// [REAL-DATA] План распределения бюджета — это настройка (проценты), применяется к РЕАЛЬНОМУ MRR.
// Крипто-портфель и «инвестиционные портфели» не имеют реального источника данных → честные empty-state.
const BUDGET_CATEGORIES = [
    { id: 'ads', label: 'Реклама', percent: 50, color: '#2563eb' },
    { id: 'infra', label: 'Инфраструктура', percent: 20, color: '#8b5cf6' },
    { id: 'api', label: 'API/AI', percent: 15, color: '#f0883e' },
    { id: 'freelance', label: 'Фриланс', percent: 10, color: '#00ff41' },
    { id: 'emergency', label: 'Экстренный', percent: 5, color: '#ec4899' },
]

export function OmegaFinanceTab({ data }) {
    const { payments = [] } = data
    const [mrr, setMrr] = useState(0)

    useEffect(() => {
        let mounted = true
        ownerControlApi.metrics()
            .then(res => { if (mounted) setMrr(res?.metrics?.mrr || 0) })
            .catch(() => {})
        return () => { mounted = false }
    }, [])

    const income = useMemo(() => payments.filter(p => p.type === 'income').reduce((a, b) => a + (b.amount || 0), 0), [payments])
    const expense = useMemo(() => payments.filter(p => p.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0), [payments])
    const profit = income - expense

    const dynamicLimit = Math.round(mrr * 0.02)
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
                    <span>MRR (факт):</span>
                    <span className="text-[var(--text)] font-mono font-medium">{mrr.toLocaleString('ru-RU')} ₽</span>
                </div>
            </div>

            {/* KPI — реальные платежи, ₽ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Доход" value={income} suffix=" ₽" icon={TrendingUp} color="emerald" />
                <KPICard title="Расход" value={expense} suffix=" ₽" icon={Wallet} color="red" />
                <KPICard title="Прибыль" value={profit} suffix=" ₽" icon={DollarSign} color="blue" />
                <KPICard title="Динамический лимит (2% MRR)" value={dynamicLimit} suffix=" ₽" icon={PieChart} color="purple" />
            </div>

            {/* Budget allocation — план в процентах от реального MRR */}
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">План распределения бюджета OMEGA</h3>
                <p className="text-[11px] text-[var(--text-muted)] mb-4">Проценты — настройка владельца; суммы считаются от фактического MRR.</p>
                <div className="h-4 w-full rounded-full overflow-hidden flex mb-4">
                    {budget.map(c => (
                        <div key={c.id} style={{ width: `${c.percent}%`, backgroundColor: c.color }} title={`${c.label}: ${c.amount.toLocaleString('ru-RU')} ₽`} />
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {budget.map(c => (
                        <div key={c.id} className="glass-luxury rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                <span className="text-xs text-[var(--text)]">{c.label}</span>
                            </div>
                            <div className="text-sm font-medium text-[var(--text)]">{c.amount.toLocaleString('ru-RU')} ₽</div>
                            <div className="text-[10px] text-gray-500">{c.percent}%</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Crypto panel — нет реального источника данных */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Bitcoin size={18} className="text-orange-400" />
                        <h3 className="text-sm font-semibold text-[var(--text)]">Крипто-портфель</h3>
                    </div>
                    <EmptyState
                        icon={Bitcoin}
                        title="Нет подключённых крипто-счетов"
                        description="Сервис не держит крипто-резервы. Когда появится реальный источник данных — панель заполнится фактом."
                    />
                </div>

                {/* Investment portfolios — нет реального источника данных */}
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp size={18} className="text-blue-400" />
                        <h3 className="text-sm font-semibold text-[var(--text)]">Инвестиционные портфели</h3>
                    </div>
                    <EmptyState
                        icon={PieChart}
                        title="Портфели не настроены"
                        description="Инвестиционных портфелей у сервиса нет — выдуманная доходность удалена. Раздел ждёт реального источника."
                    />
                </div>
            </div>

            {/* Alerts */}
            <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0" />
                <div>
                    <div className="text-sm font-medium text-red-400">Автономные лимиты OMEGA</div>
                    <div className="text-xs text-gray-400 mt-1">
                        OMEGA может тратить до 2% MRR без одобрения. При превышении — запрос на утверждение владельцу.
                        Текущий лимит: <span className="text-[var(--text)]">{dynamicLimit.toLocaleString('ru-RU')} ₽</span>.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OmegaFinanceTab
