import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, MessageCircle, History, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { request } from '../../../services/api.js';

const STATUS_LABELS = {
  open: 'Открыт',
  in_progress: 'В работе',
  ai_handled: 'AI обработал',
  needs_owner: 'Нужен оператор',
  resolved: 'Решён',
  closed: 'Закрыт'
};

const STATUS_ICONS = {
  open: Clock,
  in_progress: Clock,
  ai_handled: CheckCircle,
  needs_owner: AlertCircle,
  resolved: CheckCircle,
  closed: CheckCircle
};

export default function SupportTab() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTickets = async () => {
    try {
      const data = await request('/support/my');
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('[SupportTab] load tickets:', err);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await request('/support', {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), description: description.trim(), source: 'web' })
      });
      setSuccess(t('support.created') || 'Обращение создано. OMEGA или оператор ответят вам soon.');
      setSubject('');
      setDescription('');
      await loadTickets();
    } catch (err) {
      setError(err.message || t('support.error') || 'Не удалось создать обращение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text)]">
            <MessageCircle className="w-5 h-5 text-[var(--primary)]" />
            {t('support.title') || 'Поддержка'}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t('support.subtitle') || 'Создайте тикет — OMEGA или команда ответит вам.'}</p>
        </div>
        <a
          href="https://t.me/aiviral_omega_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm hover:border-[var(--primary)]/50 transition-colors"
        >
          <Send className="w-4 h-4" />
          {t('support.telegram') || 'Написать в Telegram'}
        </a>
      </div>

      <form onSubmit={handleSubmit} className="glass-luxury rounded-2xl p-5 border border-[var(--border)] space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t('support.subject') || 'Тема'}</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('support.subjectPlaceholder') || 'Например, проблема с оплатой'}
            className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm focus:border-[var(--primary)]/50 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t('support.description') || 'Описание'}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder={t('support.descriptionPlaceholder') || 'Опишите проблему подробно...'}
            className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm focus:border-[var(--primary)]/50 focus:outline-none transition-colors resize-none"
          />
        </div>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</div>}
        {success && <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">{success}</div>}
        <button
          type="submit"
          disabled={loading || !subject.trim() || !description.trim()}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t('support.send') || 'Отправить'}
        </button>
      </form>

      <div className="glass-luxury rounded-2xl p-5 border border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--text-muted)]" />
          {t('support.history') || 'История обращений'}
        </h3>
        {tickets.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t('support.noTickets') || 'Пока нет обращений.'}</p>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const Icon = STATUS_ICONS[ticket.status] || Clock;
              return (
                <div key={ticket._id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--text)]">#{ticket._id?.toString().slice(-6)}</span>
                      <span className="text-xs text-[var(--text-muted)]">{new Date(ticket.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <p className="text-sm text-[var(--text)] font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{ticket.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                    <Icon className="w-3 h-3" />
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
