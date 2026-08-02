import { useState } from 'react'
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'

const STORAGE_KEY = 'owner_feedback'

const INITIAL_FEEDBACK = [
    { id: '1', title: 'Добавить dark mode', body: 'Хочется переключатель тёмной темы в настройках.', status: 'in_review', type: 'feature', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: '2', title: 'Баг с загрузкой видео', body: 'В планировщике не загружается видео больше 50MB.', status: 'resolved', type: 'bug', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: '3', title: 'Новый тариф для стартапов', body: 'Предлагаю тариф между Creator и Pro для небольших команд.', status: 'open', type: 'idea', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
]

const STATUS_META = {
    open: { label: 'Открыто', icon: MessageSquare, color: 'blue' },
    in_review: { label: 'На рассмотрении', icon: Clock, color: 'yellow' },
    resolved: { label: 'Решено', icon: CheckCircle, color: 'emerald' },
    closed: { label: 'Закрыто', icon: AlertCircle, color: 'gray' },
}

export function FeedbackTab({ data }) {
    const { showToast } = data
    const [items, setItems] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : INITIAL_FEEDBACK
        } catch {
            return INITIAL_FEEDBACK
        }
    })
    const [form, setForm] = useState({ title: '', body: '', type: 'feature' })

    const save = (next) => {
        setItems(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }

    const submit = (e) => {
        e.preventDefault()
        if (!form.title.trim() || !form.body.trim()) return
        const newItem = {
            id: Date.now().toString(),
            title: form.title.trim(),
            body: form.body.trim(),
            status: 'open',
            type: form.type,
            createdAt: new Date().toISOString(),
        }
        save([newItem, ...items])
        setForm({ title: '', body: '', type: 'feature' })
        showToast?.('Обращение отправлено')
    }

    const statusOrder = ['open', 'in_review', 'resolved', 'closed']
    const sorted = [...items].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">Обратная связь</h2>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)]">Новое обращение</h3>
                <div>
                    <label className="text-[10px] text-gray-500 mb-1.5 block">Тема</label>
                    <input
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="Кратко опишите проблему или идею"
                        className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-purple-500/30"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 mb-1.5 block">Описание</label>
                    <textarea
                        value={form.body}
                        onChange={e => setForm({ ...form, body: e.target.value })}
                        placeholder="Подробности..."
                        rows={3}
                        className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-purple-500/30 resize-none"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        className="bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-purple-500/30"
                    >
                        <option value="feature">Feature</option>
                        <option value="bug">Bug</option>
                        <option value="idea">Idea</option>
                        <option value="other">Other</option>
                    </select>
                    <button
                        type="submit"
                        disabled={!form.title.trim() || !form.body.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                    >
                        <Send size={14} /> Отправить
                    </button>
                </div>
            </form>

            {/* List */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--text)]">История обращений</h3>
                {sorted.length === 0 && <div className="text-center text-gray-500 text-sm py-8">Нет обращений</div>}
                {sorted.map(item => {
                    const meta = STATUS_META[item.status] || STATUS_META.open
                    return (
                        <div key={item.id} className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-[var(--text)] mb-1">{item.title}</div>
                                    <div className="text-xs text-gray-400">{item.body}</div>
                                </div>
                                <StatusBadge status={meta.color} label={meta.label} />
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{item.type}</span>
                                <span>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default FeedbackTab
