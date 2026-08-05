// ============================================
// OmegaChatWidget — draggable floating companion orb for OMEGA
// [P16-FIX] drag-to-move, luxury glass UI, mobile full-screen swipe-down
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MessageSquare, Minimize2 } from 'lucide-react'
import { OmegaChatContainer } from './OmegaChat.jsx'
import { playSound } from '../../hooks/useSound.js'

const WIDGET_WIDTH = 380
const WIDGET_HEIGHT = 600
const ORB_SIZE = 64 // [P16-HOTFIX] 64px touch target

function useLocalApiKeys() {
    const [keys, setKeys] = useState(() => {
        try {
            const saved = localStorage.getItem('owner_api_keys')
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    useEffect(() => {
        const handler = () => {
            if (document.hidden) return
            try {
                const saved = localStorage.getItem('owner_api_keys')
                setKeys(saved ? JSON.parse(saved) : [])
            } catch {
                setKeys([])
            }
        }
        window.addEventListener('storage', handler)
        const interval = setInterval(handler, 5000)
        return () => {
            window.removeEventListener('storage', handler)
            clearInterval(interval)
        }
    }, [])

    return keys
}

function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

export function OmegaChatWidget({ onOpenApiKeys }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false })
    const apiKeys = useLocalApiKeys()

    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        try {
            const saved = localStorage.getItem('omega_chat_pos')
            if (saved) {
                const parsed = JSON.parse(saved)
                setPosition(parsed)
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        if (!isDragging) {
            localStorage.setItem('omega_chat_pos', JSON.stringify(position))
        }
    }, [position, isDragging])

    const getDefaultPosition = useCallback(() => {
        const isMobile = window.innerWidth < 640
        if (isMobile) {
            return { x: window.innerWidth - ORB_SIZE - 16, y: window.innerHeight - ORB_SIZE - 100 }
        }
        return { x: window.innerWidth - WIDGET_WIDTH - 24, y: window.innerHeight - WIDGET_HEIGHT - 24 }
    }, [])

    useEffect(() => {
        if (position.x === 0 && position.y === 0) {
            setPosition(getDefaultPosition())
        }
    }, [getDefaultPosition, position.x, position.y])

    const handlePointerDown = useCallback((e) => {
        if (e.target.closest('.omega-chat-no-drag')) return
        e.preventDefault()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y,
            moved: false,
        }
        setIsDragging(true)
    }, [position.x, position.y])

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        const dx = clientX - dragRef.current.startX
        const dy = clientY - dragRef.current.startY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            dragRef.current.moved = true
        }
        const maxX = window.innerWidth - (isOpen ? WIDGET_WIDTH : ORB_SIZE)
        const maxY = window.innerHeight - (isOpen ? WIDGET_HEIGHT : ORB_SIZE)
        setPosition({
            x: constrain(dragRef.current.initialX + dx, 0, Math.max(0, maxX)),
            y: constrain(dragRef.current.initialY + dy, 0, Math.max(0, maxY)),
        })
    }, [isDragging, isOpen])

    const handlePointerUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    useEffect(() => {
        if (!isDragging) return
        window.addEventListener('mousemove', handlePointerMove)
        window.addEventListener('mouseup', handlePointerUp)
        window.addEventListener('touchmove', handlePointerMove, { passive: false })
        window.addEventListener('touchend', handlePointerUp)
        return () => {
            window.removeEventListener('mousemove', handlePointerMove)
            window.removeEventListener('mouseup', handlePointerUp)
            window.removeEventListener('touchmove', handlePointerMove)
            window.removeEventListener('touchend', handlePointerUp)
        }
    }, [isDragging, handlePointerMove, handlePointerUp])

    const toggleOpen = useCallback(() => {
        if (isDragging || dragRef.current.moved) return
        setIsOpen(prev => {
            const next = !prev
            if (next) {
                setHasUnread(false)
                // [P19] added: activation sound
                playSound('omega-activate')
            }
            if (next && window.innerWidth >= 640) {
                setPosition(prevPos => ({
                    x: constrain(prevPos.x, 0, Math.max(0, window.innerWidth - WIDGET_WIDTH)),
                    y: constrain(prevPos.y, 0, Math.max(0, window.innerHeight - WIDGET_HEIGHT)),
                }))
            }
            return next
        })
    }, [isDragging])

    const toggleMinimize = useCallback((e) => {
        e.stopPropagation()
        setIsMinimized(prev => !prev)
    }, [])

    const handleClose = useCallback((e) => {
        e.stopPropagation()
        setIsOpen(false)
    }, [])

    const handleHeaderSwipeDown = useCallback((e) => {
        if (window.innerWidth >= 640) return
        const touch = e.changedTouches[0]
        const startY = touch.clientY
        const onTouchEnd = (ev) => {
            const endY = ev.changedTouches[0].clientY
            if (endY - startY > 80) {
                setIsOpen(false)
            }
            window.removeEventListener('touchend', onTouchEnd)
        }
        window.addEventListener('touchend', onTouchEnd)
    }, [])

    return (
        <>
            {isOpen && (
                <div
                    className={`fixed z-[100] ${isMobile ? 'omega-chat-mobile inset-x-0 bottom-0 rounded-t-3xl overflow-hidden bg-[var(--bg-secondary)] border-t border-[var(--border)] shadow-2xl' : ''}`}
                    style={isMobile ? { height: '85vh' } : { left: position.x, top: position.y, width: WIDGET_WIDTH, height: WIDGET_HEIGHT }}
                >
                    <div className={`h-full flex flex-col ${isMobile ? '' : 'glass-card overflow-hidden'} ${isMinimized ? 'h-auto' : ''}`}>
                        <div
                            className="omega-chat-no-drag flex flex-col px-4 py-3 border-b border-[var(--border)] cursor-grab active:cursor-grabbing"
                            onMouseDown={handlePointerDown}
                            onTouchStart={handlePointerDown}
                            onTouchStartCapture={handleHeaderSwipeDown}
                        >
                            <div className="md:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src="/logo.svg"
                                            alt="AI Viral Studio"
                                            className="w-10 h-10 rounded-xl object-contain"
                                            onError={(e) => { e.target.src = '/favicon.svg'; e.target.className = 'w-10 h-10 rounded-xl object-contain bg-violet-600 p-1.5'; }}
                                        />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-[#0a0a0f]"></span>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-white truncate">AI Viral Studio</span>
                                        <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                            OMEGA онлайн
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleMinimize}
                                        className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
                                        aria-label={isMinimized ? 'Развернуть' : 'Свернуть'}
                                    >
                                        {isMinimized ? <MessageSquare size={16} /> : <Minimize2 size={16} />}
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
                                        aria-label="Закрыть"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {!isMinimized && (
                            <div className="flex-1 min-h-0">
                                <OmegaChatContainer apiKeys={apiKeys} onOpenApiKeys={onOpenApiKeys} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isOpen && (
                isMobile ? (
                    <button
                        onClick={toggleOpen}
                        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white text-xl z-50"
                        aria-label="Открыть чат OMEGA"
                    >
                        💬
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--danger)] border-2 border-[var(--bg)] text-[10px] font-bold flex items-center justify-center text-white">
                                !
                            </span>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={toggleOpen}
                        onMouseDown={handlePointerDown}
                        onTouchStart={handlePointerDown}
                        className="fixed z-[100] companion-orb transition-transform hover:scale-105 active:scale-95"
                        style={{ left: position.x, top: position.y }}
                        aria-label="Открыть чат OMEGA"
                    >
                        <MessageSquare size={24} className="text-white" />
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--danger)] border-2 border-[var(--bg)] text-[10px] font-bold flex items-center justify-center text-white">
                                !
                            </span>
                        )}
                    </button>
                )
            )}
        </>
    )
}

export default OmegaChatWidget
