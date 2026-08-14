import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Sparkles, Image as ImageIcon, Trash2, History, Plus } from 'lucide-react'
import { aiService } from '../../services/aiService'
import MessageBubble from './MessageBubble'
import QuickCommands from './QuickCommands'

const ChatInterface = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '👋 Привет! Я AI Viral Studio. Готов помочь с:\n\n• Сценариями для TikTok, YouTube, Instagram\n• Хуками и обложками\n• SEO-оптимизацией\n• Аналитикой контента\n• Стратегией публикаций\n\nЧто создадим сегодня?'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [chatId, setChatId] = useState(null)
    const [showHistory, setShowHistory] = useState(false)
    const [chats, setChats] = useState([])
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const history = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))

            const response = await aiService.chat(input, history, chatId)

            if (response.status === 'success') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.data.reply
                }])
                if (response.data.chatId) {
                    setChatId(response.data.chatId)
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Ошибка соединения. Проверьте подключение и попробуйте снова.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickCommand = async (command) => {
        setInput(command)
        // Можно сразу отправить или дать пользователю редактировать
    }

    const loadChats = async () => {
        try {
            const response = await aiService.getChats()
            if (response.status === 'success') {
                setChats(response.data.chats)
            }
        } catch (error) {
            console.error('Failed to load chats:', error)
        }
    }

    const startNewChat = () => {
        setChatId(null)
        setMessages([
            {
                role: 'assistant',
                content: '👋 Новый чат! Чем могу помочь?'
            }
        ])
    }

    const loadChat = async (id) => {
        try {
            const response = await aiService.getChat(id)
            if (response.status === 'success') {
                setMessages(response.data.chat.messages)
                setChatId(id)
                setShowHistory(false)
            }
        } catch (error) {
            console.error('Failed to load chat:', error)
        }
    }

    const deleteChat = async (id) => {
        try {
            await aiService.deleteChat(id)
            setChats(prev => prev.filter(chat => chat._id !== id))
            if (chatId === id) {
                startNewChat()
            }
        } catch (error) {
            console.error('Failed to delete chat:', error)
        }
    }

    return (
        <div className="flex h-[100dvh] bg-dark-950">
            {/* Sidebar with chat history */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-dark-900 border-r border-white/10 overflow-hidden"
                    >
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">История</h3>
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <button
                                onClick={startNewChat}
                                className="neon-button w-full mb-4 text-sm flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Новый чат
                            </button>

                            <div className="space-y-2">
                                {chats.map(chat => (
                                    <div
                                        key={chat._id}
                                        className="group flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                    >
                                        <span
                                            onClick={() => loadChat(chat._id)}
                                            className="text-sm text-gray-300 truncate flex-1"
                                        >
                                            {chat.title}
                                        </span>
                                        <button
                                            onClick={() => deleteChat(chat._id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main chat area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-dark-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setShowHistory(!showHistory)
                                if (!showHistory) loadChats()
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <History className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">AI Viral Assistant</h2>
                            <p className="text-xs text-gray-400">Groq • Llama 3.1 70B</p>
                        </div>
                    </div>

                    <button
                        onClick={startNewChat}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <MessageBubble key={index} message={msg} />
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-violet-400"
                        >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">AI думает...</span>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Commands */}
                <QuickCommands onSelect={handleQuickCommand} />

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                    <div className="glass-card p-2">
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Напиши идею для TikTok, сценарий для YouTube..."
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors"
                            >
                                <Send className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ChatInterface