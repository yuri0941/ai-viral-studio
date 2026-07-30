import { X } from 'lucide-react'

export function ToastContainer({ toasts, onRemove, position = 'bottom-right' }) {
    if (!toasts?.length) return null

    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'top-right': 'top-6 right-6',
        'top-left': 'top-6 left-6',
    }

    return (
        <div className={`fixed z-[110] space-y-2 ${positionClasses[position] || positionClasses['bottom-right']}`}>
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right ${
                        t.type === 'error'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                >
                    <span className="text-sm font-medium">{t.message}</span>
                    <button
                        onClick={() => onRemove?.(t.id)}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    )
}
