import { useState } from 'react'
import { HelpCircle, BookOpen, ExternalLink, ChevronDown, ChevronUp, Search } from 'lucide-react'

const FAQS = [
    {
        q: 'Как добавить нового сотрудника?',
        a: 'Перейдите во вкладку «Команда» и нажмите кнопку «Добавить сотрудника». Заполните имя, email, роль и отдел. Сотрудник получит доступ в соответствии с выбранной ролью.',
    },
    {
        q: 'Как настроить API-ключи?',
        a: 'Откройте вкладку «API Keys». Добавьте ключи Groq, OpenRouter, YouTube и Replicate. Активные ключи отображаются со статусом Active. Ключи хранятся локально в браузере.',
    },
    {
        q: 'Что умеет OMEGA Core?',
        a: 'OMEGA Core — центральное AI-ядро платформы. Оно анализирует цены, прогнозирует доходы, мониторит безопасность, оптимизирует рекламные кампании и может выполнять команды через чат.',
    },
    {
        q: 'Как работает биллинг?',
        a: 'Во вкладке «Финансы» отображаются доходы, расходы и прибыль. Платежи можно добавлять вручную или загружать через API. Кнопка «Сбросить демо-данные» вернёт начальные значения.',
    },
    {
        q: 'Как подключить соцсети?',
        a: 'Вкладка «Интеграции» позволяет подключить YouTube, TikTok, Instagram, Telegram и другие платформы. После подключения статистика синхронизируется автоматически.',
    },
]

const GUIDES = [
    { title: 'Быстрый старт Owner', url: '#', icon: BookOpen },
    { title: 'Документация OMEGA Core', url: '#', icon: BookOpen },
    { title: 'Интеграция API', url: '#', icon: ExternalLink },
    { title: 'Роли и доступы', url: '#', icon: BookOpen },
]

export function HelpTab() {
    const [open, setOpen] = useState({})
    const [search, setSearch] = useState('')

    const toggle = (idx) => setOpen(prev => ({ ...prev, [idx]: !prev[idx] }))

    const filtered = FAQS.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">Помощь и документация</h2>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск по FAQ..."
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-purple-500/30"
                />
            </div>

            {/* Guides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GUIDES.map((guide, i) => (
                    <a
                        key={i}
                        href={guide.url}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-white/15 transition-all group"
                    >
                        <guide.icon size={18} className="text-emerald-400" />
                        <span className="text-sm text-[var(--text)] flex-1">{guide.title}</span>
                        <ExternalLink size={14} className="text-gray-500 group-hover:text-[var(--text)] transition-colors" />
                    </a>
                ))}
            </div>

            {/* FAQ */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Частые вопросы</h3>
                {filtered.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">Ничего не найдено</div>
                )}
                {filtered.map((faq, i) => (
                    <div key={i} className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
                        <button type="button"
                            onClick={() => toggle(i)}
                            className="w-full flex items-center justify-between p-4 text-left"
                        >
                            <span className="text-sm text-[var(--text)]">{faq.q}</span>
                            {open[i] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>
                        {open[i] && (
                            <div className="px-4 pb-4 text-xs text-gray-400 leading-relaxed border-t border-[var(--border)] pt-3">
                                {faq.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default HelpTab
