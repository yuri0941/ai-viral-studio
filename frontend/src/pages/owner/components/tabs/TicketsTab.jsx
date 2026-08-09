import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket, Eye, AlertTriangle, CheckCircle, ArrowUpCircle, Bell, MessageSquare, X, Send, Clock, Filter } from 'lucide-react';
import { request } from '../../../../services/api.js';

const STATUS_STYLES = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ai_handled: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  needs_owner: 'bg-red-500/10 text-red-400 border-red-500/20',
  resolved: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
};

const PRIORITY_STYLES = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  normal: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
};

const SOURCE_BADGES = {
  telegram: { icon: 'TG', label: 'Telegram' },
  web: { icon: 'Web', label: 'Web' },
  widget: { icon: 'Widget', label: 'Widget' },
  chat: { icon: 'Chat', label: 'Chat' }
};

export default function TicketsTab() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [context, setContext] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await request('/support');
      setTickets(data.data || []);
    } catch (err) {
      console.error('[TicketsTab] load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    try {
      const data = await request(`/support/${ticket._id}/context`);
      setContext(data.data || null);
    } catch (err) {
      console.error('[TicketsTab] context:', err);
      setContext(null);
    }
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    await request(`/support/${selected._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setSelected(prev => prev ? { ...prev, status } : null);
    await loadTickets();
  };

  const escalate = async () => {
    if (!selected) return;
    await request(`/support/${selected._id}/escalate`, { method: 'POST', body: JSON.stringify({ reason: 'Ручная эскалация из Dashboard' }) });
    await openTicket(selected);
    await loadTickets();
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    await request(`/support/${selected._id}/messages`, { method: 'POST', body: JSON.stringify({ text: reply.trim(), sender: 'Owner' }) });
    setReply('');
    await openTicket(selected);
    setSending(false);
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter || t.priority === filter);

  return (
    <div className="space-y-4 p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text)]"><Ticket className="w-6 h-6 text-[var(--primary)]" /> {t('tickets.title') || 'Обращения'}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{tickets.length} {t('tickets.total') || 'обращений'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm px-3 py-2 focus:border-[var(--primary)]/50 focus:outline-none">
            <option value="all">{t('tickets.filterAll') || 'Все'}</option>
            <option value="open">{t('tickets.filterOpen') || 'Открытые'}</option>
            <option value="needs_owner">{t('tickets.filterNeedsOwner') || 'Нужен оператор'}</option>
            <option value="urgent">{t('tickets.filterUrgent') || 'Срочные'}</option>
          </select>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-1 glass-luxury rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[var(--border)] font-medium text-sm text-[var(--text)]">{t('tickets.list') || 'Список'}</div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {loading ? <div className="text-sm text-[var(--text-muted)] p-4">{t('common.loading')}</div> : filtered.length === 0 ? <div className="text-sm text-[var(--text-muted)] p-4">{t('tickets.empty') || 'Нет обращений'}</div> : filtered.map(t => {
              const source = SOURCE_BADGES[t.source] || SOURCE_BADGES.web;
              return (
                <button key={t._id} onClick={() => openTicket(t)} className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?._id === t._id ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--primary)]/30'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">#{t._id?.toString().slice(-6)} — {t.subject}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{t.userName || t.userEmail}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.normal}`}>{t.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>{t.status}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">{source.icon}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 glass-luxury rounded-2xl border border-[var(--border)] p-5 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-muted)]">{t('tickets.select') || 'Выберите обращение'}</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)]">{selected.subject}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${PRIORITY_STYLES[selected.priority]}`}>{selected.priority}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10">{(SOURCE_BADGES[selected.source] || SOURCE_BADGES.web).icon}</span>
                    <span className="text-xs text-[var(--text-muted)]">{new Date(selected.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{t('tickets.client') || 'Клиент'}</p>
                  <p className="text-sm text-[var(--text)] font-medium">{selected.userName || '—'}</p>
                  <p className="text-xs text-[var(--text-muted)]">{selected.userEmail}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{t('tickets.aiConfidence') || 'AI уверенность'}</p>
                  <p className="text-sm text-[var(--text)] font-medium">{Math.round((selected.aiConfidence || 0) * 100)}%</p>
                  {selected.aiSuggestion && <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{selected.aiSuggestion}</p>}
                </div>
              </div>

              {context && (
                <div className="mb-4 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <h4 className="text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2"><Eye className="w-4 h-4" /> {t('tickets.fullContext') || 'Полный контекст'}</h4>
                  <div className="text-xs text-[var(--text-muted)] space-y-1">
                    <p>{t('tickets.relatedTickets') || 'Связанных тикетов'}: {context.relatedTickets?.length || 0}</p>
                    <p>{t('tickets.totalUserTickets') || 'Всего у клиента'}: {context.metrics?.totalUserTickets || 1}</p>
                    {context.recommendations?.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-white/5 border border-white/10">
                        <p className="text-[var(--text)]">{context.recommendations[0]}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto space-y-3 mb-4 max-h-64">
                <div className="p-3 rounded-xl rounded-tl-none bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{selected.userName || t('tickets.client')}</p>
                  <p className="text-sm text-[var(--text)]">{selected.description}</p>
                </div>
                {(selected.messages || []).map((m, i) => (
                  <div key={i} className={`p-3 rounded-xl ${m.sender === 'Owner' ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-tr-none ml-8' : 'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-tl-none mr-8'}`}>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{m.sender}</p>
                    <p className="text-sm text-[var(--text)]">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="flex items-center gap-2 mb-4">
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder={t('tickets.reply') || 'Ответить...'} className="flex-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm focus:border-[var(--primary)]/50 focus:outline-none" />
                <button type="submit" disabled={sending || !reply.trim()} className="px-4 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {sending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('tickets.send') || 'Отправить'}
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateStatus('resolved')} className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> {t('tickets.resolve') || 'Resolve'}
                </button>
                <button onClick={() => updateStatus('in_progress')} className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {t('tickets.inProgress') || 'In Progress'}
                </button>
                <button onClick={escalate} className="px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5" /> {t('tickets.escalate') || 'Escalate'}
                </button>
                <button onClick={() => alert(t('tickets.alertSent') || 'Алерт отправлен')} className="px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> {t('tickets.alert') || 'Alert'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
