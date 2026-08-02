import { useState } from 'react'
import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { Bot, Plus, Power, Settings, Trash2, MessageSquare } from 'lucide-react'

export function AgentsTab({ data }) {
    const { agents, toggleAgent, addAgent, removeAgent, startChat } = data
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ name: '', role: '', description: '' })

    const columns = [
        {
            key: 'name',
            label: 'Агент',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <Bot size={16} className="text-[var(--text)]" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-[var(--text)]">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.role}</div>
                    </div>
                </div>
            )
        },
        { key: 'description', label: 'Описание', render: (row) => <span className="text-xs text-gray-400 line-clamp-2">{row.description}</span> },
        { key: 'status', label: 'Статус', render: (row) => <StatusBadge status={row.status} pulse={row.status === 'active'} /> },
        {
            key: 'actions',
            label: 'Действия',
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => startChat('ai', row.id, row.name)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors" title="Чат">
                        <MessageSquare size={14} />
                    </button>
                    <button onClick={() => toggleAgent(row.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors" title="Вкл/Выкл">
                        <Power size={14} />
                    </button>
                    <button onClick={() => removeAgent(row.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors" title="Удалить">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bot size={18} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">AI Агенты</h2>
                    <StatusBadge status="active" label={`${agents.filter(a => a.status === 'active').length} онлайн`} pulse />
                </div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-sm text-purple-400 font-medium hover:bg-purple-500/30 transition-colors">
                    <Plus size={16} /> Добавить агента
                </button>
            </div>

            {showAdd && (
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--text)]">Новый AI Агент</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название" className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-purple-500/30" />
                        <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Роль (например: Аналитика)" className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-purple-500/30" />
                        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание" className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-purple-500/30" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs text-gray-300 hover:bg-white/5">Отмена</button>
                        <button onClick={() => { addAgent(form); setShowAdd(false); setForm({ name: '', role: '', description: '' }) }} className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-xs text-purple-400 hover:bg-purple-500/30">Создать</button>
                    </div>
                </div>
            )}

            <DataTable data={agents} columns={columns} emptyText="Нет агентов" />
        </div>
    )
}
