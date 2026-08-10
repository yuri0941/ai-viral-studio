import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Trophy, Droplets, Target, Share2, Copy, CheckCircle } from 'lucide-react';
import { request } from '../../../../services/api.js';

export default function GrowthLoopTab() {
  const { t } = useTranslation();
  const [referral, setReferral] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [watermark, setWatermark] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const ref = await request('/growth-loop/referral');
      setReferral(ref);
      const lb = await request('/growth-loop/leaderboard?period=month');
      setLeaderboard(lb.data || []);
      const ch = await request('/growth-loop/challenge?theme=viral-august');
      setChallenge(ch.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const copy = () => {
    if (referral?.link) {
      navigator.clipboard.writeText(referral.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-[var(--primary)]" /> {t('growthLoop.title') || 'Viral Growth Loop'}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-luxury rounded-2xl p-6 space-y-4 md:col-span-2">
          <h3 className="font-semibold flex items-center gap-2"><Share2 className="w-4 h-4" /> {t('growthLoop.referral') || 'Реферальная программа'}</h3>
          {referral ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input readOnly value={referral.link} className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
                <button onClick={copy} className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm flex items-center gap-1">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('copied') || 'Скопировано' : t('copy') || 'Копировать'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"><div className="font-bold text-[var(--primary)]">{referral.clicks || 0}</div><div className="text-[var(--text-muted)]">{t('growthLoop.clicks') || 'Клики'}</div></div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"><div className="font-bold text-[var(--primary)]">{referral.signups || 0}</div><div className="text-[var(--text-muted)]">{t('growthLoop.signups') || 'Регистрации'}</div></div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"><div className="font-bold text-[var(--primary)]">{referral.revenue || 0} ₽</div><div className="text-[var(--text-muted)]">{t('growthLoop.revenue') || 'Доход'}</div></div>
              </div>
            </div>
          ) : <p className="text-sm text-[var(--text-muted)]">{t('common.loading')}</p>}
        </div>

        <div className="glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Droplets className="w-4 h-4" /> {t('growthLoop.watermark') || 'Watermark'}</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('growthLoop.watermarkLabel') || 'Сделано в AI Viral Studio'}</span>
            <button onClick={() => setWatermark(!watermark)} className={`w-11 h-6 rounded-full transition-colors ${watermark ? 'bg-[var(--primary)]' : 'bg-white/10'} relative`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${watermark ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{t('growthLoop.watermarkHint') || 'Автоматически добавляется к контенту free и creator.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="w-4 h-4" /> {t('growthLoop.leaderboard') || 'Leaderboard'}</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {leaderboard.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-[var(--primary)] text-white' : 'bg-white/5'}`}>{i + 1}</div>
                <div className="flex-1 text-sm font-medium">{item.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{item.signups} {t('growthLoop.signups') || 'reg'}</div>
                <div className="text-xs font-bold text-[var(--primary)]">{item.viralScore}</div>
              </div>
            ))}
            {!leaderboard.length && <p className="text-sm text-[var(--text-muted)]">{t('growthLoop.emptyLeaderboard') || 'Пока пусто'}</p>}
          </div>
        </div>

        <div className="glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> {t('growthLoop.challenge') || 'Challenge'}</h3>
          {challenge ? (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="text-sm font-bold mb-2">{challenge.title}</div>
              <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{challenge.description}</p>
              <div className="mt-3 text-xs text-[var(--text-muted)]">{t('growthLoop.prize') || 'Приз'}: {challenge.prize}</div>
            </div>
          ) : <p className="text-sm text-[var(--text-muted)]">{t('common.loading')}</p>}
        </div>
      </div>
    </div>
  );
}
