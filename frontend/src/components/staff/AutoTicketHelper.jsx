import { useState } from 'react'
import { Bot, Send, Loader2, CheckCircle, User } from 'lucide-react'
import { omegaApi } from '../../services/api'

export function AutoTicketHelper({ ticket, staff = [], onSendReply, onAssign }) {
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState('')

    const analyze = async () => {
        if (!ticket?.description) return
        setLoading(true)
        try {
            const res = await omegaApi.chat(
                `Клиент написал тикет: "${ticket.description}".\nТема: "${ticket.subject || ''}".\nПредложи 3 коротких варианта ответа сотрудника поддержки (по 1-2 предложения каждый). Ответь строго JSON: { "replies": ["...", "...", "..."] }.`,
                [],
                'ru'
            )
            const text = res?.response || res?.data?.response || ''
            const match = text.match(/\{[\s\S]*\}/)
            const parsed = match ? JSON.parse(match[0]) : null
            setSuggestions(parsed?.replies || [])
        } catch (e) {
            console.error('[AutoTicketHelper] analyze failed:', e)
            setSuggestions([])
        } finally {
            setLoading(false)
        }
    }

    const bestAssignee = () => {
        if (!staff.length || !ticket?.description) return null
        const lower = ticket.description.toLowerCase()
        // Simple keyword routing
        if (/оплат|тариф|подписк|счёт/i.test(lower)) return staff.find(s => s.department === 'sales' || s.skills?.includes('Sales'))
        if (/баг|ошибк|api|сервер|техн/i.test(lower)) return staff.find(s => s.department === 'tech' || s.skills?.includes('Node.js'))
        if (/дизайн|обложк|видео/i.test(lower)) return staff.find(s => s.department === 'content' || s.skills?.includes('Figma'))
        // lowest load
        return staff.reduce((best, s) => (!best || (s.load || 0) < (best.load || 0) ? s : best), null)
    }

    const assignee = bestAssignee()

    return (
        <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--primary)]">
                    <Bot className="w-5 h-5" />
                    <span className="text-sm font-semibold">AI-помощник по тикету</span>
                </div>
                <button
                    onClick={analyze}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Предложить ответы'}
                </button>
            </div>

            {suggestions.length > 0 && (
                <div className="space-y-2">
                    {suggestions.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => setSelected(r)}
                            className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${
                                selected === r
                                    ? 'bg-[var(--primary)]/10 border-[var(--primary)]/40 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => onSendReply?.(selected)}
                            disabled={!selected}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs transition-colors disabled:opacity-50"
                        >
                            <Send className="w-3.5 h-3.5" /> Отправить выбранный
                        </button>
                        <button
                            onClick={() => setSuggestions([])}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
                        >
                            Скрыть
                        </button>
                    </div>
                </div>
            )}

            {assignee && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <User className="w-4 h-4 text-[var(--accent)]" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">Рекомендуем назначить: {assignee.name}</p>
                        <p className="text-[10px] text-gray-400">{assignee.department} · загрузка {assignee.load || 0}%</p>
                    </div>
                    <button
                        onClick={() => onAssign?.(assignee.id)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}

export default AutoTicketHelper
