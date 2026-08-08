import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle, XCircle, ExternalLink, Shield, Film, Volume2, Mic } from 'lucide-react';
import { request } from '../../../../services/api.js';

const PROVIDERS = [
  { id: 'replicate', label: 'replicate', icon: Film, link: 'https://replicate.com/account/api-tokens', placeholder: 'r8_...' },
  { id: 'elevenlabs', label: 'elevenlabs', icon: Volume2, link: 'https://elevenlabs.io/app/settings/api-keys', placeholder: '...' },
  { id: 'openai', label: 'openai', icon: Mic, link: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
];

function ProviderCard({ provider, status, value, visible, saving, onChange, onToggleVisible, onSave, onDelete }) {
  const { t } = useTranslation();
  const active = status?.isActive;
  const masked = status?.maskedKey;
  const Icon = provider.icon;

  return (
    <div className="glass-luxury rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{t(`externalApiKeys.${provider.label}`)}</h3>
            <div className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
              {active ? <CheckCircle size={10} /> : <XCircle size={10} />}
              {active ? t('externalApiKeys.statusActive') : t('externalApiKeys.statusInactive')}
            </div>
          </div>
        </div>
        <a href={provider.link} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
          {t('externalApiKeys.whereToGet')} <ExternalLink size={12} />
        </a>
      </div>

      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(provider.id, e.target.value)}
          placeholder={active ? masked || t('externalApiKeys.placeholder') : t('externalApiKeys.placeholder')}
          className="w-full px-4 py-2.5 pr-20 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
        />
        <button
          onClick={() => onToggleVisible(provider.id)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(provider.id)}
          disabled={saving || !value}
          className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {active ? t('externalApiKeys.save') : t('externalApiKeys.save')}
        </button>
        {active && (
          <button
            onClick={() => onDelete(provider.id)}
            disabled={saving}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium"
          >
            {t('externalApiKeys.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExternalApiKeysTab({ data }) {
  const { t } = useTranslation();
  const { showToast } = data || {};
  const [keys, setKeys] = useState({});
  const [inputs, setInputs] = useState({});
  const [visible, setVisible] = useState({});
  const [saving, setSaving] = useState({});

  const fetchKeys = useCallback(async () => {
    try {
      const res = await request('/admin/external-keys');
      const map = {};
      (res?.data || []).forEach(k => { map[k.provider] = k; });
      setKeys(map);
    } catch (err) {
      console.error('[ExternalApiKeysTab] fetch failed', err);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleSave = async (provider) => {
    const key = inputs[provider];
    if (!key || key.length < 10) {
      showToast?.(t('externalApiKeys.verifyError'), 'error');
      return;
    }
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      const res = await request(`/admin/external-keys/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
      if (res?.success) {
        showToast?.(t('externalApiKeys.verifySuccess', { provider }));
        setInputs(prev => ({ ...prev, [provider]: '' }));
        fetchKeys();
      } else {
        showToast?.(res?.error || t('externalApiKeys.verifyError'), 'error');
      }
    } catch (err) {
      showToast?.(err.message || t('externalApiKeys.verifyError'), 'error');
    }
    setSaving(prev => ({ ...prev, [provider]: false }));
  };

  const handleDelete = async (provider) => {
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      await request(`/admin/external-keys/${provider}`, { method: 'DELETE' });
      showToast?.(t('externalApiKeys.verifySuccess', { provider }));
      fetchKeys();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
    setSaving(prev => ({ ...prev, [provider]: false }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
          <KeyRound size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('externalApiKeys.title')}</h2>
          <p className="text-white/60 mt-1">{t('externalApiKeys.subtitle')}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
            <Shield size={14} />
            {t('externalApiKeys.encrypted')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            status={keys[p.id]}
            value={inputs[p.id] || ''}
            visible={visible[p.id]}
            saving={saving[p.id]}
            onChange={(id, val) => setInputs(prev => ({ ...prev, [id]: val }))}
            onToggleVisible={(id) => setVisible(prev => ({ ...prev, [id]: !prev[id] }))}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <div className="glass-luxury rounded-2xl p-4 text-sm text-white/70">
        <p>{t('externalApiKeys.encrypted')}</p>
      </div>
    </div>
  );
}
