import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../services/api.js';

export default function VKConnectButton() {
  const { t } = useTranslation();
  const [status, setStatus] = useState({ loading: true, connected: false });

  useEffect(() => {
    request('/api/vk/status')
      .then(data => setStatus({ loading: false, connected: data.connected, userId: data.userId }))
      .catch(() => setStatus({ loading: false, connected: false }));
  }, []);

  const connect = async () => {
    try {
      const data = await request('/api/vk/auth-url');
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (e) {
      console.error('VK auth error', e);
    }
  };

  if (status.loading) return <span className="text-xs text-[var(--text-muted)]">{t('common.loading')}</span>;

  return (
    <button
      onClick={connect}
      disabled={status.connected}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        status.connected
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {status.connected ? `✅ VK ${t('common.connected')}` : `🔗 ${t('settings.connectVK') || 'Connect VK'}`}
    </button>
  );
}
