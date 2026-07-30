import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'

export function CreatePromoModal({ isOpen, onClose, onCreate }) {
    const [form, setForm] = useState({ code: '', discount: '', type: 'percent', usageLimit: 100, expiry: '' })

    const handleSubmit = (e) => {
        e.preventDefault()
        onCreate({ ...form, discount: parseFloat(form.discount) || 0, usageLimit: parseInt(form.usageLimit) || 100 })
        setForm({ code: '', discount: '', type: 'percent', usageLimit: 100, expiry: '' })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Новый промокод" maxWidth="max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="PROMO2026" required
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} placeholder="Скидка" required
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30">
                        <option value="percent">%</option><option value="fixed">$</option>
                    </select>
                </div>
                <input type="number" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} placeholder="Лимит использований"
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                <input type="date" value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))} required
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">Отмена</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">Создать</button>
                </div>
            </form>
        </ModalShell>
    )
}
