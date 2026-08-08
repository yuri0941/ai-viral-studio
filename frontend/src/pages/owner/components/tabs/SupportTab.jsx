import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.js'
import { request } from '../../../../services/api.js'
import { MessageCircle, Loader2, Search, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_META = {
  open: { label: 'Открыт', emoji: '🟡', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  ai_handled: { label: 'Обработан AI', emoji: '🔵', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  needs_owner: { label: 'Требует оператора', emoji: '🔴', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  in_progress: { label: 'В работе', emoji: '🟠', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  resolved: { label: 'Решён', emoji: '🟢', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  closed: { label: 'Закрыт', emoji: '⚫', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

export function SupportTab() {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [activeTicket, setActiveTicket] = useState(null)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await request('/support')
      setTickets(res?.data || res || [])
    } catch (err) {
      console.error('[SupportTab] fetch failed', err)
      toast.error(t('support.loadError') || 'Не удалось загрузить обращения')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [t])

  const updateStatus = async (id, status, assignedTo) => {
    try {
      await request(`/support/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, assignedTo: assignedTo || undefined })
      })
      toast.success('Статус обновлён')
      fetchTickets()
    } catch (err) {
      toast.error('Ошибка обновления статуса')
    }
  }

  const sendReply = async (ticketId) => {
    if (!replyText.trim()) return
    try {
      await request(`/support/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ sender: 'operator', text: replyText })
      })
      toast.success('Ответ отправлен')
      setReplyText('')
      setActiveTicket(null)
      fetchTickets()
    } catch (err) {
      toast.error('Ошибка отправки ответа')
    }
  }

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const matchesStatus = filter === 'all' || t.status === filter
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.userEmail || '').toLowerCase().includes(q) ||
        (t.userName || '').toLowerCase().includes(q) ||
        String(t._id).slice(-6).includes(q)
      return matchesStatus && matchesSearch
    })
  }, [tickets, filter, search])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-violet-400" /> {t('support.title') || 'Поддержка'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">{t('support.subtitle') || 'Единая панель обращений: Telegram, сайт, приложение'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-sm text-white outline-none focus:border-violet-500"
          >
            <option value="all">{t('support.allStatuses') || 'Все статусы'}</option>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.emoji} {meta.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('common.search') || 'Поиск...'}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#15151c] border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 w-48"
            />
          </div>
          <button
            onClick={fetchTickets}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !tickets.length ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white/[0.02] rounded-2xl border border-white/5">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{t('support.noTickets') || 'Нет обращений'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f0f14]">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">{t('support.user') || 'Пользователь'}</th>
                <th className="px-4 py-3">{t('support.subject') || 'Тема'}</th>
                <th className="px-4 py-3">{t('support.status') || 'Статус'}</th>
                <th className="px-4 py-3">AI</th>
                <th className="px-4 py-3">{t('support.actions') || 'Действия'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(ticket => {
                const meta = STATUS_META[ticket.status] || STATUS_META.open
                return (
                  <tr key={ticket._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-400">#{String(ticket._id).slice(-6)}</td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{ticket.userName || '—'}</div>
                      <div className="text-xs text-gray-500">{ticket.userEmail || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">{ticket.subject}</div>
                      {ticket.aiSuggestion && (
                        <div className="text-xs text-violet-300 mt-1 line-clamp-2">💡 {ticket.aiSuggestion}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${meta.color}`}>
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.aiConfidence !== undefined ? (
                        <span className={`text-xs ${ticket.aiConfidence >= 0.7 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {Math.round(ticket.aiConfidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <button
                            onClick={() => updateStatus(ticket._id, 'in_progress', 'operator')}
                            className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 text-xs transition-colors"
                          >
                            {t('support.takeToWork') || 'Взять в работу'}
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTicket(activeTicket === ticket._id ? null : ticket._id)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-xs transition-colors"
                        >
                          {t('support.reply') || 'Ответить'}
                        </button>
                        {ticket.status !== 'resolved' && (
                          <button
                            onClick={() => updateStatus(ticket._id, 'resolved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> {t('support.resolve') || 'Закрыть'}
                          </button>
                        )}
                      </div>
                      {activeTicket === ticket._id && (
                        <div className="mt-3 flex flex-col gap-2 animate-in fade-in">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder={t('support.replyPlaceholder') || 'Введите ответ...'}
                            className="w-full px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500 min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendReply(ticket._id)}
                              className="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs transition-colors"
                            >
                              {t('support.send') || 'Отправить'}
                            </button>
                            <button
                              onClick={() => setActiveTicket(null)}
                              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-xs transition-colors"
                            >
                              {t('common.cancel') || 'Отмена'}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
