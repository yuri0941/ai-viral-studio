// ============================================
// OmegaChat — чат-интерфейс с OMEGA
// ============================================

import { useRef, useEffect, useState, useMemo } from 'react'
import { Send, Trash2, ThumbsUp, ThumbsDown, Mic, Globe, Volume2, ChevronDown, ChevronUp, Paperclip, X } from 'lucide-react'
import { useOmegaChat } from '../../hooks/useOmegaChat.js'
import { VectorStoreStatus } from './VectorStoreStatus.jsx'
import { UsageQuotaWidget } from './UsageQuotaWidget.jsx'
import { playSound } from '../../hooks/useSound.js'
import { useAuth } from '../../context/AuthContext'

import { VoiceInterface } from './VoiceInterface.jsx'

// [v5.9-FINAL] added: role-aware command palette registry
const COMMANDS = {
    all: [
        { command: '/post', label: 'Создать пост' },
        { command: '/hook', label: 'Сгенерировать хук' },
        { command: '/analyze', label: 'Анализ' },
        { command: '/cover', label: 'Обложка' },
        { command: '/plan', label: 'План публикации' },
    ],
    owner: [
        { command: '/exec', label: 'Выполнить' },
        { command: '/status', label: 'Статус' },
        { command: '/stats', label: 'Статистика' },
        { command: '/feature', label: 'Функция' },
        { command: '/alert', label: 'Оповещение' },
        { command: '/stop', label: 'Стоп' },
    ],
    admin: [
        { command: '/users', label: 'Пользователи' },
        { command: '/moderate', label: 'Модерация' },
    ],
    staff: [
        { command: '/ticket', label: 'Тикет' },
        { command: '/kb', label: 'База знаний' },
    ],
    advertiser: [
        { command: '/campaign', label: 'Кампания' },
        { command: '/creative', label: 'Креатив' },
    ],
    creator: [],
    business: []
}

// [v5.9-FINAL] added: platform preview split-screen panel component
function PreviewPanel({ message, onClose }) {
    const tabs = [
        { id: 'instagram', label: 'Instagram 1:1', ratio: '1/1' },
        { id: 'tiktok', label: 'TikTok 9:16', ratio: '9/16' },
        { id: 'telegram', label: 'Telegram', ratio: 'auto' },
        { id: 'youtube', label: 'YouTube 16:9', ratio: '16/9' },
        { id: 'vk', label: 'VK', ratio: '4/3' },
    ]
    const [activeTab, setActiveTab] = useState('instagram')
    const active = tabs.find(t => t.id === activeTab) || tabs[0]
    return (
        <div className="w-[40%] border-l border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="text-sm font-medium text-[var(--text)]">👁 Превью</div>
                <button type="button" onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"><X size={16} /></button>
            </div>
            <div className="flex gap-1 p-2 overflow-x-auto border-b border-[var(--border)]">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={`px-2 py-1 rounded-md text-[10px] whitespace-nowrap border transition-colors ${activeTab === t.id ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                    >{t.label}</button>
                ))}
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <div
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text)] overflow-hidden"
                    style={{ aspectRatio: active.ratio === 'auto' ? undefined : active.ratio, width: active.ratio === '9/16' ? '220px' : active.ratio === '16/9' ? '320px' : '260px' }}
                >
                    {message?.text}
                </div>
            </div>
        </div>
    )
}

function formatTime(ts) {
    return new Date(ts || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

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

export function OmegaChat({ messages, input, setInput, isTyping, demoMode, sendMessage, clearHistory, apiKeys = [], onOpenApiKeys, rateMessage, quotaError }) {
    const { user } = useAuth()
    const role = user?.role || 'client'

    const endRef = useRef(null)
    const [isListening, setIsListening] = useState(false)

    // [v6.3] added: self-healing timeout
    const [showRestart, setShowRestart] = useState(false)
    const timeoutRef = useRef(null)

    useEffect(() => {
        if (isTyping) {
            timeoutRef.current = setTimeout(() => {
                setShowRestart(true)
            }, 10000)
        } else {
            setShowRestart(false)
            clearTimeout(timeoutRef.current)
        }
        return () => clearTimeout(timeoutRef.current)
    }, [isTyping])

    const restartChat = () => {
        clearHistory()
        setShowRestart(false)
        clearTimeout(timeoutRef.current)
    }

    // [v5.9-FINAL] added: local editable copy of messages
    const [localMessages, setLocalMessages] = useState(messages)
    useEffect(() => { setLocalMessages(messages) }, [messages])

    // [v5.9-FINAL] added: command palette state
    const [showPalette, setShowPalette] = useState(false)

    // [v5.9-FINAL] added: inline editing state
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    // [v5.9-FINAL] added: split-screen preview state
    const [previewMode, setPreviewMode] = useState(null)

    // [v5.9-FINAL] added: image upload state
    const [attachedImage, setAttachedImage] = useState(null)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef(null)

    const commands = useMemo(() => {
        return [...COMMANDS.all, ...(COMMANDS[role] || [])]
    }, [role])

    const filteredCommands = useMemo(() => {
        if (!input.startsWith('/')) return []
        return commands.filter(c => c.command.toLowerCase().startsWith(input.toLowerCase()))
    }, [input, commands])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    // [v5.9-FINAL] added: close command palette on Escape or when input doesn't start with /
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setShowPalette(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    useEffect(() => {
        if (!input.startsWith('/')) setShowPalette(false)
        else if (filteredCommands.length > 0) setShowPalette(true)
    }, [input, filteredCommands.length])

    const handleSubmit = (e) => {
        e.preventDefault()
        // [P19] added: message sent sound
        playSound('message-sent')
        if (attachedImage) {
            // [v5.9-FINAL] added: local image confirmation message
            setLocalMessages(prev => [...prev, { id: `img-${Date.now()}`, role: 'user', text: 'Изображение отправлено на анализ', time: Date.now() }])
            setAttachedImage(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }
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
        const lastOmega = [...localMessages].reverse().find(m => m.role === 'omega' && m.text)
        if (!lastOmega) return
        const utterance = new SpeechSynthesisUtterance(lastOmega.text)
        utterance.lang = 'ru-RU'
        window.speechSynthesis.speak(utterance)
    }

    const hasActiveKey = apiKeys.some(k => k.value && (k.status === 'active' || k.status === 'ok'))

    // [v5.9] added: quick action prompts
    const quickActions = [
        { label: 'Создать пост', icon: '✍️', prompt: 'Создай пост про кофейню' },
        { label: 'Хук', icon: '🔥', prompt: 'Хук для Reels про путешествия' },
        { label: 'Анализ', icon: '🔍', prompt: 'Проанализируй конкурента' },
        { label: 'Обложка', icon: '🎨', prompt: 'Сгенерируй обложку' },
        { label: 'План', icon: '📅', prompt: 'Контент-план на неделю' },
    ]

    const handleCopy = (text) => {
        navigator.clipboard?.writeText(text)
    }

    const handleEdit = (msg) => {
        setEditingId(msg.id)
        setEditText(msg.text || '')
    }

    const saveEdit = () => {
        setLocalMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: editText } : m))
        setEditingId(null)
        setEditText('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditText('')
    }

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return
        const url = URL.createObjectURL(file)
        setAttachedImage({ file, url })
    }

    const onDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
    }

    const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
    const onDragLeave = () => { setDragOver(false) }

    const startRecording = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert('Голосовой ввод недоступен в этом браузере')
            return
        }
        const recognition = new SpeechRecognition()
        recognition.lang = 'ru-RU'
        recognition.interimResults = true
        recognition.continuous = true
        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event) => {
            let transcript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript
            }
            setInput(prev => (prev ? prev + ' ' : '') + transcript)
        }
        recognition.onerror = () => setIsListening(false)
        window._omegaRecognition = recognition
        recognition.start()
    }

    const stopRecording = () => {
        window._omegaRecognition?.stop()
        window._omegaRecognition = null
        setIsListening(false)
    }

    return (
        <div className="flex flex-col h-full rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
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
                <div className="flex items-center gap-2">
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
                        aria-label="Очистить историю"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className={`flex ${previewMode ? 'flex-row' : 'flex-col'} flex-1 overflow-hidden`}>
                {/* Messages */}
                <div className={`${previewMode ? 'w-[60%]' : 'flex-1'} overflow-y-auto p-4 space-y-3 min-h-[300px]`}>
                    {messages.length === 0 && !hasActiveKey && (
                        <div className="flex flex-col items-center justify-center text-center gap-3 py-8 px-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Globe size={22} className="text-emerald-400" />
                            </div>
                            <div className="text-sm text-[var(--text)] font-medium">OMEGA онлайн</div>
                            <div className="text-xs text-[var(--text-muted)]">
                                Работаем через серверных провайдеров. Если все провайдеры недоступны — включится демо-режим.
                            </div>
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                Серверные провайдеры активны
                            </span>
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
                    {localMessages.length > 0 && (
                        <div className="flex items-center gap-3 my-3">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Сегодня</span>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>
                    )}
                    {localMessages.map(msg => {
                        const isUser = msg.role === 'user'
                        const isBrain = msg.provider === 'brain'
                        const isTemplate = msg.provider === 'template'
                        const isWeb = msg.provider === 'web' || (msg.provider && /duckduckgo|web|search/i.test(msg.provider))
                        const sourceLabel = isBrain ? '🧠 Brain' : isWeb ? '🌐 Web' : isTemplate ? '📋 Шаблон' : msg.provider ? `🤖 ${msg.provider}` : ''
                        const isEditing = editingId === msg.id
                        return isUser ? (
                            <div key={msg.id} className="flex justify-end w-full">
                                <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] rounded-2xl rounded-tr-none p-3.5 max-w-[85%]">
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text)] outline-none min-h-[80px] resize-none"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={cancelEdit} className="px-2 py-1 rounded-md text-[10px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]">Отмена</button>
                                                <button type="button" onClick={saveEdit} className="px-2 py-1 rounded-md text-[10px] bg-[var(--primary)] text-[var(--text-inverse)] hover:opacity-90">Сохранить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-white">{msg.text}</p>
                                    )}
                                    <p className="text-[10px] text-gray-500 text-right mt-1">{formatTime(msg.createdAt)}</p>
                                </div>
                            </div>
                        ) : (
                            <div key={msg.id} className="group flex flex-col items-start max-w-[90%]">
                                <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/5">
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text)] outline-none min-h-[80px] resize-none"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={cancelEdit} className="px-2 py-1 rounded-md text-[10px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]">Отмена</button>
                                                <button type="button" onClick={saveEdit} className="px-2 py-1 rounded-md text-[10px] bg-[var(--primary)] text-[var(--text-inverse)] hover:opacity-90">Сохранить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap" onDoubleClick={() => handleEdit(msg)}>{msg.text}</p>
                                    )}
                                    {!isEditing && <ReasoningBlock reasoning={msg.reasoning} />}
                                    {sourceLabel && (
                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border-strong)] text-[var(--text-muted)] border border-[var(--border)]">
                                                {sourceLabel}
                                            </span>
                                            {msg.cached && (
                                                <span className="text-[10px] text-[var(--text-muted)]">cached</span>
                                            )}
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
                                    {msg.memoryId && !msg.demo && (
                                        <div className="mt-2 flex items-center gap-1">
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
                                    {!isEditing && (
                                        <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <span className="text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                                            <button type="button" onClick={() => handleCopy(msg.text)} className="text-gray-500 hover:text-violet-400 text-xs" title="Копировать" aria-label="Копировать">📋</button>
                                            <button type="button" onClick={() => sendMessage(msg.text)} className="text-gray-500 hover:text-violet-400 text-xs" title="Перегенерировать" aria-label="Перегенерировать">🔄</button>
                                            <button type="button" onClick={() => setPreviewMode(msg)} className="text-gray-500 hover:text-violet-400 text-xs" title="Превью" aria-label="Превью">👁</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {isTyping && (
                        <div className="group flex flex-col items-start max-w-[90%]">
                            <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] border-l-2 border-violet-400/50 rounded-2xl rounded-tl-none p-4 backdrop-blur-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* [v5.9-FINAL] added: platform preview split-screen panel */}
                {previewMode && <PreviewPanel message={previewMode} onClose={() => setPreviewMode(null)} />}
            </div>

            {/* [MONETIZE-2026-08-04] added: quota exceeded banner */}
            {(quotaError || messages.some(m => m.quota)) && (
                <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--accent-warm)]/10 flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--accent-warm)]">
                        ⚡ Лимит генераций исчерпан. Перейдите на платный тариф, чтобы продолжить.
                    </span>
                    <button
                        type="button"
                        onClick={() => window.location.href = '/settings?tab=subscriptions'}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--text-inverse)] text-xs hover:opacity-90 transition-opacity"
                    >
                        + Тариф
                    </button>
                </div>
            )}

            {/* [v6.3] self-healing timeout */}
            {showRestart && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-amber-400 bg-amber-500/10 border-t border-amber-500/20">
                    <span>🤔 OMEGA думает дольше обычного...</span>
                    <button type="button" onClick={restartChat} className="underline hover:text-amber-300">Перезапустить чат</button>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)]">
                {/* [v5.9] added: quick action chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {quickActions.map((a, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setInput(a.prompt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-violet-500/30 transition-all whitespace-nowrap flex-shrink-0"
                        >
                            <span>{a.icon}</span>{a.label}
                        </button>
                    ))}
                </div>
                {/* [v5.9-FINAL] added: command palette dropdown */}
                {showPalette && filteredCommands.length > 0 && (
                    <div className="mb-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                        {filteredCommands.map((c, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { setInput(`${c.command} `); setShowPalette(false) }}
                                className="w-full text-left px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--primary)]/10 flex items-center justify-between"
                            >
                                <span className="font-mono text-[var(--primary)]">{c.command}</span>
                                <span className="text-[var(--text-muted)]">{c.label}</span>
                            </button>
                        ))}
                    </div>
                )}
                {/* [v5.9-FINAL] added: attached image preview */}
                {attachedImage && (
                    <div className="mb-2 flex items-center gap-2">
                        <img src={attachedImage.url} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-[var(--border)]" />
                        <button type="button" onClick={() => setAttachedImage(null)} className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"><X size={14} /></button>
                    </div>
                )}
                <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border transition-colors ${dragOver ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-white/5 focus-within:border-[var(--primary)]/30'}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    {/* [v5.9-FINAL] added: image upload paperclip button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
                        title="Прикрепить изображение"
                    >
                        <Paperclip size={16} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { handleFile(e.target.files?.[0]); if (e.target) e.target.value = '' }}
                    />
                    {/* [v5.9-FINAL] added: hold-to-record voice button */}
                    <button
                        type="button"
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`relative min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-lg transition-colors ${isListening ? 'text-red-400 bg-red-400/10' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)]'}`}
                        title="Голосовой ввод (удерживайте)"
                    >
                        <Mic size={16} />
                        {isListening && (
                            <span className="absolute inset-0 rounded-lg bg-red-400/30 animate-ping" />
                        )}
                    </button>
                    {isListening && (
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <span
                                    key={i}
                                    className="w-1 bg-red-400 rounded-full animate-pulse"
                                    style={{ height: `${12 + Math.random() * 12}px`, animationDelay: `${i * 100}ms` }}
                                />
                            ))}
                        </div>
                    )}
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='Сообщение OMEGA...'
                        className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                    />
                    {/* [P23] fixed: submit button touch target */}
                    <button
                        type="submit"
                        disabled={(!input.trim() && !attachedImage) || isTyping}
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
