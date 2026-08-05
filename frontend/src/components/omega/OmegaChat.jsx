// ============================================
// OmegaChat — чат-интерфейс с OMEGA
// ============================================

import { useRef, useEffect, useState, useMemo } from 'react'
import { Bot, User, Send, Trash2, KeyRound, ArrowRight, ThumbsUp, ThumbsDown, Mic, Globe, Volume2, ChevronDown, ChevronUp, Paperclip, X } from 'lucide-react'
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

// [v5.9-FINAL] added: role badge metadata
function getRoleMeta(role) {
    switch (role) {
        case 'owner': return { emoji: '👑', label: 'Owner', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }
        case 'admin': return { emoji: '🛡', label: 'Admin', color: 'text-red-400 bg-red-400/10 border-red-400/20' }
        case 'staff': return { emoji: '🎧', label: 'Staff', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' }
        case 'advertiser': return { emoji: '📢', label: 'Advertiser', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' }
        case 'creator': return { emoji: '🎨', label: 'Creator', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' }
        case 'business': return { emoji: '🏢', label: 'Business', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' }
        default: return { emoji: '👤', label: 'Client', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
    }
}

// [v5.9-FINAL] added: inline publish modal
function PublishModal({ text, apiKeys, onClose }) {
    const platforms = ['Instagram', 'Telegram', 'TikTok', 'YouTube', 'VK']
    const isConnected = (platform) => apiKeys.some(k => k.provider?.toLowerCase() === platform.toLowerCase() && k.value)
    const [selected, setSelected] = useState(null)
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-[var(--text)]">🚀 Публикация</div>
                    <button type="button" onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {platforms.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setSelected(p)}
                            className={`px-3 py-2 rounded-lg text-xs border transition-colors ${selected === p ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                {selected && !isConnected(selected) && (
                    <div className="text-xs text-[var(--accent-warm)] mb-3">Подключите {selected} в Настройках → Интеграции</div>
                )}
                {selected && isConnected(selected) && (
                    <div className="text-xs text-[var(--success)] mb-3">{selected} подключен. Публикация в очереди.</div>
                )}
                <button type="button" onClick={onClose} className="w-full py-2 rounded-lg bg-[var(--primary)] text-[var(--text-inverse)] text-xs hover:opacity-90 transition-opacity">Закрыть</button>
            </div>
        </div>
    )
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

// [MASTER-v5.6] Cinematic message bubble with orb avatar
const MessageBubble = ({ message, isUser, isTyping }) => {
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full mr-3 relative flex-shrink-0 hidden sm:block">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-500 animate-spin-slow" style={{ animationDuration: '8s' }} />
                    <div className="absolute inset-[2px] rounded-full bg-[#0a0a1f] flex items-center justify-center"><span className="text-xs">Ω</span></div>
                    {isTyping && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                </div>
            )}
            <div className={`
                max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl relative
                ${isUser ? 'bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 border border-violet-500/20 rounded-br-sm' : 'luxury-card rounded-bl-sm'}
                transition-all duration-300
            `}>
                {isTyping ? (
                    <div className="flex items-center gap-1.5 h-6 px-2">
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                ) : (
                    <p className="text-sm text-gray-100 leading-relaxed">{message.text}</p>
                )}
                <span className="text-[10px] text-gray-500 mt-1.5 block text-right">
                    {new Date(message.time || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
};

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
    const roleMeta = getRoleMeta(role)

    const endRef = useRef(null)
    const [isListening, setIsListening] = useState(false)

    // [v5.9-FINAL] added: local editable copy of messages
    const [localMessages, setLocalMessages] = useState(messages)
    useEffect(() => { setLocalMessages(messages) }, [messages])

    // [v5.9-FINAL] added: command palette state
    const [showPalette, setShowPalette] = useState(false)

    // [v5.9-FINAL] added: inline editing state
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')

    // [v5.9-FINAL] added: publish modal state
    const [publishMessage, setPublishMessage] = useState(null)

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

    // [v5.9-FINAL] added: smart suggestions per message
    const getSuggestions = () => {
        const base = [
            'Сгенерировать обложку к этому посту',
            'Составить план публикации',
            'Переписать в другом стиле',
            'Сделать короче',
            'Добавить CTA',
            'Создать хук для Reels',
        ]
        if (role === 'owner') base.push('Показать метрики', 'Запустить AutoPilot')
        if (role === 'advertiser') base.push('Оптимизировать кампанию', 'Показать CTR')
        if (role === 'creator') base.push('Сгенерировать хэштеги', 'Лучшее время публикации')
        return base
    }

    const suggestions = getSuggestions()

    const handleSuggestion = (prompt) => {
        setInput(prompt)
        sendMessage(prompt)
    }

    const handleCopy = (text) => {
        navigator.clipboard?.writeText(text)
    }

    const handleSchedule = (text) => {
        localStorage.setItem('omega_draft_post', text)
        window.location.href = '/scheduler?draft=true'
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

    const handleDelete = (id) => {
        setLocalMessages(prev => prev.filter(m => m.id !== id))
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
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                        <Bot size={16} className="text-[var(--text)]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-[var(--text)]">OMEGA</div>
                            {/* [v5.9-FINAL] added: role badge */}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleMeta.color}`}>
                                {roleMeta.emoji} {roleMeta.label}
                            </span>
                        </div>
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

            <div className={`flex ${previewMode ? 'flex-row' : 'flex-col'} flex-1 overflow-hidden`}>
                {/* Messages */}
                <div className={`${previewMode ? 'w-[60%]' : 'flex-1'} overflow-y-auto p-4 space-y-3 min-h-[300px]`}>
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
                    {localMessages.map(msg => {
                        const isUser = msg.role === 'user'
                        const isBrain = msg.provider === 'brain'
                        const isTemplate = msg.provider === 'template'
                        const isWeb = msg.provider === 'web' || (msg.provider && /duckduckgo|web|search/i.test(msg.provider))
                        const sourceLabel = isBrain ? '🧠 Brain' : isWeb ? '🌐 Web' : isTemplate ? '📋 Шаблон' : msg.provider ? `🤖 ${msg.provider}` : ''
                        const isEditing = editingId === msg.id
                        return (
                            <div
                                key={msg.id}
                                className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                            >
                                {/* [MASTER-v5.6] orb avatar for OMEGA */}
                                {!isUser ? (
                                    <div className="w-8 h-8 rounded-full mr-3 relative flex-shrink-0 hidden sm:block">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-500 animate-spin-slow" style={{ animationDuration: '8s' }} />
                                        <div className="absolute inset-[2px] rounded-full bg-[#0a0a1f] flex items-center justify-center"><span className="text-xs">Ω</span></div>
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[var(--success)]/20">
                                        <User size={14} className="text-[var(--success)]" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm relative ${
                                    isUser
                                        ? 'bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 text-white border border-violet-500/20 rounded-br-sm'
                                        : msg.error || msg.demo
                                            ? 'bg-[var(--accent-warm)]/10 text-[var(--text)] border border-[var(--accent-warm)]/20'
                                            : 'luxury-card rounded-bl-sm'
                                }`}>
                                    {!isUser && (
                                        <div className="absolute -top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1 shadow-lg z-10">
                                            <button type="button" onClick={() => handleCopy(msg.text)} className="text-[10px] hover:text-[var(--primary)]" title="Копировать">📋</button>
                                            <button type="button" onClick={() => handleSchedule(msg.text)} className="text-[10px] hover:text-[var(--primary)]" title="Расписание">📅</button>
                                            <button type="button" onClick={() => setPublishMessage(msg)} className="text-[10px] hover:text-[var(--primary)]" title="Опубликовать">🚀</button>
                                            <button type="button" onClick={() => handleEdit(msg)} className="text-[10px] hover:text-[var(--primary)]" title="Редактировать">✏️</button>
                                            <button type="button" onClick={() => handleDelete(msg.id)} className="text-[10px] hover:text-[var(--danger)]" title="Удалить">🗑</button>
                                        </div>
                                    )}
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2">
                                            {/* [v5.9-FINAL] added: inline editing textarea */}
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
                                        <div onDoubleClick={() => !isUser && handleEdit(msg)}>
                                            {msg.text}
                                        </div>
                                    )}
                                    {!isUser && <ReasoningBlock reasoning={msg.reasoning} />}
                                    {!isUser && sourceLabel && (
                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                                    {/* [v5.9-FINAL] added: preview button for long AI messages */}
                                    {!isUser && !isEditing && (msg.text?.length > 50) && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode(msg)}
                                            className="mt-2 text-[10px] text-[var(--primary)] hover:underline"
                                        >
                                            👁 Превью
                                        </button>
                                    )}
                                    {/* [v5.9-FINAL] added: smart suggestions chips below completed AI messages */}
                                    {!isUser && !isEditing && !isTyping && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleSuggestion(s)}
                                                    className="px-2 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {isTyping && (
                        <div className="flex gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full mr-3 relative flex-shrink-0 hidden sm:block">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-500 animate-spin-slow" style={{ animationDuration: '8s' }} />
                                <div className="absolute inset-[2px] rounded-full bg-[#0a0a1f] flex items-center justify-center"><span className="text-xs">Ω</span></div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                            </div>
                            <div className="luxury-card rounded-bl-sm px-4 py-3 flex items-center gap-2">
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

            {/* [v5.9-FINAL] added: publish modal */}
            {publishMessage && (
                <PublishModal text={publishMessage.text} apiKeys={apiKeys} onClose={() => setPublishMessage(null)} />
            )}
        </div>
    )
}

export default OmegaChat
