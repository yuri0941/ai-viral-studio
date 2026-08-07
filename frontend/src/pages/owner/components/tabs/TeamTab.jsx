import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { generateGradient, getInitials } from '../../utils/helpers'
import { Users, Plus, Search } from 'lucide-react'

export function TeamTab({ data }) {
    const { t } = useTranslation()
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
            label: t('team.employee', 'Сотрудник'),
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${generateGradient(row.id)} flex items-center justify-center text-xs font-bold text-white`}>
                            {getInitials(row.name)}
                        </div>
                        {/* [P16-FIX] added: online/offline pulse indicator */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-secondary)] ${row.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-[var(--text)]">{row.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{row.email}</div>
                    </div>
                </div>
            )
        },
        { key: 'role', label: t('team.role', 'Роль'), render: (row) => <span className="text-xs text-[var(--text-muted)] capitalize">{row.role}</span> },
        { key: 'department', label: t('team.department', 'Отдел'), render: (row) => <span className="text-xs text-[var(--text-muted)] capitalize">{row.department}</span> },
        { key: 'status', label: t('common.status', 'Статус'), render: (row) => <StatusBadge status={row.status} pulse={row.status === 'active'} /> },
        { key: 'load', label: t('team.load', 'Загрузка'), render: (row) => (
            <div className="w-full max-w-[100px]">
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                    <span>{row.load}%</span>
                </div>
                <div className="w-full bg-[var(--surface)] rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${row.load > 80 ? 'bg-red-500' : row.load > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${row.load}%` }} />
                </div>
            </div>
        )},
        { key: 'tasksCompleted', label: t('team.tasks', 'Задачи'), render: (row) => <span className="text-xs text-[var(--text-muted)]">{row.tasksCompleted}</span> },
        { key: 'skills', label: t('team.skills', 'Навыки'), render: (row) => (
            <div className="flex flex-wrap gap-1">
                {row.skills?.map((skill, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-[var(--surface)] text-[10px] text-[var(--text-muted)] border border-[var(--border)]">{skill}</span>
                ))}
            </div>
        )},
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('team.search', 'Поиск по команде...')}
                        className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/30"
                    />
                </div>
                <button type="button"
                    onClick={() => setModal({ type: 'addStaff' })}
                    className="flex items-center gap-2 px-4 py-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} /> {t('team.add', 'Добавить')}
                </button>
            </div>

            <DataTable
                data={filtered}
                columns={columns}
                onEdit={(row) => setModal({ type: 'editStaff', data: row })}
                onDelete={(id) => data.removeStaff(id)}
                emptyText={t('team.noEmployees', 'Нет сотрудников')}
                rowClassName={() => 'hover:bg-[var(--primary-soft)] transition-colors'}
            />
        </div>
    )
}
