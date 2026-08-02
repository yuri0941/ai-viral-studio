import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { KPICard } from '../common/KPICard'
import { Server, AlertCircle } from 'lucide-react'

export function ServersTab({ data }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard title="Онлайн" value={data.servers.filter(s => s.status === 'online').length} icon={Server} color="emerald" />
                <KPICard title="Предупреждения" value={data.servers.filter(s => s.status === 'warning').length} icon={AlertCircle} color="orange" />
                <KPICard title="Оффлайн" value={data.servers.filter(s => s.status === 'offline').length} icon={Server} color="red" />
            </div>
            <DataTable
                data={data.servers}
                columns={[
                    { key: 'name', label: 'Сервер', render: r => <span className="text-sm font-medium text-[var(--text)]">{r.name}</span> },
                    { key: 'region', label: 'Регион', render: r => <span className="text-xs text-gray-400">{r.region}</span> },
                    { key: 'status', label: 'Статус', render: r => <StatusBadge status={r.status} pulse={r.status === 'online'} /> },
                    { key: 'cpu', label: 'CPU', render: r => (
                        <div className="w-20">
                            <div className="w-full bg-gray-800 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${r.cpu > 80 ? 'bg-red-500' : r.cpu > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${r.cpu}%` }} /></div>
                            <span className="text-[10px] text-gray-500">{r.cpu.toFixed(0)}%</span>
                        </div>
                    )},
                    { key: 'ram', label: 'RAM', render: r => <span className="text-xs text-gray-400">{r.ram.toFixed(0)}%</span> },
                    { key: 'uptime', label: 'Uptime', render: r => <span className="text-xs font-mono text-gray-400">{r.uptime}</span> },
                ]}
                emptyText="Нет серверов"
            />
        </div>
    )
}
