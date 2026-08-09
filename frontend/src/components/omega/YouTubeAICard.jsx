import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Youtube, Play, FileText, Search, Loader2 } from 'lucide-react';
import { request } from '../../services/api.js';

export default function YouTubeAICard() {
  const { t } = useTranslation();
  const [channelId, setChannelId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [duration, setDuration] = useState(30);
  const [script, setScript] = useState('');
  const [titles, setTitles] = useState('');
  const [loading, setLoading] = useState('');

  const fetchAnalytics = async () => {
    if (!channelId) return;
    setLoading('analytics');
    try {
      const data = await request(`/api/omega/youtube/analyze?channelId=${encodeURIComponent(channelId)}`);
      setAnalytics(data.data || data.demo || {});
    } catch (e) { console.error(e); }
    setLoading('');
  };

  const generateScript = async () => {
    if (!topic) return;
    setLoading('script');
    try {
      const data = await request('/api/omega/youtube/shorts', {
        method: 'POST',
        body: JSON.stringify({ topic, niche, duration })
      });
      setScript(data.script || data.data?.script || '');
    } catch (e) { console.error(e); }
    setLoading('');
  };

  const generateTitles = async () => {
    if (!topic) return;
    setLoading('titles');
    try {
      const data = await request('/api/omega/youtube/titles', {
        method: 'POST',
        body: JSON.stringify({ topic, niche, count: 5 })
      });
      setTitles(data.data?.titles || data.titles || '');
    } catch (e) { console.error(e); }
    setLoading('');
  };

  return (
    <div className="glass-luxury rounded-2xl p-5 border border-[var(--border)] space-y-4">
      <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
        <Youtube className="w-5 h-5 text-red-500" /> {t('youtube.title') || 'YouTube AI'}
      </h3>

      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{t('youtube.channelId') || 'Channel ID'}</label>
        <div className="flex gap-2">
          <input
            value={channelId}
            onChange={e => setChannelId(e.target.value)}
            placeholder="UC..."
            className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm"
          />
          <button onClick={fetchAnalytics} disabled={loading === 'analytics'} className="px-3 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 disabled:opacity-50 flex items-center gap-1">
            {loading === 'analytics' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            {t('youtube.analyze') || 'Аналитика'}
          </button>
        </div>
        {analytics && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="text-[var(--text-muted)]">{t('youtube.subscribers') || 'Подписчики'}</div>
              <div className="font-semibold text-[var(--text)]">{analytics.subscribers?.toLocaleString?.() || analytics.subscriberCount || 0}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="text-[var(--text-muted)]">{t('youtube.views') || 'Просмотры'}</div>
              <div className="font-semibold text-[var(--text)]">{analytics.views?.toLocaleString?.() || analytics.viewCount || 0}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="text-[var(--text-muted)]">{t('youtube.videos') || 'Видео'}</div>
              <div className="font-semibold text-[var(--text)]">{analytics.videos || analytics.videoCount || 0}</div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-[var(--text-muted)]">{t('youtube.topic') || 'Тема'}</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="AI tools for creators" className="w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
        <div className="flex gap-2">
          <input value={niche} onChange={e => setNiche(e.target.value)} placeholder={t('youtube.niche') || 'Ниша'} className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
          <input value={duration} onChange={e => setDuration(Number(e.target.value))} type="number" className="w-20 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={generateScript} disabled={loading === 'script'} className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 text-xs flex items-center justify-center gap-1">
            {loading === 'script' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {t('youtube.shorts') || 'Shorts'}
          </button>
          <button onClick={generateTitles} disabled={loading === 'titles'} className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/30 text-xs flex items-center justify-center gap-1">
            {loading === 'titles' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            {t('youtube.titles') || 'Заголовки'}
          </button>
        </div>
        {script && (
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs whitespace-pre-wrap max-h-40 overflow-auto">{script}</div>
        )}
        {titles && (
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs whitespace-pre-wrap max-h-40 overflow-auto">{titles}</div>
        )}
      </div>
    </div>
  );
}
