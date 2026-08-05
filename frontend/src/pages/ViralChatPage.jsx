import { useState, useRef, useEffect } from 'react'
import {
    Send, Sparkles, TrendingUp, Link2, MessageSquare, User,
    Copy, ThumbsUp, ThumbsDown, Bookmark, Share2, ExternalLink,
    Zap, Clock, Hash, Lightbulb, Target, BarChart, ChevronRight,
    Loader2, RefreshCw, Image as ImageIcon, Video, Mic, Paperclip,
    X, Check, Star, Flame, ArrowUpRight, MoreHorizontal
} from 'lucide-react'

// Моковые данные для демо-диалога
const INITIAL_MESSAGES = [
    {
        id: 1,
        role: 'assistant',
        content: 'Привет! Я твой AI-консультант по вирусному контенту. Я могу:\n\n🔥 Показать актуальные тренды в твоей нише\n📊 Разобрать твои видео и дать рекомендации\n💡 Подсказать идеи для нового контента\n🔗 Прислать ссылки на успешные примеры\n\nЧем могу помочь? Скинь ссылку на видео или спроси про тренды!',
        timestamp: '13:30',
        type: 'welcome',
    },
]

const QUICK_ACTIONS = [
    { icon: TrendingUp, label: 'Что сейчас тренд?', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: Link2, label: 'Разбор моего видео', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: Lightbulb, label: 'Идеи для контента', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { icon: Target, label: 'Анализ конкурентов', color: 'text-purple-400', bg: 'bg-purple-500/10' },
]

const TREND_SUGGESTIONS = [
    'Что сейчас трендовое в нише fitness?',
    'Почему мои Shorts не набирают просмотры?',
    'Какой хук лучше для обзора техники?',
    'Топ-3 формата видео для TikTok в 2026',
    'Как адаптировать тренд под мою нишу?',
]

const MOCK_AI_RESPONSES = {
    'тренд': {
        content: `🔥 **Топ тренды в нише Fitness (июль 2026):**

**1. "3 упражнения за 60 сек"** 
- +340% просмотров за неделю
- Формат: быстрый, без воды, сразу ценность
- Пример: @fitnessguru — 2.1M просмотров

**2. "Что я ем за день" (What I eat in a day)**
- +180% рост, особенно среди женской аудитории 18-34
- Добавь рецепты с калориями — +50% engagement

**3. "Трансформация за 30 дней"**
- Классика, но с новым твистом: "Реалистичный результат"
- Аудитория устала от нереалистичных "до/после"

**💡 Рекомендация:** Сделай серию "3 упражнения" + "Что я ем" — комбо заходит лучше всего.`,
        links: [
            { title: '3 упражнения за 60 сек — пример', url: '#', views: '2.1M' },
            { title: 'What I eat in a day — топ-5', url: '#', views: '890K' },
            { title: 'Реалистичная трансформация', url: '#', views: '1.5M' },
        ],
    },
    'разбор': {
        content: `📊 **Разбор вашего видео:**

**Сильные стороны:**
✅ Хороший хук — "Я ошибался 2 года" (интрига)
✅ Динамичный монтаж, нет пауз
✅ Персональная история — аудитория доверяет

**Что можно улучшить:**
❌ Первые 3 секунды — слишком много текста на экране
❌ Нет CTA в конце (подписка, лайк, комментарий)
❌ Описание пустое — упускаешь SEO-трафик

**AI-оценка: 7.2/10**

**Потенциал после правок: 9.0/10**

Хочешь, я напишу улучшенное описание и подберу хештеги?`,
        links: [
            { title: 'Пример идеального хука', url: '#', views: '3.2M' },
            { title: 'CTA, которые работают', url: '#', views: '1.1M' },
        ],
    },
    'идеи': {
        content: `💡 **Идеи для твоего следующего контента:**

**1. "Мифы, в которые я верил 5 лет"**
- Формат: разрушение заблуждений
- Потенциал: высокий (провокация + ценность)
- Пример заголовка: "5 мифов о похудении, которые разрушили мою жизнь"

**2. "Сравнение: Дорогое vs Дёшево"**
- Формат: баттл продуктов/методов
- Хорошо заходит в обзорной нише

**3. "День из жизни [твоя ниша]"**
- Формат: влог-стиль
- Повышает доверие и лояльность аудитории

**4. "Реакция на комментарии хейтеров"**
- Формат: ответы на негатив
- Высокий engagement (люди любят драму)

Хочешь, я разберу любую из идей подробнее?`,
        links: [],
    },
    'конкуренты': {
        content: `🎯 **Анализ твоих конкурентов:**

**Топ-3 канала в твоей нише:**

**1. @fitness_pro** — 1.2M подписчиков
- Формат: 60-секундные тренировки
- Средние просмотры: 500K
- Секрет: постит в 19:00, использует трендовые звуки

**2. @health_guru** — 890K подписчиков
- Формат: "Что я ем" + рецепты
- Средние просмотры: 300K
- Секрет: серийный контент (части 1, 2, 3)

**3. @gym_bro** — 650K подписчиков
- Формат: мотивация + юмор
- Средние просмотры: 200K
- Секрет: коллаборации с другими креаторами

**💡 Твоя ниша:** Между @fitness_pro (тренировки) и @health_guru (питание) — есть пробел для "Тренировки + Питание + Мотивация" в одном канале.`,
        links: [
            { title: 'Канал @fitness_pro', url: '#', views: '1.2M подп.' },
            { title: 'Канал @health_guru', url: '#', views: '890K подп.' },
        ],
    },
}

function MessageBubble({ message, onCopy, onLike, onDislike }) {
    const isUser = message.role === 'user'
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        onCopy?.()
    }

    // Parse markdown-like formatting
    const formatContent = (text) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold text-white mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>
            }
            if (line.startsWith('**') && line.includes(':**')) {
                const [title, ...rest] = line.split(':**')
                return <p key={i} className="font-bold text-white mt-2">{title.replace('**', '')}:{rest.join('')}</p>
            }
            if (line.startsWith('✅') || line.startsWith('❌') || line.startsWith('🔥') || line.startsWith('💡') || line.startsWith('🎯') || line.startsWith('📊')) {
                return <p key={i} className="text-gray-300 mt-1">{line}</p>
            }
            if (line.startsWith('- ')) {
                return <p key={i} className="text-gray-400 text-sm ml-2 mt-0.5">{line}</p>
            }
            if (line.trim() === '') {
                return <div key={i} className="h-1" />
            }
            return <p key={i} className="text-gray-300 text-sm mt-0.5">{line}</p>
        })
    }

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            {isUser && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#00ff41] to-[#00cc33]">
                    <User className="w-4 h-4 text-black" />
                </div>
            )}
            <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-[#00ff41]/10 border border-[#00ff41]/20 text-white'
                    : 'bg-[#1a1a24] border border-white/[0.06] text-gray-300'
                    }`}>
                    {message.type === 'welcome' ? (
                        <div className="space-y-1">
                            {formatContent(message.content)}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {formatContent(message.content)}
                        </div>
                    )}

                    {/* Links */}
                    {message.links && message.links.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <p className="text-xs text-gray-500 font-medium">Полезные ссылки:</p>
                            {message.links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-sm text-blue-400 group-hover:underline flex-1">{link.title}</span>
                                    <span className="text-xs text-gray-500">{link.views}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isUser && (
                    <div className="flex items-center gap-1 mt-1.5 ml-1">
                        <span className="text-[10px] text-gray-600">{message.timestamp}</span>
                        <button onClick={handleCopy} className="p-1 rounded hover:bg-white/5 transition-colors">
                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
                        </button>
                        <button onClick={onLike} className="p-1 rounded hover:bg-white/5 transition-colors">
                            <ThumbsUp className="w-3 h-3 text-gray-500 hover:text-green-400" />
                        </button>
                        <button onClick={onDislike} className="p-1 rounded hover:bg-white/5 transition-colors">
                            <ThumbsDown className="w-3 h-3 text-gray-500 hover:text-red-400" />
                        </button>
                        <button className="p-1 rounded hover:bg-white/5 transition-colors">
                            <Bookmark className="w-3 h-3 text-gray-500 hover:text-yellow-400" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function ViralChatPage() {
    const [messages, setMessages] = useState(INITIAL_MESSAGES)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(true)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const getAIResponse = (userText) => {
        const lower = userText.toLowerCase()
        if (lower.includes('тренд') || lower.includes('трендовое') || lower.includes('что сейчас')) {
            return MOCK_AI_RESPONSES['тренд']
        }
        if (lower.includes('разбор') || lower.includes('моё видео') || lower.includes('мое видео') || lower.includes('анализ')) {
            return MOCK_AI_RESPONSES['разбор']
        }
        if (lower.includes('иде') || lower.includes('придумай') || lower.includes('что снять')) {
            return MOCK_AI_RESPONSES['идеи']
        }
        if (lower.includes('конкурент') || lower.includes('сравни') || lower.includes('кто в нише')) {
            return MOCK_AI_RESPONSES['конкуренты']
        }
        // Default response
        return {
            content: `Интересный вопрос! Давай разберём подробнее.\n\nНа основе твоего запроса, вот что я могу сказать:\n\n**Ключевые моменты:**\n- Анализируй метрики первых 24 часов после публикации\n- Тестируй разные хуки (первые 3 секунды решают 80% успеха)\n- Используй трендовые звуки, но адаптируй под свою нишу\n\nХочешь, я пришлю конкретные примеры и ссылки на успешные видео по этой теме?`,
            links: [
                { title: 'Гайд: Как писать хуки', url: '#', views: '450K' },
                { title: 'Топ звуков июля 2026', url: '#', views: '1.2M' },
            ],
        }
    }

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input,
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)
        setShowSuggestions(false)

        // Имитация AI-ответа
        setTimeout(() => {
            const response = getAIResponse(userMessage.content)
            const aiMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                links: response.links,
            }
            setMessages(prev => [...prev, aiMessage])
            setLoading(false)
        }, 1500)
    }

    const handleQuickAction = (label) => {
        let text = ''
        if (label.includes('тренд')) text = 'Что сейчас трендовое в моей нише?'
        else if (label.includes('Разбор')) text = 'Сделай разбор моего последнего видео'
        else if (label.includes('Идеи')) text = 'Придумай идеи для нового контента'
        else if (label.includes('конкурент')) text = 'Проанализируй моих конкурентов'

        setInput(text)
        inputRef.current?.focus()
    }

    const handleSuggestion = (text) => {
        setInput(text)
        inputRef.current?.focus()
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 px-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Viral Chat</h1>
                    <p className="text-gray-400 text-sm">AI-консультант по трендам и вирусному контенту</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-xs text-green-400">AI Online</span>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                    />
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="bg-[#1a1a24] border border-white/[0.06] rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-[#00ff41] animate-spin" />
                                <span className="text-sm text-gray-400">AI анализирует и ищет лучшие примеры...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />

                {/* Quick Actions */}
                {showSuggestions && messages.length === 1 && (
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-3">Быстрые действия:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {QUICK_ACTIONS.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuickAction(action.label)}
                                    className={`p-3 rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-all text-left group ${action.bg}`}
                                >
                                    <action.icon className={`w-5 h-5 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
                                    <p className="text-xs text-gray-300 font-medium">{action.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trend Suggestions */}
                {showSuggestions && (
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-3">Популярные вопросы:</p>
                        <div className="flex flex-wrap gap-2">
                            {TREND_SUGGESTIONS.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestion(suggestion)}
                                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/[0.06] text-xs text-gray-400 hover:text-white hover:bg-white/10 hover:border-[#00ff41]/30 transition-all"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="pt-4 border-t border-white/[0.06]">
                <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-3">
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSend()
                                    }
                                }}
                                placeholder="Спроси про тренды, скинь ссылку на видео, или попроси разбор..."
                                rows={1}
                                className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none resize-none max-h-32"
                                style={{ minHeight: '24px' }}
                            />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-500 hover:text-white">
                                <Paperclip className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-500 hover:text-white">
                                <ImageIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="p-2.5 rounded-xl bg-[#00ff41] hover:bg-[#00cc33] text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                        <div className="flex items-center gap-3 text-[10px] text-gray-600">
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" /> GPT-4 Turbo
                            </span>
                            <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" /> Контекст: 4K
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-600">Enter — отправить, Shift+Enter — новая строка</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ViralChatPage