import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
    Send, Bot, User, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
    Sparkles, Zap, Globe, PenLine, Flame, TrendingUp, Hash, Film, Clock,
    Plus, ChevronRight, MessageSquare, Trash2, Bookmark, AlertTriangle, Tag
} from 'lucide-react'

const AD_KEYWORDS = ['скидка', 'акция', 'купи', 'цена', 'распродажа', 'промокод', 'выгода', 'бесплатно', 'дарим', 'только сегодня', 'спешите', 'успейте', '%', 'руб', '$']

function containsAdMarkers(text) {
    const lower = String(text || '').toLowerCase()
    return AD_KEYWORDS.filter(k => lower.includes(k.toLowerCase()))
}

function AIChatPage() {
    const { user } = useAuth()
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: 'Привет! Я AI-ассистент Viral Studio. Помогу создать вирусный контент, проанализировать тренды и оптимизировать ваши публикации. Чем могу помочь?',
            timestamp: new Date().toISOString(),
            liked: false
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [copiedId, setCopiedId] = useState(null)
    const [addAiLabel, setAddAiLabel] = useState(user?.defaultAddAiLabel !== false)
    const [adWarnings, setAdWarnings] = useState({})
    const [chatHistory, setChatHistory] = useState([
        { id: 1, title: 'Скрипт для TikTok', date: 'Сегодня', messages: 12 },
        { id: 2, title: 'SEO-оптимизация', date: 'Вчера', messages: 8 },
        { id: 3, title: 'Email-рассылка', date: '2 дня назад', messages: 15 },
    ])
    const [activeChat, setActiveChat] = useState(1)
    const messagesEndRef = useRef(null)

    const quickActions = [
        { icon: PenLine, label: 'Скрипт', prompt: 'Напиши скрипт для вирусного видео' },
        { icon: Flame, label: 'Хуки', prompt: 'Придумай 10 цепляющих хуков' },
        { icon: TrendingUp, label: 'Тренды', prompt: 'Какие тренды сейчас актуальны?' },
        { icon: Hash, label: 'Хештеги', prompt: 'Подбери хештеги для ниши' },
        { icon: Film, label: 'Идеи', prompt: 'Предложи идеи для Reels' },
        { icon: Clock, label: 'Лучшее время', prompt: 'Когда лучше публиковать?' },
    ]

    const providers = [
        { name: 'GPT-4', icon: Sparkles, active: true },
        { name: 'Claude', icon: Zap, active: false },
        { name: 'Gemini', icon: Globe, active: false },
    ]

    const templates = [
        { title: 'TikTok Script', desc: 'Вирусный скрипт 15-60 сек', icon: Film },
        { title: 'YouTube Shorts', desc: 'Shorts с цепляющим хуком', icon: Flame },
        { title: 'Instagram Reels', desc: 'Reels для бизнеса', icon: TrendingUp },
        { title: 'SEO Article', desc: 'SEO-оптимизированная статья', icon: PenLine },
        { title: 'Email Campaign', desc: 'Email с высоким CTR', icon: MessageSquare },
        { title: 'Landing Page', desc: 'Текст для лендинга', icon: Hash },
    ]

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async (text = input) => {
        if (!text.trim()) return

        const userMsg = {
            id: messages.length + 1,
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        setTimeout(() => {
            const responses = [
                'Отличная идея! Вот несколько вариантов...',
                'Анализирую тренды в вашей нише...',
                'Создаю контент-план на основе ваших данных...',
                'Вот оптимальная стратегия для вирусности...'
            ]
            let aiContent = responses[Math.floor(Math.random() * responses.length)] + '\n\n1. Используйте цепляющий хук в первые 3 секунды\n2. Добавьте подписи — 85% смотрят без звука\n3. Завершите призывом к действию\n4. Оптимальная длина: 30-45 секунд\n5. Публикуйте в 19:00-21:00 по местному времени'

            if (addAiLabel) {
                aiContent += '\n\nКонтент создан с помощью ИИ'
            }

            const adMarkers = containsAdMarkers(aiContent)
            if (adMarkers.length > 0) {
                setAdWarnings(prev => ({ ...prev, [messages.length + 2]: adMarkers }))
            }

            const aiMsg = {
                id: messages.length + 2,
                role: 'assistant',
                content: aiContent,
                timestamp: new Date().toISOString(),
                liked: false
            }
            setMessages(prev => [...prev, aiMsg])
            setIsTyping(false)
        }, 1500)
    }

    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleRegenerate = (msgId) => {
        setIsTyping(true)
        setTimeout(() => {
            const newMsg = {
                id: messages.length + 1,
                role: 'assistant',
                content: 'Перегенерированный ответ: вот альтернативный вариант...\n\n1. Начните с провокационного вопроса\n2. Покажите результат в начале (before/after)\n3. Используйте быстрые смены кадров\n4. Добавьте трендовый звук\n5. Попросите подписаться в конце',
                timestamp: new Date().toISOString(),
                liked: false
            }
            setMessages(prev => [...prev, newMsg])
            setIsTyping(false)
        }, 1000)
    }

    const handleNewChat = () => {
        const newId = chatHistory.length + 1
        setChatHistory([{ id: newId, title: 'Новый чат', date: 'Сейчас', messages: 0 }, ...chatHistory])
        setActiveChat(newId)
        setMessages([{
            id: 1,
            role: 'assistant',
            content: 'Привет! Я AI-ассистент Viral Studio. Чем могу помочь?',
            timestamp: new Date().toISOString(),
            liked: false
        }])
    }

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4">
            {/* Sidebar — Chat History */}
            <div className="hidden lg:flex w-64 flex-col bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06]">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ff41] text-black font-semibold text-sm hover:bg-[#00ff41]/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Новый чат
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {chatHistory.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => setActiveChat(chat.id)}
                            className={`p-3 rounded-xl cursor-pointer transition-all ${activeChat === chat.id
                                ? 'bg-[#00ff41]/10 border border-[#00ff41]/20'
                                : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <p className="text-white text-sm font-medium truncate">{chat.title}</p>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-gray-600 text-xs">{chat.date}</span>
                                <span className="text-gray-600 text-xs">{chat.messages} сообщ.</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{chatHistory.length} чатов</span>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#00ff41]/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-[#00ff41]" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-sm">AI Assistant</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-gray-500 text-xs">Онлайн</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {providers.map(p => (
                            <button
                                key={p.name}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${p.active
                                    ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20'
                                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                    }`}
                            >
                                <p.icon className="w-3.5 h-3.5" />
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} flex gap-3`}>
                                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/10' : 'bg-[#00ff41]/20'
                                    }`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[#00ff41]" />}
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-[#00ff41]/20 text-white'
                                    : 'bg-white/5 text-gray-300'
                                    }`}>
                                    <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                                    {msg.role === 'assistant' && adWarnings[msg.id] && (
                                        <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium">Пост содержит признаки рекламы.</p>
                                                <p className="opacity-80">Добавьте #реклама или #ad. Вы несёте ответственность за публикуемый контент.</p>
                                            </div>
                                        </div>
                                    )}
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.06]">
                                            <button
                                                onClick={() => handleCopy(msg.id, msg.content)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                                title="Копировать"
                                            >
                                                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                            </button>
                                            <button
                                                onClick={() => handleRegenerate(msg.id)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                                title="Перегенерировать"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Нравится">
                                                <ThumbsUp className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Не нравится">
                                                <ThumbsDown className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Сохранить">
                                                <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#00ff41]/20 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-[#00ff41]" />
                                </div>
                                <div className="bg-white/5 rounded-2xl px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-sm">AI печатает</span>
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 sm:px-6 py-3 border-t border-white/[0.06]">
                    <p className="text-gray-500 text-xs mb-2">Быстрые действия:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(action.prompt)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
                            >
                                <action.icon className="w-3.5 h-3.5" />
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates */}
                <div className="px-4 sm:px-6 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                    <p className="text-gray-500 text-xs mb-2">Шаблоны:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {templates.map((t, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(`Создай ${t.title}`)}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-[#00ff41]/20 transition-all text-left"
                            >
                                <t.icon className="w-4 h-4 text-[#00ff41] flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-white text-xs font-medium truncate">{t.title}</p>
                                    <p className="text-gray-600 text-[10px] truncate">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="px-4 sm:px-6 py-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={addAiLabel}
                                onChange={(e) => setAddAiLabel(e.target.checked)}
                                className="w-4 h-4 rounded border border-white/20 bg-white/5 text-[#00ff41] focus:ring-[#00ff41]/30 focus:ring-offset-0"
                            />
                            <Tag className="w-3.5 h-3.5" />
                            Добавить маркировку AI
                        </label>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Напишите сообщение..."
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00ff41]/30"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="px-4 py-3 rounded-xl bg-[#00ff41] text-black font-semibold hover:bg-[#00ff41]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AIChatPage