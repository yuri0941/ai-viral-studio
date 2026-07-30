// ============================================
// CreateAgentModal — создание AI-агента
// ============================================

import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'

const ROLES = [
    { value: 'analyst', label: 'Аналитик' },
    { value: 'support', label: 'Поддержка' },
    { value: 'content', label: 'Контент' },
    { value: 'sales', label: 'Продажи' },
    { value: 'security', label: 'Безопасность' },
    { value: 'finance', label: 'Финансы' },
    { value: 'dev', label: 'Разработка' },
]

const MODELS = [
    { value: 'groq/llama3-70b', label: 'Groq Llama 3 70B' },
    { value: 'openrouter/gpt-4o', label: 'OpenRouter GPT-4o' },
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o mini' },
]

export function CreateAgentModal({ isOpen, onClose, onCreate }) {
    const [form, setForm] = useState({
        name: '',
        role: 'analyst',
        model: 'groq/llama3-70b',
        description: '',
        autonomy: 50,
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name) return
        onCreate({
            id: Date.now(),
            ...form,
            status: 'active',
            createdAt: new Date().toISOString(),
        })
        setForm({ name: '', role: 'analyst', model: 'groq/llama3-70b', description: '', autonomy: 50 })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Создать AI-агента" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Название агента</label>
                    <input
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        placeholder="Например, Pricing Agent"
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
                        <label className="block text-xs text-gray-400 mb-1.5">Модель</label>
                        <select
                            value={form.model}
                            onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        >
                            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Описание</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30 resize-none"
                        placeholder="Что делает агент..."
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                        Уровень автономности: <span className="text-white font-medium">{form.autonomy}%</span>
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={form.autonomy}
                        onChange={e => setForm(p => ({ ...p, autonomy: parseInt(e.target.value, 10) }))}
                        className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>Только советы</span>
                        <span>Действует с подтверждением</span>
                        <span>Полная автономия</span>
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

export default CreateAgentModal
