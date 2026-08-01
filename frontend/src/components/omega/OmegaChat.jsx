// ============================================
// OmegaChat — чат-интерфейс с OMEGA
// ============================================

import { useRef, useEffect, useState } from 'react'
import { Bot, User, Send, Trash2, KeyRound, ArrowRight, ThumbsUp, ThumbsDown, Mic, Globe, Volume2 } from 'lucide-react'
import { useOmegaChat } from '../../hooks/useOmegaChat.js'
import { VectorStoreStatus } from './VectorStoreStatus.jsx'
import { UsageQuotaWidget } from './UsageQuotaWidget.jsx'

import { VoiceInterface } from './VoiceInterface.jsx'

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
        <div className="flex flex-col h-full rounded-2xl bg-[#0f0f1a] border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <Bot size={16} className="text-white" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white">OMEGA</div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {demoMode ? 'DEMO MODE' : 'ONLINE'}
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <VectorStoreStatus />
                    <UsageQuotaWidget />
                </div>
                <button
                    onClick={clearHistory}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Очистить историю"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
                {messages.length === 0 && !hasActiveKey && (
                    <div className="flex flex-col items-center justify-center text-center gap-3 py-8 px-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                            <KeyRound size={22} className="text-yellow-400" />
                        </div>
                        <div className="text-sm text-white font-medium">Нет локального API-ключа</div>
                        <div className="text-xs text-gray-500">
                            OMEGA всё равно может отвечать через серверные провайдеры. Если все провайдеры недоступны, включится демо-режим.
                        </div>
                        <button
                            type="button"
                            onClick={onOpenApiKeys}
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                            Перейти в API Keys <ArrowRight size={12} />
                        </button>
                    </div>
                )}
                {messages.length === 0 && hasActiveKey && (
                    <div className="text-center text-gray-500 text-sm py-8 space-y-2">
                        <div>Напишите OMEGA — например, «анализ цен» или «прогноз доходов».</div>
                        <div className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
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
                                isUser ? 'bg-emerald-500/20' : 'bg-purple-500/20'
                            }`}>
                                {isUser ? <User size={14} className="text-emerald-400" /> : <Bot size={14} className="text-purple-400" />}
                            </div>
                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                                isUser
                                    ? 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20'
                                    : msg.error || msg.demo
                                        ? 'bg-yellow-500/10 text-yellow-100 border border-yellow-500/20'
                                        : 'bg-white/5 text-gray-200 border border-white/5'
                            }`}>
                                {msg.text}
                                {!isUser && sourceLabel && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                                            {sourceLabel}
                                        </span>
                                        {msg.cached && (
                                            <span className="text-[10px] text-gray-500">cached</span>
                                        )}
                                        <button
                                            onClick={speakLastOmegaReply}
                                            className="text-gray-500 hover:text-white transition-colors"
                                            title="Озвучить"
                                            aria-label="Озвучить"
                                        >
                                            <Volume2 size={12} />
                                        </button>
                                    </div>
                                )}
                                {msg.demo && (
                                    <div className="mt-1 text-[10px] text-yellow-500/70 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-yellow-500" />
                                        Demo Mode
                                    </div>
                                )}
                                {msg.error && !msg.demo && (
                                    <div className="mt-1 text-[10px] text-red-400">Error: {msg.error}</div>
                                )}
                                {!isUser && msg.memoryId && !msg.demo && (
                                    <div className="mt-2 flex items-center gap-1">
                                        <button
                                            onClick={() => rateMessage?.(msg.id, 1)}
                                            className={`p-1.5 rounded-lg transition-colors ${msg.userRating === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-emerald-400 hover:bg-white/5'}`}
                                            title="Полезно"
                                            aria-label="Полезно"
                                        >
                                            <ThumbsUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => rateMessage?.(msg.id, -1)}
                                            className={`p-1.5 rounded-lg transition-colors ${msg.userRating === -1 ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-red-400 hover:bg-white/5'}`}
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
                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Bot size={14} className="text-purple-400" />
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-sm text-gray-400 flex items-center gap-2">
                            <span className="text-xs text-gray-500">OMEGA думает</span>
                            <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.1s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 focus-within:border-purple-500/30 transition-colors">
                    <VoiceInterface
                        compact
                        onTranscript={(text) => setInput(prev => (prev ? prev + ' ' : '') + text)}
                    />
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='Сообщение OMEGA...'
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default OmegaChat
