import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'

export function CreateNewsModal({ isOpen, onClose, onCreate }) {
    const [form, setForm] = useState({ title: '', content: '', status: 'draft' })

    const handleSubmit = (e) => {
        e.preventDefault()
        onCreate(form)
        setForm({ title: '', content: '', status: 'draft' })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Новая новость" maxWidth="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Заголовок" required
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Содержание..." rows={5} required
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30 resize-none" />
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30">
                    <option value="draft">Черновик</option><option value="published">Опубликовать сразу</option>
                </select>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">Отмена</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">Сохранить</button>
                </div>
            </form>
        </ModalShell>
    )
}
