import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { ShieldCheck, Download } from 'lucide-react'
import { exportToCSV, formatDateTime } from '../../utils/helpers'

export function AuditTab({ data }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">Аудит действий</h2>
                </div>
                <button onClick={() => exportToCSV(data.auditLogs, 'audit.csv')} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors">
                    <Download size={14} /> Экспорт CSV
                </button>
            </div>
            <DataTable
                data={data.auditLogs}
                columns={[
                    { key: 'timestamp', label: 'Время', render: r => <span className="text-xs text-gray-400">{formatDateTime(r.timestamp)}</span> },
                    { key: 'action', label: 'Действие', render: r => <span className="text-sm text-white">{r.action}</span> },
                    { key: 'user', label: 'Пользователь', render: r => <span className="text-xs font-mono text-gray-400">{r.user}</span> },
                    { key: 'type', label: 'Тип', render: r => <StatusBadge status={r.type} label={r.type} /> },
                    { key: 'severity', label: 'Важность', render: r => <StatusBadge status={r.severity} label={r.severity} /> },
                ]}
                searchable
                emptyText="Нет записей"
            />
        </div>
    )
}
