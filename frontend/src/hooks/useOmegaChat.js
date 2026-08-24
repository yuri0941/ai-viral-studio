// ============================================
// useOmegaChat — управление чатом с OMEGA
// ============================================

import { useCallback, useEffect, useState } from 'react'
import { useOmega } from './useOmega.js'
import { useAuth } from '../context/AuthContext.jsx'
import { omegaApi } from '../services/api.js'

const STORAGE_KEY = 'omega_chat_history'

// v6.5.5: demo responses removed — OMEGA retries via server fallback providers.

export function useOmegaChat(options = {}) {
    const omega = useOmega(options)
    const { user } = useAuth()
    const [messages, setMessages] = useState(() => loadHistory())
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    // [MONETIZE-2026-08-04] added: quota exceeded state
    const [quotaError, setQuotaError] = useState(null)

    useEffect(() => {
        saveHistory(messages)
    }, [messages])

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return

        const userMsg = { id: generateId(), role: 'user', text: text.trim(), timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        try {
            const data = await omega.sendChatMessage(userMsg.text, messages, { role: user?.role || 'guest', userId: user?._id || null })
            if (!data) throw new Error('Пустой ответ от OMEGA')
            const reply = {
                id: generateId(),
                role: 'omega',
                text: data.response || '...',
                provider: data.provider,
                memoryId: data.memoryId,
                cached: data.cached,
                decision: data.decision,
                reasoning: data.reasoning || '', // [P17] added
                // [CHAT-UNIFY] карточка анализа и действия (обложка/драфт/best time) из ответа OMEGA
                videoAnalysis: data.videoAnalysis || null,
                action: data.action || null,
                timestamp: new Date().toISOString(),
            }
            setMessages(prev => [...prev, reply])
        } catch (err) {
            // [MONETIZE-2026-08-04] added: handle quota exceeded (402)
            const isQuota = /402|QUOTA_EXCEEDED|Генерации исчерпаны|Лимит/i.test(err.message || '')
            if (isQuota) {
                setQuotaError({ used: 0, limit: 0 })
                setMessages(prev => [...prev, {
                    id: generateId(),
                    role: 'omega',
                    text: '⚡ Лимит генераций исчерпан. Чтобы продолжить, перейдите на платный тариф.',
                    quota: true,
                    timestamp: new Date().toISOString(),
                }])
            } else {
                const retryId = generateId()
                setMessages(prev => [...prev, {
                    id: retryId,
                    role: 'omega',
                    text: 'OMEGA переключает сервер... Подождите 3 секунды',
                    temporary: true,
                    timestamp: new Date().toISOString(),
                }])
                await new Promise(resolve => setTimeout(resolve, 3000))
                try {
                    const data = await omega.sendChatMessage(userMsg.text, messages, { role: user?.role || 'guest', userId: user?._id || null })
                    if (!data) throw new Error('Пустой ответ от OMEGA')
                    const reply = {
                        id: generateId(),
                        role: 'omega',
                        text: data.response || '...',
                        provider: data.provider,
                        memoryId: data.memoryId,
                        cached: data.cached,
                        decision: data.decision,
                        reasoning: data.reasoning || '',
                        // [CHAT-UNIFY] карточка анализа и действия — и в retry-ветке
                        videoAnalysis: data.videoAnalysis || null,
                        action: data.action || null,
                        timestamp: new Date().toISOString(),
                    }
                    setMessages(prev => [...prev.filter(m => m.id !== retryId), reply])
                } catch (retryErr) {
                    setMessages(prev => [...prev.filter(m => m.id !== retryId), {
                        id: generateId(),
                        role: 'omega',
                        text: '⚠️ Сервер временно недоступен. OMEGA переключает резервный канал... Повторите запрос через 10 сек.',
                        isError: true,
                        error: retryErr.message,
                        timestamp: new Date().toISOString(),
                    }])
                }
            }
        } finally {
            setIsTyping(false)
        }
    }, [messages, omega, user])

    const clearHistory = useCallback(() => {
        setMessages([])
        localStorage.removeItem(STORAGE_KEY)
    }, [])

    const removeMessage = useCallback((id) => {
        setMessages(prev => prev.filter(m => m.id !== id))
    }, [])

    const rateMessage = useCallback(async (messageId, rating) => {
        const msg = messages.find(m => m.id === messageId)
        if (!msg?.memoryId) return
        try {
            await omegaApi.rate(msg.memoryId, rating)
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, userRating: rating } : m))
        } catch (err) {
            console.error('[useOmegaChat] rate failed:', err)
        }
    }, [messages])

    return {
        ...omega,
        messages,
        input,
        setInput,
        isTyping,
        quotaError,
        sendMessage,
        clearHistory,
        removeMessage,
        rateMessage,
    }
}

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

function saveHistory(messages) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)))
    } catch {
        // ignore
    }
}

function generateId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export default useOmegaChat
