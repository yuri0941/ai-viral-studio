// ============================================
// useOmegaChat — управление чатом с OMEGA
// ============================================

import { useCallback, useEffect, useState } from 'react'
import { useOmega } from './useOmega.js'
import { omegaApi } from '../services/api.js'

const STORAGE_KEY = 'omega_chat_history'

const DEMO_RESPONSES = [
    {
        keywords: ['привет', 'здравствуй', 'hello', 'hi'],
        response: 'Привет! Я OMEGA — твой AI-ассистент. Сейчас все провайдеры недоступны, но я работаю в демо-режиме. Задай вопрос по аналитике, финансам или задачам.'
    },
    {
        keywords: ['доход', 'revenue', 'финанс', 'finance', 'деньги', 'money'],
        response: 'В демо-режиме: за последние 30 дней доход ~$42,500. Основные источники: подписки (65%), реклама (25%), партнёрки (10%). Для точных цифр подключите AI-провайдера или проверьте FinanceTab.'
    },
    {
        keywords: ['задач', 'task', 'todo', 'работа'],
        response: 'В демо-режиме: у вас 12 активных задач, 4 просрочены. Рекомендация — эскалировать просроченные задачи владельцу или назначить ответственных.'
    },
    {
        keywords: ['аналитик', 'analytics', 'статистика', 'метрики'],
        response: 'В демо-режиме: DAU 8,420 (+12%), конверсия в подписку 3.4%, средний чек $47. Для полного анализа подключите API-ключ.'
    },
    {
        keywords: ['сервер', 'server', 'нагрузка', 'uptime'],
        response: 'В демо-режиме: 3 сервера онлайн, uptime 99.7%, средняя загрузка CPU 34%. Сервер Frankfurt-1 показывает повышенную задержку.'
    },
    {
        keywords: ['кампан', 'campaign', 'реклам'],
        response: 'В демо-режиме: активно 4 кампании, CTR 2.1%, расход $3,200. Рекомендация — увеличить бюджет на кампанию с CTR >3%.'
    }
]

function getDemoResponse(text) {
    const lower = text.toLowerCase()
    const match = DEMO_RESPONSES.find(item => item.keywords.some(k => lower.includes(k)))
    return match?.response || 'Я работаю в демо-режиме, потому что все AI-провайдеры сейчас недоступны. Попробуйте вопросы по доходам, задачам, аналитике, серверам или кампаниям.'
}

export function useOmegaChat(options = {}) {
    const omega = useOmega(options)
    const [messages, setMessages] = useState(() => loadHistory())
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [demoMode, setDemoMode] = useState(false)

    useEffect(() => {
        saveHistory(messages)
    }, [messages])

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return

        const userMsg = { id: generateId(), role: 'user', text: text.trim(), timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)
        setDemoMode(false)

        try {
            const data = await omega.sendChatMessage(userMsg.text, messages)
            if (!data) throw new Error('Пустой ответ от OMEGA')
            const reply = {
                id: generateId(),
                role: 'omega',
                text: data.response || '...',
                provider: data.provider,
                memoryId: data.memoryId,
                cached: data.cached,
                decision: data.decision,
                timestamp: new Date().toISOString(),
            }
            setMessages(prev => [...prev, reply])
        } catch (err) {
            setDemoMode(true)
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'omega',
                text: getDemoResponse(userMsg.text),
                demo: true,
                error: err.message,
                timestamp: new Date().toISOString(),
            }])
        } finally {
            setIsTyping(false)
        }
    }, [messages, omega])

    const clearHistory = useCallback(() => {
        setMessages([])
        setDemoMode(false)
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
        demoMode,
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
