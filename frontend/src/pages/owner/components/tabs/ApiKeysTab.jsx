import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Check, Trash2, AlertCircle } from 'lucide-react';

const PROVIDERS = [
  { id: 'groq', name: 'Groq', note: '$14 credit' },
  { id: 'openrouter', name: 'OpenRouter', note: 'free tier' },
  { id: 'openai', name: 'OpenAI', note: 'gpt-4o-mini' },
  { id: 'deepseek', name: 'DeepSeek', note: 'deepseek-chat' },
  { id: 'cerebras', name: 'Cerebras', note: 'llama-3.3-70b' },
  { id: 'together', name: 'Together', note: 'Llama 3.3 70B' },
  { id: 'fireworks', name: 'Fireworks', note: 'llama-v3p3-70b' },
  { id: 'mistral', name: 'Mistral', note: 'mistral-large' },
  { id: 'cohere', name: 'Cohere', note: 'command-r-plus' },
  { id: 'cloudflare', name: 'Cloudflare AI', note: '10K/day' },
  { id: 'github', name: 'GitHub Models', note: 'beta-free' },
  { id: 'huggingface', name: 'HuggingFace', note: 'rate-limits' },
  { id: 'elevenlabs', name: 'ElevenLabs', note: 'Voice TTS' },
  { id: 'resend', name: 'Resend', note: 'Email 3K/day' },
  { id: 'yookassa', name: 'ЮKassa', note: 'Платежи' },
];

const API_BASE = '/api/owner/apikeys';

export function ApiKeysTab() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState({});
  const [saved, setSaved] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(API_BASE, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(d => {
        const map = {};
        d.forEach(k => { map[k.provider] = true; });
        setSaved(map);
      })
      .catch(() => {});
  }, []);

  const saveKey = async (provider) => {
    const val = keys[provider];
    if (!val) return;
    setError('');
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ provider, keyValue: val })
    });
    if (res.ok) {
      setSaved(prev => ({ ...prev, [provider]: true }));
      setKeys(prev => ({ ...prev, [provider]: '' }));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Ошибка сохранения');
    }
  };

  const removeKey = async (provider) => {
    await fetch(`${API_BASE}/${provider}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    setSaved(prev => { const n = { ...prev }; delete n[provider]; return n; });
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Key className="w-6 h-6 text-purple-500" /> {t('apiKeys.title') || 'API Keys'}</h2>
      <p className="text-sm text-[var(--text-muted)]">Вставьте ключи — OMEGA сразу начнёт их использовать. Без перезапуска сервера.</p>
      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="grid gap-4">
        {PROVIDERS.map(p => (
          <div key={p.id} className="glass-luxury rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">{p.name} {saved[p.id] && <Check className="w-4 h-4 text-green-400" />}</div>
              <div className="text-xs text-[var(--text-muted)]">{p.note}</div>
            </div>
            <input
              type="password"
              value={keys[p.id] || ''}
              onChange={e => setKeys(prev => ({ ...prev, [p.id]: e.target.value }))}
              placeholder={saved[p.id] ? '•••••••• (активен)' : 'Вставьте ключ...'}
              className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm"
            />
            <button onClick={() => saveKey(p.id)} disabled={!keys[p.id]} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm disabled:opacity-50">Сохранить</button>
            {saved[p.id] && <button onClick={() => removeKey(p.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
          </div>
        ))}
      </div>
      <div className="glass-luxury rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
        <div className="text-sm text-[var(--text-muted)]">
          <p>Ключи хранятся в базе MongoDB. OMEGA проверяет сначала env (Render), потом базу (кабинет).</p>
          <p>Если ключ не работает — OMEGA автоматически переключается на следующий провайдер.</p>
        </div>
      </div>
    </div>
  );
}

export default ApiKeysTab;
