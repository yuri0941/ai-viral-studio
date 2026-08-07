import { useState, useEffect } from 'react';
import { CreditCard, Save, Check, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../../config.js';

export function PaymentProvidersTab() {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({
    name: 'yookassa',
    displayName: 'ЮKassa',
    publicKey: '',
    secretKey: '',
    shopId: '',
    defaultCurrency: 'RUB',
    commissionPercent: 3.5
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load providers');
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : data.providers || []);
    } catch (err) {
      console.error('[PaymentProvidersTab] load failed:', err.message);
    }
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          displayName: form.displayName,
          config: { publicKey: form.publicKey, secretKey: form.secretKey, shopId: form.shopId },
          supportedCountries: form.name === 'yookassa' || form.name === 'sberpay' || form.name === 'tinkoff'
            ? ['RU', 'KZ', 'BY', 'AM']
            : ['US', 'EU', 'GB', 'CA', 'AU'],
          defaultCurrency: form.defaultCurrency,
          commissionPercent: parseFloat(form.commissionPercent) || 0
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadProviders();
    } catch (err) {
      console.error('[PaymentProvidersTab] save failed:', err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">💳 Платёжные системы</h2>

      <div className="glass-luxury rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Добавить / обновить провайдера</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          >
            <option value="yookassa">ЮKassa (Россия, СНГ)</option>
            <option value="stripe">Stripe (Мир)</option>
            <option value="paypal">PayPal</option>
            <option value="crypto">Криптовалюта</option>
            <option value="sberpay">SberPay</option>
            <option value="tinkoff">Tinkoff Pay</option>
          </select>
          <input
            className="glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            placeholder="Название для клиента"
            value={form.displayName}
            onChange={e => setForm({ ...form, displayName: e.target.value })}
          />
          <input
            className="glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            placeholder="Public Key / Shop ID"
            value={form.publicKey}
            onChange={e => setForm({ ...form, publicKey: e.target.value })}
          />
          <input
            className="glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            placeholder="Secret Key"
            type="password"
            value={form.secretKey}
            onChange={e => setForm({ ...form, secretKey: e.target.value })}
          />
          <input
            className="glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            placeholder="Shop ID (для ЮKassa)"
            value={form.shopId}
            onChange={e => setForm({ ...form, shopId: e.target.value })}
          />
          <input
            className="glass-luxury rounded-lg p-3 text-sm bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            placeholder="Комиссия %"
            value={form.commissionPercent}
            onChange={e => setForm({ ...form, commissionPercent: e.target.value })}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
        >
          <Save size={16} />
          {saved ? <><Check size={16} /> Сохранено</> : (loading ? 'Сохранение...' : 'Сохранить и активировать')}
        </button>
      </div>

      <div className="glass-luxury rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Активные провайдеры</h3>
        {providers.length === 0 ? (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            Нет активных провайдеров. Клиенты не смогут оплатить.
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map(p => (
              <div key={p._id || p.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <div className="font-medium">{p.displayName || p.name}</div>
                  <div className="text-xs text-text-muted">
                    {p.defaultCurrency} • Комиссия {p.commissionPercent || 0}% • {p.supportedCountries?.join(', ') || 'Все страны'}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {p.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
