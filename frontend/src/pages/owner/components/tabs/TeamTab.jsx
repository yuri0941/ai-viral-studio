import { useState } from 'react'
import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { generateGradient, getInitials } from '../../utils/helpers'
import { Users, Plus, Search } from 'lucide-react'

export function TeamTab({ data }) {
    const [search, setSearch] = useState('')
    const { staff, setModal } = data

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.department.toLowerCase().includes(search.toLowerCase())
    )

    const columns = [
        {
            key: 'name',
            label: 'Сотрудник',
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
        { key: 'role', label: 'Роль', render: (row) => <span className="text-xs text-gray-400 capitalize">{row.role}</span> },
        { key: 'department', label: 'Отдел', render: (row) => <span className="text-xs text-gray-400 capitalize">{row.department}</span> },
        { key: 'status', label: 'Статус', render: (row) => <StatusBadge status={row.status} pulse={row.status === 'active'} /> },
        { key: 'load', label: 'Загрузка', render: (row) => (
            <div className="w-full max-w-[100px]">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>{row.load}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${row.load > 80 ? 'bg-red-500' : row.load > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${row.load}%` }} />
                </div>
            </div>
        )},
        { key: 'tasksCompleted', label: 'Задачи', render: (row) => <span className="text-xs text-gray-400">{row.tasksCompleted}</span> },
        { key: 'skills', label: 'Навыки', render: (row) => (
            <div className="flex flex-wrap gap-1">
                {row.skills?.map((skill, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-400 border border-[var(--border)]">{skill}</span>
                ))}
            </div>
        )},
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск по команде..."
                        className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-emerald-500/30"
                    />
                </div>
                <button
                    onClick={() => setModal({ type: 'addStaff' })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
                >
                    <Plus size={16} /> Добавить
                </button>
            </div>

            <DataTable
                data={filtered}
                columns={columns}
                onEdit={(row) => setModal({ type: 'editStaff', data: row })}
                onDelete={(id) => data.removeStaff(id)}
                emptyText="Нет сотрудников"
            />
        </div>
    )
}
