import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Concierge, X, Send, Calendar, Package, CreditCard, HelpCircle, Loader2 } from 'lucide-react';
import { request } from '../../services/api.js';

const TYPES = [
  { id: 'booking', icon: Calendar, label: 'concierge.booking' },
  { id: 'order', icon: Package, label: 'concierge.order' },
  { id: 'purchase', icon: CreditCard, label: 'concierge.purchase' },
  { id: 'info', icon: HelpCircle, label: 'concierge.info' }
];

export default function ConciergeWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(null);
  const [details, setDetails] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!type || !details.trim()) return;
    setLoading(true);
    try {
      const data = await request('/concierge/request', {
        method: 'POST',
        body: JSON.stringify({ request: `[${type}] ${details}` })
      });
      setResult(data.result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-transform">
        <Concierge className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed bottom-40 right-6 z-50 w-80 glass-luxury rounded-2xl border border-[var(--border)] p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Concierge className="w-4 h-4 text-[var(--primary)]" /> {t('concierge.title') || 'Concierge'}</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>
          </div>

          {!type ? (
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-2 transition-colors">
                  <t.icon className="w-5 h-5 text-[var(--primary)]" />
                  <span className="text-xs">{t(t.label)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">{t(`concierge.${type}Hint`) || 'Опишите детали'}</p>
              <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder={t('concierge.placeholder') || 'Например, забронировать студию на завтра в 15:00'} className="w-full h-24 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm resize-none" />
              <button onClick={submit} disabled={loading || !details.trim()} className="w-full py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('common.submit') || 'Отправить'}
              </button>
              {result && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm">
                  <p className="font-medium mb-1">{t('concierge.received') || 'Принято'}: {result.intent}</p>
                  <p className="text-[var(--text-muted)] text-xs">{result.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
