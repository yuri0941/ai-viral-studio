import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'
import { DEPARTMENTS } from '../../utils/constants'

// [STAFF-DOP] системные роли аккаунта (не путать с должностью): staff — кабинет поддержки, admin — админ-кабинет.
// owner сюда не входит: сотрудник не может стать владельцем (белый список ролей Б3).
const ACCOUNT_ROLES = [
    { value: 'staff', label: 'Поддержка (staff)' },
    { value: 'admin', label: 'Админ (admin)' },
]

export function AddStaffModal({ isOpen, onClose, onAdd }) {
    const [form, setForm] = useState({ name: '', email: '', role: 'staff', department: 'support', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    // [STAFF-DOP] после создания показываем временный пароль один раз — дальше он не хранится в открытом виде
    const [created, setCreated] = useState(null)

    const reset = () => {
        setForm({ name: '', email: '', role: 'staff', department: 'support', password: '' })
        setShowPass(false)
        setError('')
        setCreated(null)
    }

    const handleClose = () => { reset(); onClose() }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name || !form.email) return
        setBusy(true)
        setError('')
        try {
            const result = await onAdd(form)
            if (result?.tempPassword) {
                setCreated({ email: form.email, password: result.tempPassword, role: form.role })
            } else {
                handleClose()
            }
        } catch (err) {
            setError(err?.message || 'Не удалось создать сотрудника')
        } finally {
            setBusy(false)
        }
    }

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} title="Добавить сотрудника" maxWidth="max-w-md">
            {created ? (
                <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                        <p className="text-sm text-emerald-400 font-medium mb-2">✅ Аккаунт создан</p>
                        <p className="text-xs text-gray-400">Логин</p>
                        <p className="text-sm text-white font-mono break-all">{created.email}</p>
                        <p className="text-xs text-gray-400 mt-2">Временный пароль</p>
                        <p className="text-sm text-white font-mono break-all select-all">{created.password}</p>
                        <p className="text-xs text-amber-400/90 mt-3">Сохраните пароль сейчас — после закрытия окна он больше не показывается. Сотрудник входит на /login и попадает в кабинет /staff.</p>
                    </div>
                    <button type="button" onClick={handleClose} className="w-full px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
                        Готово
                    </button>
                </div>
            ) : (
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
                        <label className="block text-xs text-gray-400 mb-1.5">Роль аккаунта</label>
                        <select
                            value={form.role}
                            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            {ACCOUNT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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
                    <label className="block text-xs text-gray-400 mb-1.5">Пароль <span className="text-gray-600">(пусто — сгенерируется автоматически)</span></label>
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
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                        Отмена
                    </button>
                    <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                        {busy ? 'Создание…' : 'Добавить'}
                    </button>
                </div>
            </form>
            )}
        </ModalShell>
    )
}
