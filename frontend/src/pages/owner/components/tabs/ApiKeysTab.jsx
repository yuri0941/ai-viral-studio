import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Check, Trash2, Zap, Globe, Sparkles, Brain, Cpu, Flame, Cloud, MessageSquare, Mic, Mail, CreditCard, X, Github, Smile } from 'lucide-react';

const PROVIDERS = [
  { id: 'groq', name: 'Groq', note: 'Llama 3.3 70B • $14 credit', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'openrouter', name: 'OpenRouter', note: 'Free tier • Meta-Llama', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'openai', name: 'OpenAI', note: 'GPT-4o mini • $0.15/1M', icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'deepseek', name: 'DeepSeek', note: 'deepseek-chat • credits', icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'cerebras', name: 'Cerebras', note: 'Llama 3.3 70B • credits', icon: Cpu, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'together', name: 'Together', note: 'Llama 3.3 70B • credits', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'fireworks', name: 'Fireworks', note: 'Llama v3p3 70B • credits', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'mistral', name: 'Mistral', note: 'mistral-large • paid', icon: Cloud, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { id: 'cohere', name: 'Cohere', note: 'command-r-plus • paid', icon: MessageSquare, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { id: 'cloudflare', name: 'Cloudflare AI', note: '10K/day • free', icon: Cloud, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { id: 'github', name: 'GitHub Models', note: 'Beta • free', icon: Github, color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  { id: 'huggingface', name: 'HuggingFace', note: 'Rate limits • free', icon: Smile, color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'elevenlabs', name: 'ElevenLabs', note: 'Voice TTS • paid', icon: Mic, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'resend', name: 'Resend', note: 'Email 3K/day • free', icon: Mail, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { id: 'yookassa', name: 'ЮKassa', note: 'Платежи • РФ', icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
];

export default function ApiKeysTab() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState({});
  const [envKeys, setEnvKeys] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    fetch('https://aiviral-backend.onrender.com/api/owner/apikeys', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(d => {
        const map = {}; const env = {};
        d.forEach(k => { map[k.provider] = true; if (k.source === 'env') env[k.provider] = true; });
        setSaved(map); setEnvKeys(env);
      }).catch(() => {});
  }, []);

  const openModal = (provider) => { setActiveProvider(provider); setInputValue(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setActiveProvider(null); setInputValue(''); };

  const saveKey = async () => {
    if (!inputValue || !activeProvider) return;
    const res = await fetch('https://aiviral-backend.onrender.com/api/owner/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ provider: activeProvider.id, keyValue: inputValue })
    });
    if (res.ok) { setSaved(prev => ({ ...prev, [activeProvider.id]: true })); closeModal(); }
  };

  const removeKey = async (providerId) => {
    await fetch(`https://aiviral-backend.onrender.com/api/owner/apikeys/${providerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    setSaved(prev => { const n = { ...prev }; delete n[providerId]; return n; });
  };

  const getStatus = (id) => {
    if (saved[id]) {
      if (envKeys[id]) return { label: 'ENV • Активен', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', active: true };
      return { label: 'Активен', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', active: true };
    }
    return { label: 'Не подключен', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20', dot: 'bg-gray-500', active: false };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Key className="w-6 h-6 text-purple-500" /> {t('apiKeys.title') || 'API Keys'}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Вставьте ключи — OMEGA сразу начнёт их использовать. Без перезапуска сервера.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROVIDERS.map(p => {
          const status = getStatus(p.id);
          const Icon = p.icon;
          return (
            <div key={p.id} className="glass-luxury rounded-xl p-5 border border-[var(--border)] hover:border-purple-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className={`w-20 h-20 ${p.color}`} />
              </div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`w-11 h-11 rounded-xl ${p.bg} ${p.border} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.cls} flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.active ? 'animate-pulse' : ''}`} />
                  {status.label}
                </div>
              </div>
              <h3 className="font-semibold text-base mb-0.5 relative z-10">{p.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mb-5 relative z-10">{p.note}</p>
              <div className="flex items-center gap-2 relative z-10">
                {status.active ? (
                  <>
                    <button onClick={() => openModal(p)} className="flex-1 px-3 py-2 rounded-lg bg-purple-600/15 text-purple-400 text-sm font-medium hover:bg-purple-600/25 border border-purple-500/20 transition-colors flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> Обновить
                    </button>
                    <button onClick={() => removeKey(p.id)} className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => openModal(p)} className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shadow-lg shadow-purple-600/20">
                    Подключить
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && activeProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="glass-luxury rounded-xl p-6 w-full max-w-md border border-[var(--border)] space-y-4 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><activeProvider.icon className={`w-5 h-5 ${activeProvider.color}`} /> Подключить {activeProvider.name}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Вставьте API-ключ для {activeProvider.name}. OMEGA сразу начнёт его использовать.</p>
            <input
              type="password"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={activeProvider.id === 'yookassa' ? 'shopId:secretKey' : 'sk-... или gsk-...'}
              className="w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
            />
            <div className="flex gap-3">
              <button onClick={saveKey} disabled={!inputValue} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors">Сохранить</button>
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm hover:bg-[var(--bg-hover)] transition-colors">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
