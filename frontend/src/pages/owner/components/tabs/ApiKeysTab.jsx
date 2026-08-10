import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Check, Trash2, Zap, Globe, Sparkles, Brain, Cpu, Flame, Cloud, MessageSquare, Mic, Youtube, Search, Bot, Image, Server, RefreshCw, X, Eye, EyeOff } from 'lucide-react';
import { request } from '../../../../services/api.js';

function VKIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.562c0 .424-.136.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.492 4 8.076c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.779.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.644v3.472c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.644-.22 1.017-2.354 3.988-2.354 3.988-.186.322-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.745-.576.745z"/>
    </svg>
  );
}

const PROVIDERS = [
  { id: 'groq', name: 'Groq AI', desc: 'Быстрый LLM inference', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'openrouter', name: 'OpenRouter', desc: 'Доступ к 100+ моделям', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4, Whisper, DALL-E', icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'gemini', name: 'Google Gemini', desc: 'Google AI', icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'elevenlabs', name: 'ElevenLabs', desc: 'Голосовой AI / TTS', icon: Mic, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'replicate', name: 'Replicate', desc: 'AI Video / Images', icon: Image, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { id: 'serpapi', name: 'SerpAPI', desc: 'Поиск Google / Maps', icon: Search, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { id: 'youtube', name: 'YouTube Data API', desc: 'Аналитика YouTube', icon: Youtube, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'cloudflare', name: 'Cloudflare AI', desc: 'Workers AI', icon: Cloud, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { id: 'fireworks', name: 'Fireworks AI', desc: 'Fast inference', icon: Flame, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'mistral', name: 'Mistral AI', desc: 'Европейские LLM', icon: Cpu, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { id: 'cohere', name: 'Cohere', desc: 'Embed / Generate', icon: MessageSquare, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Китайские LLM', icon: Brain, color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'github', name: 'GitHub Models', desc: 'GitHub AI', icon: Bot, color: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  { id: 'huggingface', name: 'HuggingFace', desc: 'Open models', icon: Server, color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'pollinations', name: 'Pollinations', desc: 'Free AI images', icon: Image, color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'vk', name: 'VK Client ID', desc: 'ID приложения VK (например: 54714375)', placeholder: '54714375', icon: VKIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'vk_secret', name: 'VK Client Secret', desc: 'Защищённый ключ из приложения VK', placeholder: 'Вставьте защищённый ключ', icon: VKIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
];

export default function ApiKeysTab() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await request('/api-keys');
      const map = {};
      (data.keys || []).forEach(k => { map[k.provider] = k.isValid ? 'valid' : 'saved'; });
      setSaved(map);
    } catch (e) {
      console.error('[ApiKeysTab] load failed:', e.message);
    }
  };

  const openModal = (provider) => { setActiveProvider(provider); setInputValue(''); setShowKey(false); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setActiveProvider(null); setInputValue(''); setShowKey(false); };

  const testKey = async () => {
    if (!inputValue || !activeProvider) return;
    setLoading(prev => ({ ...prev, [activeProvider.id]: 'test' }));
    try {
      const data = await request('/api-keys/test', {
        method: 'POST',
        body: JSON.stringify({ provider: activeProvider.id, key: inputValue })
      });
      alert(data.valid ? '✅ Ключ работает' : `❌ Ошибка: ${data.error || 'unknown'}`);
    } catch (e) {
      alert('❌ Проверка не удалась: ' + e.message);
    } finally {
      setLoading(prev => ({ ...prev, [activeProvider.id]: false }));
    }
  };

  const saveKey = async () => {
    if (!inputValue || !activeProvider) return;
    setLoading(prev => ({ ...prev, [activeProvider.id]: 'save' }));
    try {
      const data = await request('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ provider: activeProvider.id, key: inputValue })
      });
      setSaved(prev => ({ ...prev, [activeProvider.id]: data.isValid ? 'valid' : 'saved' }));
      alert(data.message);
      closeModal();
    } catch (e) {
      alert('❌ Сохранение не удалось: ' + e.message);
    } finally {
      setLoading(prev => ({ ...prev, [activeProvider.id]: false }));
    }
  };

  const removeKey = async (providerId) => {
    try {
      await request(`/api-keys/${providerId}`, { method: 'DELETE' });
      setSaved(prev => { const n = { ...prev }; delete n[providerId]; return n; });
    } catch (e) {
      alert('❌ Удаление не удалось: ' + e.message);
    }
  };

  const getStatus = (id) => {
    const state = saved[id];
    if (state === 'valid') return { label: '✅ Работает', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', active: true };
    if (state === 'saved') return { label: '⚠️ Не проверен', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400', active: true };
    return { label: 'Не подключен', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20', dot: 'bg-gray-500', active: false };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Key className="w-6 h-6 text-purple-500" /> {t('apiKeys.title') || 'API Keys'}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Вставьте ключ и нажмите «Сохранить и применить» — OMEGA сразу начнёт его использовать без перезапуска сервера.</p>
        </div>
        <button onClick={loadKeys} className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Обновить
        </button>
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
              <p className="text-xs text-[var(--text-muted)] mb-5 relative z-10">{p.desc}</p>
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
                  <button onClick={() => openModal(p)} className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" /> Подключить
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
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={activeProvider.placeholder || (activeProvider.id === 'youtube' ? 'AIzaSy...' : activeProvider.id === 'gemini' ? 'AIza...' : 'sk-... или gsk-...')}
                className="w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-3 pr-10 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
              />
              <button onClick={() => setShowKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-white transition-colors">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={testKey} disabled={!inputValue || loading[activeProvider.id]} className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading[activeProvider.id] === 'test' ? 'animate-spin' : ''}`} /> Проверить
              </button>
              <button onClick={saveKey} disabled={!inputValue || loading[activeProvider.id]} className="flex-[2] px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {loading[activeProvider.id] === 'save' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Сохранить и применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
