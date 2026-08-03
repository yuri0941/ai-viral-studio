// ============================================
// OmegaChat — чат-интерфейс с OMEGA
// ============================================

import { useRef, useEffect, useState } from 'react'
import { Bot, User, Send, Trash2, KeyRound, ArrowRight, ThumbsUp, ThumbsDown, Mic, Globe, Volume2, ChevronDown, ChevronUp } from 'lucide-react'
import { useOmegaChat } from '../../hooks/useOmegaChat.js'
import { VectorStoreStatus } from './VectorStoreStatus.jsx'
import { UsageQuotaWidget } from './UsageQuotaWidget.jsx'
import { playSound } from '../../hooks/useSound.js'

import { VoiceInterface } from './VoiceInterface.jsx'

function ReasoningBlock({ reasoning }) {
    const [open, setOpen] = useState(false)
    if (!reasoning) return null
    return (
        <div className="mt-2">
            {/* [P23] fixed: reasoning toggle touch target */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="min-h-[44px] flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors p-2 -ml-2"
            >
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Как OMEGA пришла к этому выводу?
            </button>
            {open && (
                <div className="mt-1.5 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[10px] text-[var(--text-muted)] whitespace-pre-line">
                    {reasoning}
                </div>
            )}
        </div>
    )
}

export function OmegaChatContainer(props) {
    const chat = useOmegaChat(props)
    return <OmegaChat {...chat} {...props} />
}

export function OmegaChat({ messages, input, setInput, isTyping, demoMode, sendMessage, clearHistory, apiKeys = [], onOpenApiKeys, rateMessage }) {
    const endRef = useRef(null)
    const [isListening, setIsListening] = useState(false)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    const handleSubmit = (e) => {
        e.preventDefault()
        // [P19] added: message sent sound
        playSound('message-sent')
        sendMessage(input)
    }

    const startVoiceInput = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert('Голосовой ввод не поддерживается в этом браузере')
            return
        }
        const recognition = new SpeechRecognition()
        recognition.lang = 'ru-RU'
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setInput(prev => (prev ? prev + ' ' : '') + transcript)
        }
        recognition.onerror = () => setIsListening(false)
        recognition.start()
    }

    const speakLastOmegaReply = () => {
        const lastOmega = [...messages].reverse().find(m => m.role === 'omega' && m.text)
        if (!lastOmega) return
        const utterance = new SpeechSynthesisUtterance(lastOmega.text)
        utterance.lang = 'ru-RU'
        window.speechSynthesis.speak(utterance)
    }

    const hasActiveKey = apiKeys.some(k => k.value && (k.status === 'active' || k.status === 'ok'))

    return (
        <div className="flex flex-col h-full rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                        <Bot size={16} className="text-[var(--text)]" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-[var(--text)]">OMEGA</div>
                        <div className="text-[10px] text-[var(--success)] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                            {demoMode ? 'DEMO MODE' : 'ONLINE'}
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <VectorStoreStatus />
                    <UsageQuotaWidget />
                </div>
                {/* [P23] fixed: 44×44 header action touch target */}
                <button
                    type="button"
                    onClick={clearHistory}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--surface)] transition-colors"
                    title="Очистить историю"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
                {messages.length === 0 && !hasActiveKey && (
                    <div className="flex flex-col items-center justify-center text-center gap-3 py-8 px-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/20 flex items-center justify-center">
                            <KeyRound size={22} className="text-[var(--accent-warm)]" />
                        </div>
                        <div className="text-sm text-[var(--text)] font-medium">Нет локального API-ключа</div>
                        <div className="text-xs text-[var(--text-muted)]">
                            OMEGA всё равно может отвечать через серверные провайдеры. Если все провайдеры недоступны, включится демо-режим.
                        </div>
                        {/* [P23] fixed: API-keys button touch target */}
                        <button
                            type="button"
                            onClick={onOpenApiKeys}
                            className="min-h-[44px] flex items-center gap-1.5 text-xs text-[var(--success)] hover:text-[var(--success)] font-medium p-2"
                        >
                            Перейти в API Keys <ArrowRight size={12} />
                        </button>
                    </div>
                )}
                {messages.length === 0 && hasActiveKey && (
                    <div className="text-center text-[var(--text-muted)] text-sm py-8 space-y-2">
                        <div>Напишите OMEGA — например, «анализ цен» или «прогноз доходов».</div>
                        <div className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/20 text-[var(--accent-warm)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-warm)]" />
                            Память пуста — OMEGA запомнит этот разговор
                        </div>
                    </div>
                )}
                {messages.map(msg => {
                    const isUser = msg.role === 'user'
                    const isBrain = msg.provider === 'brain'
                    const isTemplate = msg.provider === 'template'
                    const isWeb = msg.provider === 'web' || (msg.provider && /duckduckgo|web|search/i.test(msg.provider))
                    const sourceLabel = isBrain ? '🧠 Brain' : isWeb ? '🌐 Web' : isTemplate ? '📋 Шаблон' : msg.provider ? `🤖 ${msg.provider}` : ''
                    return (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isUser ? 'bg-[var(--success)]/20' : 'bg-[var(--primary)]/20'
                            }`}>
                                {isUser ? <User size={14} className="text-[var(--success)]" /> : <Bot size={14} className="text-[var(--primary)]" />}
                            </div>
                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                                isUser
                                    ? 'bg-[var(--success)]/10 text-[var(--text)] border border-[var(--success)]/20'
                                    : msg.error || msg.demo
                                        ? 'bg-[var(--accent-warm)]/10 text-[var(--text)] border border-[var(--accent-warm)]/20'
                                        : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]'
                            }`}>
                                {msg.text}
                                {!isUser && <ReasoningBlock reasoning={msg.reasoning} />}
                                {!isUser && sourceLabel && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border-strong)] text-[var(--text-muted)] border border-[var(--border)]">
                                            {sourceLabel}
                                        </span>
                                        {msg.cached && (
                                            <span className="text-[10px] text-[var(--text-muted)]">cached</span>
                                        )}
                                        {/* [P23] fixed: speak button touch target */}
                                        <button
                                            type="button"
                                            onClick={speakLastOmegaReply}
                                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                                            title="Озвучить"
                                            aria-label="Озвучить"
                                        >
                                            <Volume2 size={12} />
                                        </button>
                                    </div>
                                )}
                                {msg.demo && (
                                    <div className="mt-1 text-[10px] text-[var(--accent-warm)]/70 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-[var(--accent-warm)]" />
                                        Demo Mode
                                    </div>
                                )}
                                {msg.error && !msg.demo && (
                                    <div className="mt-1 text-[10px] text-[var(--danger)]">Error: {msg.error}</div>
                                )}
                                {!isUser && msg.memoryId && !msg.demo && (
                                    <div className="mt-2 flex items-center gap-1">
                                        {/* [P23] fixed: rating buttons touch targets */}
                                        <button
                                            type="button"
                                            onClick={() => rateMessage?.(msg.id, 1)}
                                            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 rounded-lg transition-colors ${msg.userRating === 1 ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--surface)]'}`}
                                            title="Полезно"
                                            aria-label="Полезно"
                                        >
                                            <ThumbsUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => rateMessage?.(msg.id, -1)}
                                            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 rounded-lg transition-colors ${msg.userRating === -1 ? 'bg-[var(--danger)]/20 text-[var(--danger)]' : 'text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--surface)]'}`}
                                            title="Не полезно"
                                            aria-label="Не полезно"
                                        >
                                            <ThumbsDown size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                            <Bot size={14} className="text-[var(--primary)]" />
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-muted)] flex items-center gap-2">
                            <span className="text-xs text-[var(--text-muted)]">OMEGA думает</span>
                            <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0.1s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0.2s]" />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-white/5 focus-within:border-[var(--primary)]/30 transition-colors">
                    <VoiceInterface
                        compact
                        onTranscript={(text) => setInput(prev => (prev ? prev + ' ' : '') + text)}
                    />
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='Сообщение OMEGA...'
                        className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                    />
                    {/* [P23] fixed: submit button touch target */}
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 disabled:opacity-50 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default OmegaChat
