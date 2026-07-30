// ============================================
// OmegaChatWidget — плавающий чат-виджет OMEGA
// ============================================

import { useState, useEffect } from 'react'
import { Bot, X, MessageSquare } from 'lucide-react'
import { OmegaChatContainer } from './OmegaChat.jsx'

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
            try {
                const saved = localStorage.getItem('owner_api_keys')
                setKeys(saved ? JSON.parse(saved) : [])
            } catch {
                setKeys([])
            }
        }
        window.addEventListener('storage', handler)
        const interval = setInterval(handler, 1000)
        return () => {
            window.removeEventListener('storage', handler)
            clearInterval(interval)
        }
    }, [])

    return keys
}

export function OmegaChatWidget({ onOpenApiKeys }) {
    const [isOpen, setIsOpen] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)
    const apiKeys = useLocalApiKeys()

    // При получении первого сообщения от бота показываем индикатор
    useEffect(() => {
        if (!isOpen) setHasUnread(true)
    }, [isOpen])

    const toggle = () => {
        setIsOpen(prev => !prev)
        if (!isOpen) setHasUnread(false)
    }

    return (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
            {isOpen && (
                <div className="w-[360px] h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <OmegaChatContainer apiKeys={apiKeys} onOpenApiKeys={onOpenApiKeys} />
                </div>
            )}

            <button
                onClick={toggle}
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-lg shadow-purple-900/30 hover:scale-105 transition-transform"
                aria-label={isOpen ? 'Закрыть чат OMEGA' : 'Открыть чат OMEGA'}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] text-[10px] font-bold flex items-center justify-center">
                        !
                    </span>
                )}
                {!isOpen && !hasUnread && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                )}
            </button>
        </div>
    )
}

export default OmegaChatWidget
