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
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${API_BASE_URL}/integrations/my`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json())
      .then(data => { setIntegrations(data); setLoading(false); });
  }, []);

  const isConnected = (provider) => integrations.some(i => i.provider === provider);

  const connect = (provider) => {
    if (provider === 'telegram') {
      const botToken = prompt('Введите Bot Token от @BotFather:');
      const chatId = prompt('Введите Chat ID (напишите @userinfobot):');
      if (botToken && chatId) {
        fetch(`${API_BASE_URL}/integrations/telegram/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ botToken, chatId })
        }).then(() => window.location.reload());
      }
    } else {
      window.location.href = `${API_BASE_URL}/integrations/${provider}/auth`;
    }
  };

  const disconnect = (provider) => {
    if (confirm('Отключить?')) {
      fetch(`${API_BASE_URL}/integrations/${provider}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }})
        .then(() => window.location.reload());
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">🔗 Мои соцсети</h3>
      <p className="text-gray-400 text-sm">Подключите аккаунты для автопостинга</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map(p => {
          const connected = isConnected(p.id);
          return (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between hover:border-[var(--primary)] transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                  {connected && (
                    <span className="text-xs text-green-400 mt-1 block">
                      ✅ {integrations.find(i => i.provider === p.id)?.accountName || 'Подключено'}
                    </span>
                  )}
                </div>
              </div>
              {connected ? (
                <button onClick={() => disconnect(p.id)} className="text-red-400 text-sm hover:text-red-300">Отключить</button>
              ) : (
                <button onClick={() => connect(p.id)} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90">Подключить</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// [SOCIAL-v5.1] added
