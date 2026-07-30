import { DataTable } from '../common/DataTable'
import { KPICard } from '../common/KPICard'
import { StatusBadge } from '../common/StatusBadge'
import { getSparklineData, formatCurrency } from '../../utils/helpers'
import { Share2, Users, DollarSign, TrendingUp } from 'lucide-react'

export function ReferralsTab({ data }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Share2 size={18} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Реферальная программа</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard title="Всего заработано" value={data.referrals.reduce((a, b) => a + b.earnings, 0)} prefix="$" icon={DollarSign} color="emerald" sparklineData={getSparklineData(1000, 7, 200)} />
                <KPICard title="Конверсии" value={data.referrals.reduce((a, b) => a + b.conversions, 0)} icon={Users} color="blue" sparklineData={getSparklineData(50, 7, 10)} />
                <KPICard title="Активных кодов" value={data.referrals.filter(r => r.status === 'active').length} icon={Share2} color="purple" />
            </div>
            <DataTable
                data={data.referrals}
                columns={[
                    { key: 'code', label: 'Код', render: r => <span className="text-sm font-mono text-white">{r.code}</span> },
                    { key: 'referrer', label: 'Партнёр', render: r => <span className="text-xs text-gray-400">{r.referrer}</span> },
                    { key: 'earnings', label: 'Заработано', render: r => <span className="text-sm font-mono text-emerald-400">${r.earnings}</span> },
                    { key: 'conversions', label: 'Конверсии', render: r => <span className="text-xs text-gray-400">{r.conversions}</span> },
                    { key: 'status', label: 'Статус', render: r => <StatusBadge status={r.status} /> },
                ]}
                emptyText="Нет рефералов"
            />
        </div>
    )
}
