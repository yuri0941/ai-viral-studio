import React, { useEffect, useRef, useState } from 'react';
import { Eye, Heart, MessageCircle, Users, Download, Copy, Check, Image as ImageIcon, CalendarPlus, Clock, Loader2, AlertTriangle, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation.js';
import { omegaApi, request } from '../../services/api.js';

// [YT-DATA-REAL-STATS] LUXE-CARD анализа YouTube-видео.
// Компактный вариант — в OMEGA Chat, полный — на экране анализа.
// Все цифры приходят с бэкенда из YouTube Data API (никаких выдуманных).

// Формат 36 857 (неразрывный пробел-тысячник через toLocaleString)
function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('ru-RU');
}

// Count-up анимация числа
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target === null || target === undefined) { setValue(0); return; }
    const end = Number(target) || 0;
    const startTs = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(end * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

function StatMini({ icon: Icon, label, value, accent }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-bold text-white tabular-nums">{value === null || value === undefined ? '—' : fmtNum(animated)}</div>
    </div>
  );
}

// Донат «AI-рейтинг» — рейтинг посчитан на бэкенде из реальных метрик (формула в youtubeDataService.computeVideoRating)
function RatingDonut({ score, size = 88, formula }) {
  const animated = useCountUp(score, 1100);
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animated / 100) * circ;
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={formula || undefined}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ytRatingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ytRatingGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums" style={{ color }}>{animated}</span>
        <span className="text-[9px] text-gray-500">/100</span>
      </div>
    </div>
  );
}

// [CHAT-UNIFY] честные цвета: слабые метрики — красным/янтарным, а не «всё красиво»
function barColor(value) {
  if (value === null || value === undefined) return 'bg-white/20';
  if (value < 40) return 'bg-gradient-to-r from-red-500 to-rose-400';
  if (value < 70) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
  return 'bg-gradient-to-r from-emerald-500 to-teal-400';
}

function RatingBar({ label, value }) {
  const animated = useCountUp(value ?? 0, 1000);
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`font-medium tabular-nums ${value < 40 ? 'text-rose-300' : 'text-white'}`}>{value === null || value === undefined ? '—' : `${animated}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className={`h-full rounded-full ${barColor(value)} transition-all duration-700`} style={{ width: `${animated}%` }} />
      </div>
    </div>
  );
}

// Экспорт PDF через печать браузера (без новых зависимостей)
function exportPdf(data, rating, t) {
  const bars = rating?.bars || {};
  const row = (label, val) => `<tr><td style="padding:6px 10px;color:#555">${label}</td><td style="padding:6px 10px;font-weight:600">${val}</td></tr>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('ytCard.pdfTitle')}</title>
  <style>body{font-family:system-ui,Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;margin:16px 0}td{border:1px solid #ddd}.muted{color:#888;font-size:12px}img{max-width:320px;border-radius:8px}</style>
  </head><body>
  <h1>${data.title || 'YouTube'}</h1>
  <div class="muted">${data.channelTitle || ''} · ${data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : ''} · ${data.url || ''}</div>
  ${data.thumbnail ? `<img src="${data.thumbnail}" alt="">` : ''}
  <table>
    ${row(t('ytCard.views'), fmtNum(data.stats?.views))}
    ${row(t('ytCard.likes'), fmtNum(data.stats?.likes))}
    ${row(t('ytCard.comments'), fmtNum(data.stats?.comments))}
    ${row(t('ytCard.subscribers'), fmtNum(data.stats?.subscribers))}
  </table>
  ${rating ? `<h2 style="font-size:16px">${t('ytCard.aiRating')}: ${rating.score}/100</h2>
  <table>
    ${row(t('ytCard.virality'), bars.virality + '%')}
    ${row(t('ytCard.engagement'), bars.engagement + '%')}
    ${row(t('ytCard.retention'), bars.retention + '%')}
    ${row(t('ytCard.seo'), bars.seo + '%')}
    ${row(t('ytCard.growth'), bars.growth + '%')}
  </table>` : ''}
  <div class="muted">${t('ytCard.pdfFooter')}</div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) { toast.error(t('ytCard.popupBlocked')); return; }
  win.document.write(html);
  win.document.close();
}

export function YouTubeAnalysisCard({ data, variant = 'compact', onAction }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [coverUrl, setCoverUrl] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [showTags, setShowTags] = useState(false);

  if (!data) return null;
  const { stats, rating, statsAvailable } = data;

  // [CHAT-UNIFY] «💡 Советы»: приоритет — советы с бэкенда; иначе честно выводим из 2 самых слабых баров (те же реальные метрики)
  const tips = (() => {
    if (Array.isArray(data.tips) && data.tips.length > 0) return data.tips;
    if (!rating?.bars) return [];
    const order = ['virality', 'engagement', 'retention', 'seo', 'growth'];
    return order
      .map(key => ({ key, value: rating.bars[key] }))
      .filter(b => b.value !== null && b.value !== undefined)
      .sort((a, b) => a.value - b.value)
      .slice(0, 2)
      .map(b => t(`ytCard.tip.${b.key}`));
  })();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.url || `https://youtu.be/${data.videoId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error(t('ytCard.copyFailed')); }
  };

  // Действия из чата — реальные вызовы существующих сервисов
  const makeCover = async () => {
    setBusy('cover');
    try {
      const res = await omegaApi.generateCover({
        prompt: `YouTube thumbnail, bold text, high contrast, eye-catching: ${data.title || 'video'}`,
        style: 'realistic',
        size: '1920x1080',
      });
      if (res?.url) {
        setCoverUrl(res.url);
        toast.success(t('ytCard.coverReady'));
      } else {
        toast.error(t('ytCard.coverFailed'));
      }
    } catch (e) {
      toast.error(t('ytCard.coverFailed') + ': ' + (e.message || ''));
    } finally { setBusy(''); }
  };

  const createDraft = async (mediaUrl = '') => {
    setBusy('draft');
    try {
      const res = await request('/scheduled-posts', {
        method: 'POST',
        body: JSON.stringify({
          title: `Пост по видео: ${data.title || data.videoId}`.slice(0, 120),
          content: `${data.title || ''}\n${data.url || ''}`,
          platforms: ['youtube'],
          types: ['post'],
          status: 'draft',
          mediaUrl,
        }),
      });
      if (res?.data?._id || res?.status === 'success') {
        toast.success(t('ytCard.draftCreated'));
      } else {
        toast.error(t('ytCard.draftFailed'));
      }
    } catch (e) {
      toast.error(t('ytCard.draftFailed') + ': ' + (e.message || ''));
    } finally { setBusy(''); }
  };

  const askBestTime = async () => {
    setBusy('bestTime');
    try {
      const res = await omegaApi.bestTime({ platform: 'youtube' });
      const bt = res?.data;
      if (bt?.bestTime) {
        setBestTime(bt);
      } else {
        toast.error(t('ytCard.bestTimeFailed'));
      }
    } catch (e) {
      toast.error(t('ytCard.bestTimeFailed') + ': ' + (e.message || ''));
    } finally { setBusy(''); }
  };

  const actionBtn = (key, icon, label, onClick, accentCls = 'bg-white/[0.06] hover:bg-violet-500/20 hover:text-violet-200 text-gray-300') => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={!!busy}
      className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded-full border border-white/[0.1] text-xs font-medium transition-all disabled:opacity-50 ${accentCls}`}
    >
      {busy === key ? <Loader2 size={13} className="animate-spin" /> : icon}
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-[95%] mx-auto mb-3 rounded-2xl overflow-hidden border border-white/[0.1] bg-gradient-to-br from-red-500/[0.10] via-white/[0.03] to-violet-500/[0.08] backdrop-blur-xl shadow-lg shadow-black/30">
      {/* Превью — то же, что у клиента: snippet.thumbnails лучшего качества с бэкенда */}
      <div className="relative">
        {data.thumbnail && (
          <img src={data.thumbnail} alt={data.title || 'YouTube'} className="w-full aspect-video object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase">YouTube</span>
            {statsAvailable && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-bold">{t('ytCard.realData')}</span>
            )}
            {data.publishedAt && (
              <span className="text-[10px] text-gray-300">{new Date(data.publishedAt).toLocaleDateString()}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white line-clamp-2">{data.title || data.videoId}</h3>
          {data.channelTitle && <p className="text-[11px] text-gray-400 mt-0.5">{data.channelTitle}</p>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Честный fallback: нет ключа / fetch упал → статистика недоступна, ни одной выдуманной цифры */}
        {!statsAvailable ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-300 text-xs">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{data.statsError || t('ytCard.statsUnavailable')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatMini icon={Eye} label={t('ytCard.views')} value={stats?.views} accent="text-sky-400" />
            <StatMini icon={Heart} label={t('ytCard.likes')} value={stats?.likes} accent="text-rose-400" />
            <StatMini icon={MessageCircle} label={t('ytCard.comments')} value={stats?.comments} accent="text-emerald-400" />
            <StatMini icon={Users} label={t('ytCard.subscribers')} value={stats?.subscribers} accent="text-violet-400" />
          </div>
        )}

        {/* Донат AI-рейтинг + 5 баров (в обоих вариантах — карточка живёт в чате) */}
        {rating && (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="flex flex-col items-center gap-1">
              <RatingDonut score={rating.score} formula={rating.formula} />
              <span className="text-[10px] text-gray-400">{t('ytCard.aiRating')}</span>
              {rating.formula && (
                <span className="text-[9px] text-gray-600 text-center max-w-[110px] leading-tight">{rating.formula}</span>
              )}
            </div>
            <div className="flex-1 w-full space-y-2 min-w-0">
              <RatingBar label={t('ytCard.virality')} value={rating.bars.virality} />
              <RatingBar label={t('ytCard.engagement')} value={rating.bars.engagement} />
              <RatingBar label={t('ytCard.retention')} value={rating.bars.retention} />
              <RatingBar label={t('ytCard.seo')} value={rating.bars.seo} />
              <RatingBar label={t('ytCard.growth')} value={rating.bars.growth} />
            </div>
          </div>
        )}

        {/* Советы для улучшения (с бэкенда или из самых слабых метрик — без выдумок) */}
        {tips.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
            <h4 className="text-xs font-semibold text-white/90 mb-2">💡 {t('ytCard.tips')}</h4>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-300 flex gap-2">
                  <span className="text-violet-400 shrink-0">{i + 1}.</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Реальные SEO-теги видео (snippet.tags с бэкенда) */}
        {showTags && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
            <h4 className="text-xs font-semibold text-white/90 mb-2">🔖 {t('ytCard.seoTags')}</h4>
            {Array.isArray(data.tags) && data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[11px] text-violet-200">{tag}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">{t('ytCard.noTags')}</p>
            )}
          </div>
        )}

        {/* Результаты действий */}
        {coverUrl && (
          <div className="space-y-2">
            <img src={coverUrl} alt={t('ytCard.coverReady')} className="w-full rounded-xl border border-white/10" loading="lazy" />
            <button
              type="button"
              onClick={() => createDraft(coverUrl)}
              disabled={!!busy}
              className="w-full flex items-center justify-center gap-2 px-3 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-all disabled:opacity-50"
            >
              {busy === 'draft' ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
              {t('ytCard.useInPost')}
            </button>
          </div>
        )}
        {bestTime && (
          <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-xs">
            <div className="text-emerald-300 font-semibold mb-1">⏰ {t('ytCard.bestTimeIs')}: {bestTime.bestTime}</div>
            <div className="text-gray-300">{bestTime.reason}</div>
            {bestTime.alternativeTimes?.length > 0 && (
              <div className="text-gray-500 mt-1">{t('ytCard.alsoGood')}: {bestTime.alternativeTimes.join(', ')}</div>
            )}
          </div>
        )}

        {/* Табы действий + Экспорт PDF + Копировать ссылку */}
        <div className="flex flex-wrap gap-2">
          {actionBtn('cover', <ImageIcon size={13} />, t('ytCard.makeCover'), makeCover)}
          {actionBtn('draft', <CalendarPlus size={13} />, t('ytCard.createPost'), () => createDraft())}
          {actionBtn('bestTime', <Clock size={13} />, t('ytCard.bestTime'), askBestTime)}
          {actionBtn('seo', <Tag size={13} />, t('ytCard.seoTags'), () => setShowTags(v => !v), showTags ? 'bg-violet-500/20 text-violet-200' : undefined)}
          {actionBtn('pdf', <Download size={13} />, t('ytCard.exportPdf'), () => exportPdf(data, rating, t))}
          {actionBtn('copy', copied ? <Check size={13} /> : <Copy size={13} />, copied ? t('ytCard.copied') : t('ytCard.copyLink'), copyLink)}
        </div>
      </div>
    </div>
  );
}

export default YouTubeAnalysisCard;
