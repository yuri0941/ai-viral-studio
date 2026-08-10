import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[95vw] max-h-[90vh] overflow-y-auto ${maxWidth} glass-card rounded-[var(--radius-xl)] scale-100 animate-in zoom-in-95 duration-200 max-sm:max-w-full max-sm:w-full max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-t-2xl`}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                    <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                        aria-label="Закрыть"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">
                    {children}
                </div>
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
