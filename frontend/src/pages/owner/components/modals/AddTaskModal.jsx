// ============================================
// AddTaskModal — создание новой задачи
// ============================================

import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'

const PRIORITIES = [
    { value: 'low', label: 'Низкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'high', label: 'Высокий' },
]

const STATUSES = [
    { value: 'todo', label: 'К выполнению' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'review', label: 'На проверке' },
    { value: 'done', label: 'Готово' },
]

export function AddTaskModal({ isOpen, onClose, onAdd, staffList = [] }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.title) return
        onAdd({
            ...form,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        })
        setForm({ title: '', description: '', assignee: '', priority: 'medium', status: 'todo', dueDate: '' })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Новая задача" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Название</label>
                    <input
                        value={form.title}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        placeholder="Например, обновить лендинг"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Описание</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30 resize-none"
                        placeholder="Подробности задачи..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Исполнитель</label>
                        <select
                            value={form.assignee}
                            onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            <option value="">Не назначен</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Срок</label>
                        <input
                            type="date"
                            value={form.dueDate}
                            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Приоритет</label>
                        <select
                            value={form.priority}
                            onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Статус</label>
                        <select
                            value={form.status}
                            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                        Отмена
                    </button>
                    <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
                        Создать
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}

export default AddTaskModal
