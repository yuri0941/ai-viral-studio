import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { FileText, Download, Trash2 } from 'lucide-react'
import { exportToCSV } from '../../utils/helpers'

export function LogsTab({ data }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gray-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Логи системы</h2>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => data.clearOldLogs(7)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-[var(--border)] text-xs text-gray-400 hover:bg-white/10 transition-colors">
                        <Trash2 size={12} /> Очистить старше 7 дней
                    </button>
                    <button type="button" onClick={() => exportToCSV(data.systemLogs, 'logs.csv')} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-[var(--border)] text-xs text-gray-400 hover:bg-white/10 transition-colors">
                        <Download size={12} /> Экспорт
                    </button>
                </div>
            </div>
            <DataTable
                data={data.systemLogs}
                columns={[
                    { key: 'timestamp', label: 'Время', render: r => <span className="text-xs font-mono text-gray-400">{r.timestamp}</span> },
                    { key: 'level', label: 'Уровень', render: r => <StatusBadge status={r.level} label={r.level.toUpperCase()} /> },
                    { key: 'source', label: 'Источник', render: r => <span className="text-xs text-gray-400">{r.source}</span> },
                    { key: 'message', label: 'Сообщение', render: r => <span className="text-sm text-[var(--text)]">{r.message}</span> },
                ]}
                searchable
                emptyText="Нет логов"
            />
        </div>
    )
}
