import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Send, RefreshCw, BarChart3, Edit3, Clock, Check } from 'lucide-react';
import { request } from '../../../../services/api.js';

const POST_TYPES = ['value', 'promo', 'case', 'viral', 'poll'];

export function ChannelManagerTab() {
  const { t } = useTranslation();
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('value');
  const [topic, setTopic] = useState('');
  const [preview, setPreview] = useState(null);
  const [autoPosts, setAutoPosts] = useState(false);
  const [growth, setGrowth] = useState(null);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const data = await request('/channel-manager/calendar');
      setCalendar(data.calendar || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const data = await request('/channel-manager/generate', {
        method: 'POST',
        body: JSON.stringify({ type, topic: topic || 'Новость дня' })
      });
      setPreview(data.post);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const publish = async (content) => {
    setLoading(true);
    try {
      await request('/channel-manager/publish', {
        method: 'POST',
        body: JSON.stringify({ content: { text: content.text || content } })
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadGrowth = async () => {
    try {
      const data = await request('/channel-manager/growth');
      setGrowth(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadCalendar(); loadGrowth(); }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[var(--primary)]" />
          {t('channel.title') || 'Channel Manager'}
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={loadCalendar} disabled={loading} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)]">{t('channel.autoPosts') || 'Авто-посты'}</span>
            <button onClick={() => setAutoPosts(!autoPosts)} className={`w-11 h-6 rounded-full transition-colors ${autoPosts ? 'bg-[var(--primary)]' : 'bg-white/10'} relative`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoPosts ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Edit3 className="w-4 h-4" /> {t('channel.generate') || 'Сгенерировать пост'}</h3>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm">
            {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('channel.topicPlaceholder') || 'Тема поста'} className="w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
          <button onClick={generate} disabled={loading} className="w-full py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('btn.generate') || 'Сгенерировать'}
          </button>
          {preview && (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm space-y-3">
              <p className="whitespace-pre-wrap">{preview.text || preview}</p>
              <div className="flex gap-2">
                <button onClick={() => publish(preview)} className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs flex items-center justify-center gap-1"><Send className="w-3 h-3" /> {t('btn.publish') || 'Опубликовать'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> {t('channel.calendar') || 'Календарь на 7 дней'}</h3>
          <div className="space-y-3">
            {calendar.map((day, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="text-xs font-bold text-[var(--primary)] w-16">{day.date}</div>
                <div className="flex-1 text-sm">
                  <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{day.type}</span>
                  <p className="mt-1 line-clamp-2">{day.title}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => publish(day.text)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"><Send className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Clock className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {!calendar.length && <p className="text-sm text-[var(--text-muted)]">{t('channel.empty') || 'Нет данных'}</p>}
          </div>
        </div>
      </div>

      {growth && (
        <div className="glass-luxury rounded-2xl p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4" /> {t('channel.growth') || 'Рост канала'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center"><div className="text-2xl font-bold">{growth.subscribers || 0}</div><div className="text-xs text-[var(--text-muted)]">{t('channel.subscribers') || 'Подписчики'}</div></div>
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center"><div className="text-2xl font-bold">{growth.views || 0}</div><div className="text-xs text-[var(--text-muted)]">{t('channel.views') || 'Просмотры'}</div></div>
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center"><div className="text-2xl font-bold">{growth.posts || 0}</div><div className="text-xs text-[var(--text-muted)]">{t('channel.posts') || 'Посты'}</div></div>
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center"><div className="text-2xl font-bold">{(growth.growthRate || 0).toFixed(2)}</div><div className="text-xs text-[var(--text-muted)]">{t('channel.growthRate') || 'Growth Rate'}</div></div>
          </div>
          <p className="mt-4 text-sm text-[var(--text-muted)]">{growth.recommendation}</p>
        </div>
      )}
    </div>
  );
}

export default ChannelManagerTab;
