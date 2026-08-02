import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

export function ToastContainer({ toasts, onRemove, position = 'bottom-right' }) {
    if (!toasts?.length) return null

    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'top-right': 'top-6 right-6',
        'top-left': 'top-6 left-6',
    }

    const typeConfig = {
        error: { border: 'border-l-[var(--danger)]', icon: AlertCircle, iconColor: 'text-[var(--danger)]', bg: 'bg-[var(--danger)]/5' },
        success: { border: 'border-l-[var(--success)]', icon: CheckCircle, iconColor: 'text-[var(--success)]', bg: 'bg-[var(--success)]/5' },
        info: { border: 'border-l-[var(--accent)]', icon: Info, iconColor: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/5' },
    }

    return (
        <div className={`fixed z-[110] space-y-3 ${positionClasses[position] || positionClasses['bottom-right']}`}>
            {toasts.map(t => {
                const config = typeConfig[t.type] || typeConfig.info
                const Icon = config.icon
                return (
                    <div
                        key={t.id}
                        className={`relative flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--border)] border-l-4 ${config.border} ${config.bg} shadow-lg toast-slide-in overflow-hidden min-w-[280px] max-w-[420px]`}
                    >
                        <div className={`mt-0.5 ${config.iconColor}`}><Icon size={16} /></div>
                        <span className="text-sm font-medium text-[var(--text)] flex-1">{t.message}</span>
                        <button
                            onClick={() => onRemove?.(t.id)}
                            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            aria-label="Закрыть"
                        >
                            <X size={14} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--border-strong)]/30">
                            <div className="h-full toast-progress" />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
