import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config.js';

const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: '✈️', desc: 'Бот + канал/группа' },
  { id: 'vk', name: 'VK', icon: '🔵', desc: 'Стена, группы' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', desc: 'Профиль, компания' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', desc: 'Пины, доски' },
  { id: 'instagram', name: 'Instagram', icon: '📷', desc: 'Посты, Reels (через Facebook)' },
  { id: 'facebook', name: 'Facebook', icon: '📘', desc: 'Страницы, группы' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', desc: 'Видео' },
  { id: 'youtube', name: 'YouTube', icon: '🔴', desc: 'Видео, Shorts' },
  { id: 'discord', name: 'Discord', icon: '💬', desc: 'Webhook' }
];

export default function IntegrationsTab() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'telegram' | 'discord' | null
  const [toast, setToast] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${API_BASE_URL}/integrations/my`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json())
      .then(data => { setIntegrations(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg) => setToast(msg);

  const isConnected = (provider) => integrations.some(i => i.provider === provider);

  const handleConnect = async (provider) => {
    if (provider === 'telegram') { setModal('telegram'); return; }
    if (provider === 'discord') { setModal('discord'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/integrations/${provider}/url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || `Подключение ${provider} временно недоступно`);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      showToast('Ошибка подключения');
    }
  };

  const connectTelegram = async (botToken, chatId) => {
    if (!botToken || !chatId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/telegram/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ botToken, chatId })
      });
      const data = await res.json();
      if (data.success || data.accountName) {
        window.location.reload();
      } else {
        showToast(data.error || 'Ошибка подключения Telegram');
      }
    } catch (e) {
      showToast('Не удалось подключить Telegram');
    }
  };

  const connectDiscord = async (webhookUrl) => {
    if (!webhookUrl) return;
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/discord/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ webhookUrl })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        showToast(data.error || 'Ошибка подключения Discord');
      }
    } catch (e) {
      showToast('Не удалось подключить Discord');
    }
  };

  const disconnect = (provider) => {
    if (confirm('Отключить?')) {
      fetch(`${API_BASE_URL}/integrations/${provider}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }})
        .then(() => window.location.reload());
    }
  };

  const Modal = () => {
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');

    if (!modal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
          {modal === 'telegram' ? (
            <>
              <h4 className="text-lg font-bold text-[var(--text)]">Подключить Telegram</h4>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bot Token от @BotFather</label>
                <input type="text" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="123456:ABC..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Chat ID от @userinfobot</label>
                <input type="text" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="123456789" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-[var(--text)] hover:bg-white/5 transition">Отмена</button>
                <button onClick={() => connectTelegram(botToken, chatId)} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 transition">Подключить</button>
              </div>
            </>
          ) : (
            <>
              <h4 className="text-lg font-bold text-[var(--text)]">Подключить Discord</h4>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Webhook URL</label>
                <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-[var(--text)] hover:bg-white/5 transition">Отмена</button>
                <button onClick={() => connectDiscord(webhookUrl)} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 transition">Подключить</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-2 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
      <h3 className="text-xl font-bold text-[var(--text)]">🔗 Мои соцсети</h3>
      <p className="text-gray-400 text-sm">Подключите аккаунты для автопостинга</p>

      {/* [v6.0] added: glass social platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map(p => {
          const connected = isConnected(p.id);
          return (
            <div key={p.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.08] transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                  {p.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-[var(--text)]">{p.name}</h4>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-gray-500'}`} />
                  </div>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                  {connected && (
                    <span className="text-xs text-emerald-400 mt-1 block">
                      Подключено: {integrations.find(i => i.provider === p.id)?.accountName || '—'}
                    </span>
                  )}
                </div>
              </div>
              {connected ? (
                <button onClick={() => disconnect(p.id)} className="px-3 py-1.5 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition">Отключить</button>
              ) : (
                <button onClick={() => handleConnect(p.id)} className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-sm hover:bg-violet-500/30 transition">Подключить</button>
              )}
            </div>
          );
        })}
      </div>
      <Modal />
    </div>
  );
}

// [FIX-2026-08-05] added: universal OAuth flow, Telegram + Discord modals
