// ============================================
// SendEmailModal — отправка email из дашборда
// ============================================

import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'

const TEMPLATES = [
    { value: '', label: 'Без шаблона' },
    { value: 'welcome', label: 'Приветственное письмо' },
    { value: 'invoice', label: 'Счёт на оплату' },
    { value: 'reminder', label: 'Напоминание' },
    { value: 'report', label: 'Еженедельный отчёт' },
]

const TEMPLATE_BODIES = {
    welcome: 'Добро пожаловать в AI Viral Studio!\n\nМы рады, что вы с нами.',
    invoice: 'Здравствуйте!\n\nПрикрепляем счёт на оплату. Пожалуйста, проверьте реквизиты.',
    reminder: 'Напоминаем о предстоящем дедлайне.\n\nЕсли нужна помощь — напишите нам.',
    report: 'Здравствуйте!\n\nПрикрепляем еженедельный отчёт по ключевым метрикам.',
}

export function SendEmailModal({ isOpen, onClose, onSend, recipients = [] }) {
    const [form, setForm] = useState({
        to: '',
        subject: '',
        body: '',
    })

    const applyTemplate = (key) => {
        if (!key) return
        const body = TEMPLATE_BODIES[key]
        if (body) setForm(p => ({ ...p, body }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.to || !form.subject || !form.body) return
        onSend({
            id: Date.now(),
            ...form,
            sentAt: new Date().toISOString(),
        })
        setForm({ to: '', subject: '', body: '' })
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Отправить email" maxWidth="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Кому</label>
                    <select
                        value={form.to}
                        onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        required
                    >
                        <option value="">Выберите получателя</option>
                        {recipients.map(r => (
                            <option key={r.id} value={r.email}>{r.name} ({r.email})</option>
                        ))}
                        <option value="custom">Свой адрес...</option>
                    </select>
                </div>

                {form.to === 'custom' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Email получателя</label>
                        <input
                            type="email"
                            value={form.to === 'custom' ? '' : form.to}
                            onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                            placeholder="client@example.com"
                            required
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Шаблон</label>
                    <select
                        onChange={e => applyTemplate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        defaultValue=""
                    >
                        {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Тема</label>
                    <input
                        value={form.subject}
                        onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30"
                        placeholder="Тема письма"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Сообщение</label>
                    <textarea
                        value={form.body}
                        onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                        rows={6}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30 resize-none"
                        placeholder="Текст письма..."
                        required
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                        Отмена
                    </button>
                    <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors">
                        Отправить
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}

export default SendEmailModal
