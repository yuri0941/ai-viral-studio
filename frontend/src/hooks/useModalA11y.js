// [B4-DOP-2-UI-GATE] Общая a11y-механика модалок по гейту «Не ИИ-вёрстка»:
// ① Escape закрывает модалку ② focus-trap (Tab/Shift+Tab циклятся внутри,
// фокус возвращается на триггер после закрытия).
// Использование: const ref = useModalA11y(onClose, isOpen); <div ref={ref} role="dialog" aria-modal="true">…</div>
import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalA11y(onClose, isOpen = true) {
    const ref = useRef(null)
    const triggerRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return undefined
        triggerRef.current = document.activeElement
        // ref на контейнер модалки; fallback — первый открытый [role="dialog"] в DOM
        const node = ref.current || document.querySelector('[role="dialog"][aria-modal="true"]')
        if (!node) return undefined

        const focusables = node.querySelectorAll(FOCUSABLE)
        if (focusables.length) focusables[0].focus()

        const handler = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose?.()
                return
            }
            if (e.key !== 'Tab') return
            const items = node.querySelectorAll(FOCUSABLE)
            if (!items.length) return
            const first = items[0]
            const last = items[items.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', handler, true)
        return () => {
            document.removeEventListener('keydown', handler, true)
            triggerRef.current?.focus?.()
        }
    }, [onClose, isOpen])

    return ref
}

export default useModalA11y
