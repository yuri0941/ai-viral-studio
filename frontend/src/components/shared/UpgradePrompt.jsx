import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { request } from '../../services/api.js';

export default function UpgradePrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [limits, setLimits] = useState(null);
  const [hiddenUntil, setHiddenUntil] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('upgrade-prompt-hidden');
    if (stored && new Date(stored) > new Date()) {
      setHiddenUntil(new Date(stored));
      return;
    }
    request('/api/free-to-paid/limits')
      .then(data => {
        const gens = data.limits?.generations;
        if (gens && !gens.allowed && gens.plan === 'free') {
          setLimits(gens);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const hide = () => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
    localStorage.setItem('upgrade-prompt-hidden', until.toISOString());
    setHiddenUntil(until);
    setVisible(false);
  };

  if (!visible || hiddenUntil) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-lg animate-slide-up">
      <div className="glass-luxury rounded-2xl p-5 border border-[var(--primary)]/30 shadow-2xl shadow-[var(--primary)]/10 relative">
        <button onClick={hide} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/5 text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Crown className="w-6 h-6" /></div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm md:text-base flex items-center gap-2"><Sparkles className="w-4 h-4" /> {t('freeToPaid.title') || 'Осталось мало генераций'}</h3>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
              {t('freeToPaid.banner', { remaining: limits?.remaining || 0 }) || `Осталось ${limits?.remaining || 0} генераций. Pro — скидка 30%.`}
            </p>
            <div className="flex gap-3 mt-3">
              <a href="/subscriptions" className="flex-1 py-2 rounded-lg bg-[var(--primary)] text-white text-xs md:text-sm font-medium flex items-center justify-center gap-1 hover:bg-[var(--primary)]/90 transition-colors">
                {t('freeToPaid.compare') || 'Сравнить тарифы'} <ArrowRight className="w-3 h-3" />
              </a>
              <button onClick={hide} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs md:text-sm transition-colors">
                {t('freeToPaid.later') || 'Не сейчас'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
