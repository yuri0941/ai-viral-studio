import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useModalA11y } from '../../../../hooks/useModalA11y.js'

export function ModalShell({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', footer }) {
    // [B4-DOP-2-UI-GATE] ① Esc ② focus-trap + возврат фокуса на триггер
    const dialogRef = useModalA11y(onClose, isOpen)

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={`relative w-full ${maxWidth} bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
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
