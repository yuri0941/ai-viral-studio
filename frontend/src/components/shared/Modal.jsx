import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className={`relative w-full ${maxWidth} rounded-2xl bg-[#0f0f1a] border border-white/10 shadow-2xl`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="text-base font-semibold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="px-5 py-5">
                    {children}
                </div>
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
