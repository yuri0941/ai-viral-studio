import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { Gift, Plus } from 'lucide-react'

export function PromoTab({ data }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Gift size={18} className="text-orange-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Промокоды</h2>
                </div>
                <button onClick={() => data.setModal({ type: 'createPromo' })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                    <Plus size={16} /> Новый промо
                </button>
            </div>
            <DataTable
                data={data.promos}
                columns={[
                    { key: 'code', label: 'Код', render: r => <span className="text-sm font-mono font-medium text-[var(--text)]">{r.code}</span> },
                    { key: 'discount', label: 'Скидка', render: r => <span className="text-sm text-[var(--text)]">{r.discount}{r.type === 'percent' ? '%' : '$'}</span> },
                    { key: 'usedCount', label: 'Использований', render: r => <span className="text-xs text-gray-400">{r.usedCount} / {r.usageLimit}</span> },
                    { key: 'status', label: 'Статус', render: r => <StatusBadge status={r.status} /> },
                    { key: 'expiry', label: 'Истекает', render: r => <span className="text-xs text-gray-400">{r.expiry}</span> },
                ]}
                onDelete={id => data.setPromos(prev => prev.filter(p => p.id !== id))}
                emptyText="Нет промокодов"
            />
        </div>
    )
}
