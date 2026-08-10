import { X } from 'lucide-react'
import { useEffect } from 'react'

export function ModalShell({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', footer }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        if (isOpen) {
            document.addEventListener('keydown', handler)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${maxWidth} bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
