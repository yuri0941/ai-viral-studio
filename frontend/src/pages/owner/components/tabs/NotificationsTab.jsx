import { useState, useMemo } from 'react'
import { Bell, Check, Trash2, Filter } from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'

const STORAGE_KEY = 'owner_notifications_center'

const TYPE_FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'system', label: 'Системные' },
    { id: 'finance', label: 'Финансы' },
    { id: 'campaign', label: 'Кампании' },
    { id: 'ai', label: 'AI' },
    { id: 'approval', label: 'Утверждения' },
    { id: 'chat', label: 'Чаты' },
    { id: 'security', label: 'Безопасность' },
]

const INITIAL_NOTIFICATIONS = [
    { id: '1', type: 'finance', title: 'Платёж $15,000 получен', body: 'Enterprise-подписка оплачена.', read: false, createdAt: new Date().toISOString() },
    { id: '2', type: 'campaign', title: 'TechBrand Promo на утверждении', body: 'Кампания ожидает вашего одобрения.', read: false, createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
    { id: '3', type: 'ai', title: 'OMEGA: рекомендация по цене', body: 'Цену Pro можно повысить на $5.', read: true, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: '4', type: 'system', title: 'Технические работы завершены', body: 'Все сервисы работают штатно.', read: true, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: '5', type: 'security', title: 'Новый вход с неизвестного IP', body: 'IP: 91.203.45.78, Санкт-Петербург.', read: false, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
]

export function NotificationsTab({ data }) {
    const { showToast } = data
    const [filter, setFilter] = useState('all')
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS
        } catch {
            return INITIAL_NOTIFICATIONS
        }
    })

    const save = (next) => {
        setNotifications(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }

    const markRead = (id) => {
        save(notifications.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const markAllRead = () => {
        save(notifications.map(n => ({ ...n, read: true })))
        showToast?.('Все уведомления прочитаны')
    }

    const remove = (id) => {
        save(notifications.filter(n => n.id !== id))
    }

    const clearAll = () => {
        if (!window.confirm('Удалить все уведомления?')) return
        save([])
    }

    const filtered = useMemo(() => {
        let list = [...notifications]
        if (filter !== 'all') list = list.filter(n => n.type === filter)
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }, [notifications, filter])

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell size={20} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Уведомления</h2>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">{unreadCount}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-300 hover:text-[var(--text)] hover:bg-white/10 transition-colors">
                        <Check size={12} /> Прочитать все
                    </button>
                    <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={12} /> Очистить
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter size={14} className="text-gray-500 shrink-0" />
                {TYPE_FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                            filter === f.id
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                : 'text-gray-400 hover:text-[var(--text)] hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-2">
                {filtered.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-12">Нет уведомлений</div>
                )}
                {filtered.map(n => (
                    <div
                        key={n.id}
                        className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                            n.read
                                ? 'bg-[var(--bg-secondary)] border-[var(--border)] opacity-70'
                                : 'bg-white/[0.02] border-purple-500/20'
                        }`}
                    >
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.read ? 'bg-gray-600' : 'bg-purple-400 animate-pulse'}`} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <StatusBadge status={n.type} label={n.type} />
                                <span className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="text-sm font-medium text-[var(--text)] mb-0.5">{n.title}</div>
                            <div className="text-xs text-gray-400">{n.body}</div>
                        </div>
                        <div className="flex items-center gap-1">
                            {!n.read && (
                                <button
                                    onClick={() => markRead(n.id)}
                                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                    title="Прочитать"
                                >
                                    <Check size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => remove(n.id)}
                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Удалить"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default NotificationsTab
