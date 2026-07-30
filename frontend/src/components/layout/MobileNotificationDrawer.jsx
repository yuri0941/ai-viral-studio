import { Bell, X, Trash2 } from 'lucide-react'

const NOTIFICATION_ICONS = {
    campaign: Bell,
    subscription: Bell,
    ai: Bell,
    trend: Bell,
    system: Bell,
    default: Bell,
}

export function MobileNotificationDrawer({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onDelete }) {
    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            <div
                className={`fixed bottom-0 left-0 right-0 bg-[#0f0f1a] border-t border-white/[0.06] z-50 transform transition-transform duration-300 ease-in-out rounded-t-2xl shadow-2xl lg:hidden max-h-[70vh] flex flex-col ${
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#00ff41]" />
                        <h2 className="text-base font-semibold text-white">Уведомления</h2>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllRead}
                                className="text-xs text-[#00ff41] hover:underline px-2 py-1"
                            >
                                Все прочитать
                            </button>
                        )}
                        <button onClick={onClose} className="p-1">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <Bell className="w-10 h-10 mb-2 opacity-30" />
                            <p className="text-sm">Нет уведомлений</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            const Icon = NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default
                            return (
                                <div
                                    key={n.id}
                                    onClick={() => onMarkRead?.(n.id)}
                                    className={`p-3 rounded-xl cursor-pointer border ${
                                        n.read
                                            ? 'bg-white/[0.02] border-white/[0.05]'
                                            : 'bg-[#00ff41]/5 border-[#00ff41]/20'
                                    }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="p-2 rounded-lg bg-white/5 shrink-0">
                                            <Icon className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className={`text-sm font-medium ${n.read ? 'text-gray-300' : 'text-white'}`}>
                                                    {n.title}
                                                </h3>
                                                {!n.read && <div className="w-2 h-2 bg-[#00ff41] rounded-full shrink-0 mt-1" />}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-gray-500">{n.time}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete?.(n.id) }}
                                                    className="p-1 rounded hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </>
    )
}
