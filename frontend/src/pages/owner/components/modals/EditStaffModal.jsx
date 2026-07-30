import { useState, useEffect } from 'react'
import { ModalShell } from '../common/ModalShell'

export function EditStaffModal({ isOpen, onClose, staff, onUpdate }) {
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)

    useEffect(() => {
        if (staff) { setLogin(staff.email || ''); setPassword('') }
    }, [staff])

    const handleSubmit = (e) => {
        e.preventDefault()
        onUpdate(staff.id, { email: login, ...(password && { password }) })
        onClose()
    }

    if (!staff) return null

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title={`Редактировать: ${staff.name}`} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Логин (Email)</label>
                    <input
                        type="email"
                        value={login}
                        onChange={e => setLogin(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Новый пароль (оставьте пустым чтобы не менять)</label>
                    <div className="relative">
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 pr-16 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
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
                        Сохранить
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}
