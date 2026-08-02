import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { generateGradient, getInitials } from '../../utils/helpers'
import { Monitor, Eye, Pause, Play, LogIn } from 'lucide-react'

export function CabinetsTab({ data }) {
    const { cabinets, updateCabinetStatus, impersonateCabinet } = data

    const columns = [
        {
            key: 'name',
            label: 'Кабинет',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${generateGradient(row.id)} flex items-center justify-center text-xs font-bold text-[var(--text)]`}>
                        {getInitials(row.name)}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-[var(--text)]">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        { key: 'department', label: 'Отдел', render: (row) => <span className="text-xs text-gray-400 capitalize">{row.department}</span> },
        { key: 'status', label: 'Статус', render: (row) => <StatusBadge status={row.status} pulse={row.activeNow} /> },
        { key: 'activeNow', label: 'Онлайн', render: (row) => (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${row.activeNow ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-xs text-gray-400">{row.activeNow ? 'В сети' : 'Оффлайн'}</span>
            </div>
        )},
        { key: 'sessionsToday', label: 'Сессий сегодня', render: (row) => <span className="text-xs text-gray-400">{row.sessionsToday}</span> },
        { key: 'actionsToday', label: 'Действий', render: (row) => <span className="text-xs text-gray-400">{row.actionsToday}</span> },
        {
            key: 'actions',
            label: 'Действия',
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => impersonateCabinet(row.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors" title="Войти">
                        <LogIn size={14} />
                    </button>
                    <button onClick={() => updateCabinetStatus(row.id, row.status === 'active' ? 'paused' : 'active')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition-colors" title={row.status === 'active' ? 'Приостановить' : 'Активировать'}>
                        {row.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                </div>
            )
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Monitor size={18} className="text-emerald-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">Кабинеты сотрудников</h2>
                <StatusBadge status="active" label={`${cabinets.filter(c => c.status === 'active').length} активных`} pulse />
            </div>
            <DataTable data={cabinets} columns={columns} emptyText="Нет кабинетов" />
        </div>
    )
}
