import { useState, useEffect } from 'react';
import { X, CreditCard, Globe, Bitcoin, Check, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config.js';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

function getPlanPrice(plan, currency = 'RUB') {
  if (!plan) return 0;
  if (currency === 'USD') return plan.priceUSD ?? plan.price ?? 0;
  return plan.priceRUB ?? plan.price ?? 0;
}

export default function PaymentMethodSelector({ plan, onClose, userId, email }) {
  const { t } = useTranslation();
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('RU');
  const [currency, setCurrency] = useState('RUB');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/payments/methods`)
      .then(r => r.ok ? r.json() : r.json().then(j => { throw new Error(j.error || 'Failed to load methods') }))
      .then(data => {
        if (cancelled) return;
        setMethods(data.methods || []);
        setCountry(data.country || 'RU');
        setCurrency(data.currency || 'RUB');
        const rec = data.methods?.find(m => m.recommended && m.id !== 'crypto') || data.methods?.[0];
        if (rec) setSelected(rec.id);
      })
      .catch(err => {
        console.error('[PaymentMethodSelector] load methods failed:', err.message);
      });
    return () => { cancelled = true; };
  }, []);

  const handlePay = async () => {
    if (!selected || !plan) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const price = getPlanPrice(plan, currency);
      const res = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          provider: selected,
          priceId: plan.id,
          userId: userId || userId?._id || '',
          plan: plan.id,
          email: email || '',
          price,
          currency
        })
      });
      const data = await res.json().catch(() => ({ error: 'Invalid response' }));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Payment failed');
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.address) {
        toast(`${t('payment.cryptoAlert') || 'Send'} ${data.amount} ${data.currency || 'BTC'} ${t('payment.cryptoTo') || 'to'} ${data.address}`, { duration: 8000 });
        return;
      }
      throw new Error(data.error || 'Payment session not created');
    } catch (err) {
      console.error('[PaymentMethodSelector] pay error:', err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (id) => {
    switch (id) {
      case 'yookassa': return <span className="text-lg">🇷🇺</span>;
      case 'sberpay': return <span className="text-lg">🇷🇺</span>;
      case 'tinkoff': return <span className="text-lg">🇷🇺</span>;
      case 'stripe': return <CreditCard size={20} />;
      case 'paypal': return <span className="text-lg">🅿️</span>;
      case 'crypto': return <Bitcoin size={20} />;
      default: return <Globe size={20} />;
    }
  };

  const price = getPlanPrice(plan, currency);
  const priceLabel = currency === 'RUB' ? `${price.toLocaleString('ru-RU')} ₽` : `$${price}`;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-luxury w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors">
          <X size={20} />
        </button>

        <h3 className="text-xl font-semibold mb-1">{t('payment.selectMethod')}</h3>
        <p className="text-sm text-text-muted mb-6">
          {t('payment.detectedCountry')}: {country}
          <span className="text-xs ml-2 opacity-60">({t('payment.autoDetected')})</span>
        </p>

        <div className="space-y-2 mb-6">
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                selected === m.id
                  ? 'border-primary bg-primary-soft'
                  : 'border-transparent bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                {getIcon(m.id)}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{m.name}</div>
                <div className="text-xs text-text-muted">
                  {m.currency} • {m.commission > 0 ? `${t('payment.commission') || 'Commission'} ${m.commission}%` : (t('payment.noCommission') || 'No commission')}
                </div>
              </div>
              {m.recommended && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {t('payment.recommended')}
                </span>
              )}
              {selected === m.id && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>

        {methods.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            {t('payment.noMethods')}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={!selected || loading || methods.length === 0}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? t('payment.processing') || 'Processing...' : `${t('payment.pay')} ${priceLabel}`}
        </button>

        <p className="text-center text-xs text-text-muted mt-4">
          {t('payment.secure')}
        </p>
      </div>
    </div>
  );
}
