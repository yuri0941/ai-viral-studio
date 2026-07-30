import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'

export function CreateCampaignModal({ isOpen, onClose, onCreate }) {
    const [form, setForm] = useState({ name: '', client: '', budget: '', platform: 'YouTube', startDate: '', endDate: '' })

    const handleSubmit = (e) => {
        e.preventDefault()
        onCreate({ ...form, budget: parseFloat(form.budget) || 0 })
        setForm({ name: '', client: '', budget: '', platform: 'YouTube', startDate: '', endDate: '' })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Новая рекламная кампания" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название кампании" required
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Клиент / компания" required
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="Бюджет ($)" required
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                    <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30">
                        <option>YouTube</option><option>TikTok</option><option>Instagram</option><option>Telegram</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Старт</label>
                        <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Конец</label>
                        <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">Отмена</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">Создать</button>
                </div>
            </form>
        </ModalShell>
    )
}
