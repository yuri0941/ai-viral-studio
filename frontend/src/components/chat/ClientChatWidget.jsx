import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Paperclip, Bot, User, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
import { omegaApi } from '../../services/api'
import { API_URL } from '../../config.js'

const STEPS = [
    { key: 'greeting', label: 'Приветствие' },
    { key: 'budget', label: 'Бюджет' },
    { key: 'platform', label: 'Площадка' },
    { key: 'audience', label: 'Целевая аудитория' },
    { key: 'deadline', label: 'Сроки' },
    { key: 'files', label: 'Материалы' },
    { key: 'channel', label: 'Канал связи' },
    { key: 'done', label: 'Заявка создана' },
]

const CHANNELS = [
    { id: 'online', label: 'Онлайн-чат', icon: '💬' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'telegram', label: 'Telegram', icon: '📱' },
]

const PLATFORMS = ['TikTok', 'YouTube Shorts', 'Instagram Reels', 'Telegram', 'YouTube', 'Другое']

function formatTime(iso) {
    try {
        return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return ''
    }
}

function generateId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function detectNextStep(form) {
    if (!form.budget) return 'budget'
    if (!form.platform) return 'platform'
    if (!form.audience) return 'audience'
    if (!form.deadline) return 'deadline'
    if (!form.filesProvided) return 'files'
    if (!form.channel) return 'channel'
    return 'done'
}

export function ClientChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)
    const [messages, setMessages] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('client_chat_messages')) || []
        } catch {
            return []
        }
    })
    const [input, setInput] = useState('')
    const [typing, setTyping] = useState(false)
    const [form, setForm] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('client_chat_form')) || {}
        } catch {
            return {}
        }
    })
    const [status, setStatus] = useState(() => localStorage.getItem('client_chat_status') || 'new')
    const endRef = useRef(null)

    useEffect(() => {
        localStorage.setItem('client_chat_messages', JSON.stringify(messages.slice(-100)))
    }, [messages])

    useEffect(() => {
        localStorage.setItem('client_chat_form', JSON.stringify(form))
    }, [form])

    useEffect(() => {
        localStorage.setItem('client_chat_status', status)
    }, [status])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, typing])

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            addBotMessage(
                'Привет! 👋 Я AI-ассистент AI Viral Studio. Помогу оформить заявку на рекламу или контент-кампанию.\n\nСкажите, какой у вас примерный бюджет?'
            )
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen && messages.some(m => m.role === 'bot' && m.unread)) {
            setHasUnread(true)
        }
    }, [messages, isOpen])

    const addBotMessage = useCallback((text, meta = {}) => {
        const msg = { id: generateId(), role: 'bot', text, time: new Date().toISOString(), unread: true, ...meta }
        setMessages(prev => [...prev, msg])
    }, [])

    const addUserMessage = useCallback((text, meta = {}) => {
        const msg = { id: generateId(), role: 'user', text, time: new Date().toISOString(), ...meta }
        setMessages(prev => [...prev, msg])
        return msg
    }, [])

    const askNextQuestion = useCallback((nextForm) => {
        const next = detectNextStep(nextForm)
        const questions = {
            budget: 'Какой у вас бюджет на кампанию? (например: $1000)',
            platform: 'На какой площадке планируете размещение?',
            audience: 'Опишите целевую аудиторию (возраст, интересы, география).',
            deadline: 'Какие сроки запуска?',
            files: 'Есть ли у вас бриф, логотип или другие материалы? Вы можете прикрепить файл или написать «нет».',
            channel: 'Как удобнее получать ответ: онлайн-чат, email или Telegram?',
        }
        if (questions[next]) {
            addBotMessage(questions[next], { step: next })
        }
    }, [addBotMessage])

    const handleAIReply = useCallback(async (userText) => {
        setTyping(true)
        try {
            const history = messages.slice(-8).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.text
            }))
            const res = await omegaApi.chat(userText, history)
            const text = res?.data?.response || res?.data?.reply ||
                'Спасибо! Я передал информацию менеджеру. Мы свяжемся с вами в ближайшее время.'
            addBotMessage(text, { provider: res?.data?.provider })
        } catch (err) {
            console.error('Client chat AI error:', err)
            addBotMessage('Спасибо за информацию! Я записал всё и передал менеджеру.')
        } finally {
            setTyping(false)
        }
    }, [messages, addBotMessage])

    const submitRequest = useCallback(async () => {
        setStatus('submitted')
        try {
            const res = await fetch(`${API_URL}/ad-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Заявка от ${form.channel || 'онлайн-чат'}`,
                    clientName: form.name || 'Гость',
                    clientEmail: form.email || '',
                    budget: Number(form.budget) || 0,
                    platform: form.platform,
                    targetAudience: form.audience,
                    deadline: form.deadline,
                    files: form.files || [],
                    preferredChannel: form.channel,
                    messages: messages.map(m => ({ role: m.role, text: m.text })),
                })
            })
            if (res.ok) {
                setStatus('manager_assigned')
                addBotMessage(
                    '✅ Заявка создана! Номер: #' + generateId().slice(0, 6).toUpperCase() + '\n\n' +
                    'Наш менеджер получил все детали и скоро свяжется с вами через выбранный канал.\n\n' +
                    'Оцените, насколько удобно прошло общение:', { isReview: true }
                )
            } else {
                throw new Error('Failed to submit')
            }
        } catch {
            setStatus('submitted')
            addBotMessage(
                '✅ Ваша заявка сохранена локально. Мы получили: бюджет, площадку, аудиторию, сроки и материалы. Менеджер свяжется с вами.', { isReview: true }
            )
        }
    }, [addBotMessage, form, messages])

    const processUserInput = useCallback((text) => {
        const nextForm = { ...form }
        const lower = text.toLowerCase()

        if (!form.budget) {
            const match = text.match(/[\d\s.,]+/)
            nextForm.budget = match ? parseFloat(match[0].replace(/\s/g, '').replace(',', '.')) : text
        } else if (!form.platform) {
            nextForm.platform = text
        } else if (!form.audience) {
            nextForm.audience = text
        } else if (!form.deadline) {
            nextForm.deadline = text
        } else if (!form.filesProvided) {
            nextForm.filesProvided = true
            if (lower.includes('нет') || lower.includes('no')) {
                nextForm.files = []
            }
        } else if (!form.channel) {
            nextForm.channel = text
        }

        setForm(nextForm)
        return nextForm
    }, [form])

    const sendMessage = useCallback((text) => {
        if (!text.trim()) return
        addUserMessage(text)
        setInput('')

        const nextForm = processUserInput(text)
        const nextStep = detectNextStep(nextForm)

        if (nextStep === 'done') {
            if (status !== 'submitted' && status !== 'manager_assigned') {
                submitRequest()
            }
        } else {
            setTyping(true)
            setTimeout(() => {
                setTyping(false)
                askNextQuestion(nextForm)
            }, 600)
        }
    }, [addUserMessage, askNextQuestion, processUserInput, status, submitRequest])

    const handlePlatformSelect = (platform) => {
        sendMessage(platform)
    }

    const handleChannelSelect = (channel) => {
        setForm(prev => ({ ...prev, channel: channel.label }))
        sendMessage(channel.label)
    }

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || [])
        files.forEach(file => {
            const attachment = {
                name: file.name,
                type: file.type,
                size: file.size,
                url: URL.createObjectURL(file)
            }
            setForm(prev => ({ ...prev, files: [...(prev.files || []), attachment], filesProvided: true }))
            addUserMessage(`📎 Прикреплён файл: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, { attachment })
        })
        e.target.value = ''
        setTimeout(() => askNextQuestion({ ...form, filesProvided: true }), 400)
    }

    const handleReview = (rating) => {
        addUserMessage(`Оценка: ${'⭐'.repeat(rating)}`)
        setTimeout(() => {
            addBotMessage('Спасибо за оценку! Ваш отзыв поможет нам стать лучше. Кейс может попасть в портфолио после завершения проекта.')
        }, 400)
    }

    const markRead = () => {
        setMessages(prev => prev.map(m => m.role === 'bot' ? { ...m, unread: false } : m))
        setHasUnread(false)
    }

    const toggle = () => {
        setIsOpen(prev => !prev)
        if (!isOpen) markRead()
    }

    const currentStep = detectNextStep(form)
    const stepIndex = STEPS.findIndex(s => s.key === currentStep)
    const progress = Math.max(10, Math.min(100, (stepIndex / (STEPS.length - 1)) * 100))

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
            {isOpen && (
                <div className="w-[380px] h-[600px] rounded-2xl bg-[#0f0f1a] border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">AI Viral Studio</div>
                                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {status === 'manager_assigned' ? 'Ожидает менеджера' : 'Онлайн-ассистент'}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="px-4 py-2 bg-[#0a0a0f]/50 border-b border-white/5">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1.5">
                            <span>Прогресс заявки</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    msg.role === 'user' ? 'bg-emerald-500/20' : 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20'
                                }`}>
                                    {msg.role === 'user' ? <User size={14} className="text-emerald-400" /> : <Bot size={14} className="text-emerald-400" />}
                                </div>
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                                    msg.role === 'user'
                                        ? 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20'
                                        : 'bg-white/5 text-gray-200 border border-white/5'
                                }`}>
                                    {msg.text}
                                    {msg.attachment && (
                                        <a href={msg.attachment.url} target="_blank" rel="noreferrer" className="block mt-2 text-xs text-emerald-400 hover:underline">
                                            📎 {msg.attachment.name}
                                        </a>
                                    )}
                                    {msg.provider && <div className="mt-1 text-[10px] text-gray-600">via {msg.provider}</div>}
                                    <div className="text-[10px] text-gray-600 mt-1 text-right">{formatTime(msg.time)}</div>
                                </div>
                            </div>
                        ))}

                        {/* Platform quick reply */}
                        {currentStep === 'platform' && !typing && (
                            <div className="flex flex-wrap gap-2 ml-11">
                                {PLATFORMS.map(p => (
                                    <button key={p} onClick={() => handlePlatformSelect(p)} className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-xs text-gray-300 transition-colors">
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Channel quick reply */}
                        {currentStep === 'channel' && !typing && (
                            <div className="flex flex-col gap-2 ml-11">
                                {CHANNELS.map(ch => (
                                    <button key={ch.id} onClick={() => handleChannelSelect(ch)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-sm text-gray-300 transition-colors">
                                        <span>{ch.icon}</span>
                                        {ch.label}
                                        <ChevronRight size={14} className="ml-auto text-gray-500" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Review */}
                        {messages.some(m => m.isReview) && !typing && (
                            <div className="flex gap-1 ml-11">
                                {[1, 2, 3, 4, 5].map(r => (
                                    <button key={r} onClick={() => handleReview(r)} className="text-lg hover:scale-110 transition-transform">⭐</button>
                                ))}
                            </div>
                        )}

                        {typing && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                                    <Bot size={14} className="text-emerald-400" />
                                </div>
                                <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-sm text-gray-400">
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
                    <div className="p-3 border-t border-white/5 bg-[#0a0a0f]/50">
                        {currentStep === 'files' && !form.filesProvided ? (
                            <div className="flex items-center gap-2">
                                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm cursor-pointer hover:bg-emerald-500/20 transition-colors">
                                    <Paperclip size={16} />
                                    Прикрепить файл
                                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                                </label>
                                <button onClick={() => sendMessage('Нет материалов')} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors">
                                    Нет
                                </button>
                            </div>
                        ) : (
                            <form
                                onSubmit={e => { e.preventDefault(); sendMessage(input) }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-emerald-500/30 transition-colors"
                            >
                                <label className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
                                    <Paperclip size={18} />
                                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                                </label>
                                <input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Напишите сообщение..."
                                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || typing}
                                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Toggle button */}
            <button
                onClick={toggle}
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-900/30 hover:scale-105 transition-transform"
                aria-label={isOpen ? 'Закрыть чат' : 'Открыть чат'}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[#0a0a0f] text-[10px] font-bold flex items-center justify-center">
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

export default ClientChatWidget
