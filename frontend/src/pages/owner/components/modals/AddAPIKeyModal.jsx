// ============================================
// AddAPIKeyModal — добавление API-ключа
// ============================================

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ModalShell } from '../common/ModalShell'

const PROVIDERS = [
    { value: 'groq', label: 'Groq' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'youtube', label: 'YouTube Data API' },
    { value: 'replicate', label: 'Replicate' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'other', label: 'Другое' },
]

export function AddAPIKeyModal({ isOpen, onClose, onAdd }) {
    const [form, setForm] = useState({
        provider: 'groq',
        label: '',
        value: '',
    })
    const [showKey, setShowKey] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.value) return
        onAdd({
            id: Date.now(),
            provider: form.provider,
            label: form.label.trim() || PROVIDERS.find(p => p.value === form.provider)?.label || form.provider,
            value: form.value,
            createdAt: new Date().toISOString(),
        })
        setForm({ provider: 'groq', label: '', value: '' })
        setShowKey(false)
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Добавить API-ключ" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Провайдер</label>
                    <select
                        value={form.provider}
                        onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                    >
                        {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Название (необязательно)</label>
                    <input
                        value={form.label}
                        onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        placeholder="Например, Groq Production"
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Ключ</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={form.value}
                            onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                            className="w-full px-3 py-2.5 pr-10 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                            placeholder="sk-... или gsk_..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
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

export default AddAPIKeyModal
