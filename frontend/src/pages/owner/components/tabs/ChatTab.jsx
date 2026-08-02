import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
    MessageSquare, Send, Users, Bot, User, Search, Pin,
    Paperclip, SmilePlus, X, ChevronDown, Crown, Shield,
    Clock, CheckCheck, MoreVertical, Image as ImageIcon, FileText, Video,
    Maximize2, Minimize2
} from 'lucide-react'
import { omegaApi } from '../../../../services/api'
import '../../../../styles/animations.css'

const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🔥', '👎']

function formatTime(iso) {
    try {
        return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return ''
    }
}

function getFileIcon(type) {
    if (type?.startsWith('image/')) return <ImageIcon size={16} />
    if (type?.startsWith('video/')) return <Video size={16} />
    return <FileText size={16} />
}

function getRoleIcon(role) {
    if (role === 'owner' || role === 'admin') return <Crown size={12} className="text-amber-400" />
    if (role === 'staff') return <Shield size={12} className="text-blue-400" />
    return null
}

export function ChatTab({ data }) {
    const {
        chats, startChat, sendMessage, activeChat, chatMessages, chatInput, setChatInput,
        staff, agents, user
    } = data

    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const [typing, setTyping] = useState(false)
    const [impersonate, setImpersonate] = useState(null) // { id, name, role }
    const [pinnedOpen, setPinnedOpen] = useState(false)
    const [reactingMsgId, setReactingMsgId] = useState(null)
    const [localMessages, setLocalMessages] = useState([])
    const [isFullscreen, setIsFullscreen] = useState(false)
    const endRef = useRef(null)
    const inputRef = useRef(null)

    // Sync local enriched messages from hook state when chat changes
    useEffect(() => {
        setLocalMessages(chatMessages.map(m => ({ ...m, reactions: m.reactions || {}, pinned: m.pinned || false })))
    }, [activeChat, chatMessages])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [localMessages, typing])

    const currentRole = user?.role || 'owner'
    const canImpersonate = currentRole === 'owner' || currentRole === 'admin'

    const chatList = useMemo(() => {
        return chats.filter(c => filter === 'all' || c.type === filter)
    }, [chats, filter])

    const displayedMessages = useMemo(() => {
        if (!search.trim()) return localMessages
        const q = search.toLowerCase()
        return localMessages.filter(m =>
            (m.text || '').toLowerCase().includes(q) ||
            (m.fromName || m.from || '').toLowerCase().includes(q)
        )
    }, [localMessages, search])

    const pinnedMessages = useMemo(() => localMessages.filter(m => m.pinned), [localMessages])

    const handleSend = useCallback(async () => {
        if (!activeChat || !chatInput.trim()) return

        const text = chatInput.trim()
        const from = impersonate ? impersonate.id : (currentRole === 'owner' ? 'owner' : currentRole)
        const fromName = impersonate ? impersonate.name : (currentRole === 'owner' ? 'Владелец' : (user?.name || currentRole))
        const fromRole = impersonate ? impersonate.role : currentRole

        setChatInput('')
        sendMessage(activeChat.chatId, text, from)
        setLocalMessages(prev => [...prev, {
            id: `local_${Date.now()}`,
            text,
            from,
            fromName,
            fromRole,
            time: new Date().toISOString(),
            reactions: {},
            pinned: false,
            read: true
        }])

        // @omega mention
        if (text.toLowerCase().includes('@omega')) {
            setTyping(true)
            try {
                const history = localMessages.slice(-10).map(m => ({
                    role: m.from === 'owner' || m.fromRole === 'owner' || m.fromRole === 'admin' || m.fromRole === 'staff' ? 'user' : 'assistant',
                    content: m.text
                }))
                const res = await omegaApi.chat(text.replace(/@omega/gi, '').trim(), history)
                const replyText = res?.data?.response || res?.data?.reply || 'Я обработаю запрос и вернусь с ответом.'
                const reply = {
                    id: `omega_${Date.now()}`,
                    text: replyText,
                    from: 'omega',
                    fromName: 'OMEGA',
                    fromRole: 'ai',
                    time: new Date().toISOString(),
                    reactions: {},
                    pinned: false,
                    provider: res?.data?.provider,
                    read: true
                }
                sendMessage(activeChat.chatId, replyText, 'omega')
                setLocalMessages(prev => [...prev, reply])
            } catch (err) {
                console.error('Omega chat error:', err)
                const fallback = {
                    id: `omega_err_${Date.now()}`,
                    text: 'OMEGA временно недоступна. Попробуйте позже или проверьте API-ключи.',
                    from: 'omega',
                    fromName: 'OMEGA',
                    fromRole: 'ai',
                    time: new Date().toISOString(),
                    reactions: {},
                    pinned: false,
                    read: true
                }
                sendMessage(activeChat.chatId, fallback.text, 'omega')
                setLocalMessages(prev => [...prev, fallback])
            } finally {
                setTyping(false)
            }
        }
    }, [activeChat, chatInput, currentRole, impersonate, localMessages, sendMessage, setChatInput, user?.name])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        if (!activeChat) return
        const files = Array.from(e.dataTransfer.files)
        files.forEach(file => {
            const attachment = {
                name: file.name,
                type: file.type,
                size: file.size,
                url: URL.createObjectURL(file)
            }
            const text = `[${file.type.startsWith('image/') ? '🖼️' : '📎'} ${file.name}]`
            const msg = {
                id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                text,
                from: impersonate ? impersonate.id : currentRole,
                fromName: impersonate ? impersonate.name : (currentRole === 'owner' ? 'Владелец' : user?.name || currentRole),
                fromRole: impersonate ? impersonate.role : currentRole,
                time: new Date().toISOString(),
                attachments: [attachment],
                reactions: {},
                pinned: false,
                read: true
            }
            sendMessage(activeChat.chatId, text, msg.from)
            setLocalMessages(prev => [...prev, msg])
        })
    }, [activeChat, currentRole, impersonate, sendMessage, user?.name])

    const handleFileSelect = (e) => {
        if (!activeChat) return
        const files = Array.from(e.target.files || [])
        files.forEach(file => {
            const text = `[${file.type.startsWith('image/') ? '🖼️' : '📎'} ${file.name}]`
            sendMessage(activeChat.chatId, text, impersonate ? impersonate.id : currentRole)
            setLocalMessages(prev => [...prev, {
                id: `file_${Date.now()}`,
                text,
                from: impersonate ? impersonate.id : currentRole,
                fromName: impersonate ? impersonate.name : (currentRole === 'owner' ? 'Владелец' : user?.name || currentRole),
                fromRole: impersonate ? impersonate.role : currentRole,
                time: new Date().toISOString(),
                attachments: [{ name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file) }],
                reactions: {},
                pinned: false,
                read: true
            }])
        })
        e.target.value = ''
    }

    const toggleReaction = (msgId, emoji) => {
        setLocalMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m
            const reactions = { ...(m.reactions || {}) }
            if (reactions[emoji]) delete reactions[emoji]
            else reactions[emoji] = true
            return { ...m, reactions }
        }))
        setReactingMsgId(null)
    }

    const togglePin = (msgId) => {
        setLocalMessages(prev => prev.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m))
    }

    const getBubbleColor = (msg) => {
        if (msg.from === 'omega' || msg.fromRole === 'ai') return 'bg-purple-500/10 text-purple-100 border-purple-500/20'
        if (msg.from === 'owner' || msg.fromRole === 'owner' || msg.fromRole === 'admin') return 'bg-emerald-500/10 text-emerald-100 border-emerald-500/20'
        if (msg.fromRole === 'staff') return 'bg-blue-500/10 text-blue-100 border-blue-500/20'
        return 'bg-white/5 text-gray-200 border-[var(--border)]'
    }

    const isOwn = (msg) => {
        if (impersonate) return msg.from === impersonate.id
        return msg.from === currentRole || msg.from === 'owner'
    }

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-180px)] min-h-[500px]'} rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden flex transition-all`}>
            {/* Sidebar */}
            <div className="w-72 border-r border-[var(--border)] flex flex-col">
                <div className="p-4 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[var(--text)]">Чаты</h3>
                        <span className="text-[10px] text-gray-500">{chatList.length} активных</span>
                    </div>
                    <div className="relative mb-3">
                        <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Поиск по чатам..."
                            className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--text)] placeholder-gray-600 outline-none focus:border-emerald-500/30"
                        />
                    </div>
                    <div className="flex gap-1">
                        {[{ k: 'all', l: 'Все' }, { k: 'staff', l: 'Команда' }, { k: 'ai', l: 'AI' }, { k: 'client', l: 'Клиенты' }].map(f => (
                            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${filter === f.k ? 'bg-white/10 text-[var(--text)]' : 'text-gray-500 hover:text-gray-300'}`}>
                                {f.l}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {/* Start new chats */}
                    <div className="p-3 border-b border-[var(--border)]">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Начать чат</div>
                        <div className="space-y-1 max-h-[160px] overflow-y-auto">
                            {staff.map(s => (
                                <button key={s.id} onClick={() => startChat('staff', s.id, s.name)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left">
                                    <Users size={12} className="text-blue-400" />
                                    <span className="text-xs text-gray-300">{s.name}</span>
                                    <span className="ml-auto text-[10px] text-gray-600">staff</span>
                                </button>
                            ))}
                            {agents.filter(a => a.status === 'active').map(a => (
                                <button key={a.id} onClick={() => startChat('ai', a.id, a.name)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left">
                                    <Bot size={12} className="text-purple-400" />
                                    <span className="text-xs text-gray-300">{a.name}</span>
                                    <span className="ml-auto text-[10px] text-gray-600">ai</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Active chats */}
                    <div className="p-3">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Активные</div>
                        {chatList.length === 0 && <div className="text-xs text-gray-600 py-2">Нет чатов</div>}
                        {chatList.map(c => (
                            <button key={c.chatId} onClick={() => startChat(c.type, c.id, c.name)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${activeChat?.chatId === c.chatId ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                {c.type === 'ai' ? <Bot size={14} className="text-purple-400" /> : c.type === 'staff' ? <Users size={14} className="text-blue-400" /> : <User size={14} className="text-emerald-400" />}
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-300 truncate">{c.name}</div>
                                    {c.lastMessage && <div className="text-[10px] text-gray-500 truncate">{c.lastMessage}</div>}
                                </div>
                                {c.unread > 0 && <span className="w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-black flex items-center justify-center">{c.unread}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative">
                {dragOver && (
                    <div className="absolute inset-0 z-20 bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 flex flex-col items-center justify-center text-emerald-400 pointer-events-none">
                        <Paperclip size={48} className="mb-3 opacity-50" />
                        <p className="text-sm font-medium">Перетащите файлы сюда</p>
                    </div>
                )}

                {activeChat ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeChat.type === 'ai' ? <Bot size={18} className="text-purple-400" /> : activeChat.type === 'staff' ? <Users size={18} className="text-blue-400" /> : <User size={18} className="text-emerald-400" />}
                                <div>
                                    <div className="text-sm font-medium text-[var(--text)]">{activeChat.name}</div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        онлайн
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsFullscreen(v => !v)}
                                    className="p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-[var(--text)] transition-colors"
                                    title={isFullscreen ? 'Свернуть' : 'На весь экран'}
                                >
                                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                {pinnedMessages.length > 0 && (
                                    <button onClick={() => setPinnedOpen(!pinnedOpen)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300 hover:bg-white/10">
                                        <Pin size={12} />
                                        {pinnedMessages.length}
                                    </button>
                                )}
                                {canImpersonate && (
                                    <div className="relative">
                                        <select
                                            value={impersonate?.id || ''}
                                            onChange={e => {
                                                const id = e.target.value
                                                const s = staff.find(x => x.id === id)
                                                setImpersonate(id ? { id, name: s?.name || id, role: 'staff' } : null)
                                            }}
                                            className="appearance-none bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-3 pr-7 py-1.5 text-xs text-[var(--text)] outline-none focus:border-emerald-500/30"
                                        >
                                            <option value="">Я: {user?.name || 'Owner'}</option>
                                            {staff.map(s => <option key={s.id} value={s.id}>Как: {s.name}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2 text-gray-500 pointer-events-none" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pinned panel */}
                        {pinnedOpen && pinnedMessages.length > 0 && (
                            <div className="bg-white/[0.02] border-b border-[var(--border)] p-3 max-h-[140px] overflow-y-auto">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Pin size={10} /> Закреплённые</div>
                                {pinnedMessages.map(m => (
                                    <div key={m.id} className="text-xs text-gray-300 mb-1.5 flex items-start gap-2">
                                        <span className="text-emerald-400 font-medium">{m.fromName || m.from}:</span>
                                        <span className="line-clamp-1">{m.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Messages search */}
                        <div className="px-4 pt-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Поиск по сообщениям..."
                                    className="w-full max-w-xs pl-8 pr-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--text)] placeholder-gray-600 outline-none focus:border-emerald-500/30"
                                />
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            className="flex-1 overflow-y-auto p-4 space-y-4"
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            {displayedMessages.length === 0 && !typing && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <MessageSquare size={40} className="mb-3 opacity-20" />
                                    <p className="text-sm">Напишите первое сообщение</p>
                                    <p className="text-xs text-gray-600 mt-1">Используйте @omega для вопросов к AI</p>
                                </div>
                            )}
                            {displayedMessages.map(msg => (
                                <div key={msg.id} className={`flex gap-3 group ${isOwn(msg) ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        msg.from === 'omega' || msg.fromRole === 'ai' ? 'bg-purple-500/20' :
                                        msg.fromRole === 'staff' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
                                    }`}>
                                        {msg.from === 'omega' || msg.fromRole === 'ai' ? <Bot size={14} className="text-purple-400" /> :
                                         msg.fromRole === 'staff' ? <Users size={14} className="text-blue-400" /> :
                                         <User size={14} className="text-emerald-400" />}
                                    </div>
                                    <div className="flex flex-col max-w-[75%]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-medium text-gray-300">{msg.fromName || msg.from}</span>
                                            {getRoleIcon(msg.fromRole)}
                                            {msg.provider && <span className="text-[9px] text-gray-600">via {msg.provider}</span>}
                                        </div>
                                        <div className={`relative px-4 py-2.5 rounded-2xl text-sm border message-bubble-enter ${getBubbleColor(msg)}`}>
                                            {msg.text}
                                            {msg.attachments?.map((a, i) => (
                                                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 text-xs text-emerald-400 hover:text-emerald-300">
                                                    {getFileIcon(a.type)}
                                                    {a.name} ({(a.size / 1024).toFixed(1)} KB)
                                                </a>
                                            ))}
                                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500">
                                                <Clock size={10} />
                                                {formatTime(msg.time)}
                                                {isOwn(msg) && <CheckCheck size={10} className="text-emerald-500" />}
                                            </div>

                                            {/* Message actions */}
                                            <div className={`absolute ${isOwn(msg) ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1`}>
                                                <button onClick={() => setReactingMsgId(react => react === msg.id ? null : msg.id)} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                                                    <SmilePlus size={12} />
                                                </button>
                                                <button onClick={() => togglePin(msg.id)} className={`p-1 rounded-lg hover:bg-white/10 ${msg.pinned ? 'text-amber-400' : 'text-gray-400'}`}>
                                                    <Pin size={12} />
                                                </button>
                                            </div>

                                            {/* Emoji picker */}
                                            {reactingMsgId === msg.id && (
                                                <div className={`absolute ${isOwn(msg) ? 'right-full mr-2' : 'left-full ml-2'} top-8 z-10 p-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex gap-1 shadow-lg`}>
                                                    {EMOJIS.map(emoji => (
                                                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="hover:scale-110 transition-transform text-sm">
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                    <button onClick={() => setReactingMsgId(null)} className="text-gray-500 hover:text-[var(--text)]"><X size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Reactions */}
                                        {Object.keys(msg.reactions || {}).length > 0 && (
                                            <div className={`flex gap-1 mt-1 ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}>
                                                {Object.entries(msg.reactions).map(([emoji]) => (
                                                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="px-1.5 py-0.5 rounded-full bg-white/5 text-[10px] border border-[var(--border)] hover:bg-white/10">
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {typing && (
                                <div className="flex gap-3 message-bubble-enter">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Bot size={14} className="text-purple-400" />
                                    </div>
                                    <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-[var(--border)] text-sm text-gray-400">
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
                        <div className="p-4 border-t border-[var(--border)]">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus-within:border-emerald-500/30 transition-colors">
                                <label className="p-2 rounded-lg text-gray-500 hover:text-[var(--text)] hover:bg-white/5 cursor-pointer transition-colors">
                                    <Paperclip size={18} />
                                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                                </label>
                                <input
                                    ref={inputRef}
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={impersonate ? `От имени ${impersonate.name}... Напишите @omega для AI` : 'Сообщение... Напишите @omega для AI'}
                                    className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-gray-600 outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!chatInput.trim() || typing}
                                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600">
                                <span>Enter — отправить, Shift+Enter — новая строка</span>
                                <span>Перетащите файл в область чата</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">Выберите чат слева</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ChatTab
