import { useState } from 'react'
import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { ShieldCheck, Download, Loader2 } from 'lucide-react'
import { formatDateTime } from '../../utils/helpers'
import { API_BASE_URL } from '../../../../config.js'

export function AuditTab({ data }) {
    const [downloading, setDownloading] = useState(false)

    const handleExport = async () => {
        setDownloading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/audit/export`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Ошибка экспорта')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Отчёт_аудит_${new Date().toLocaleDateString('ru-RU')}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)

            if (window.showToast) window.showToast('Отчёт скачан', 'success')
        } catch (err) {
            console.error('[AuditTab:export]', err.message)
            if (window.showToast) window.showToast('Не удалось скачать отчёт', 'error')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-blue-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Аудит действий</h2>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={downloading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-[var(--border)] text-xs text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    📥 Скачать отчёт
                </button>
            </div>
            <DataTable
                data={data.auditLogs}
                columns={[
                    { key: 'timestamp', label: 'Время', render: r => <span className="text-xs text-gray-400">{formatDateTime(r.timestamp)}</span> },
                    { key: 'action', label: 'Действие', render: r => <span className="text-sm text-[var(--text)]">{r.action}</span> },
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
