import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'
import { DEPARTMENTS, ROLES } from '../../utils/constants'

export function AddStaffModal({ isOpen, onClose, onAdd }) {
    const [form, setForm] = useState({ name: '', email: '', role: 'manager', department: 'sales', password: '' })
    const [showPass, setShowPass] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name || !form.email) return
        onAdd(form)
        setForm({ name: '', email: '', role: 'manager', department: 'sales', password: '' })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Добавить сотрудника" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">ФИО</label>
                    <input
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        placeholder="Иванов Иван"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        placeholder="ivan@ai-viral.com"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Роль</label>
                        <select
                            value={form.role}
                            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Отдел</label>
                        <select
                            value={form.department}
                            onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Пароль</label>
                    <div className="relative">
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={form.password}
                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            className="w-full px-3 py-2.5 pr-10 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                            placeholder="••••••"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white">
                            {showPass ? 'Скрыть' : 'Показать'}
                        </button>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                        Отмена
                    </button>
                    <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
                        Добавить
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}
