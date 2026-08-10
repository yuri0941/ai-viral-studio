import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { request } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TelegramConnectButton() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState({ loading: true, connected: false });

  useEffect(() => {
    request('/user/telegram-status')
      .then(data => setStatus({ loading: false, connected: data.connected, botLink: data.botLink, telegramUsername: data.telegramUsername }))
      .catch(() => setStatus({ loading: false, connected: false }));
  }, []);

  if (status.loading) return <span className="text-xs text-[var(--text-muted)]">{t('common.loading')}</span>;

  // [v9.9.19-MASTER-AUDIT] deep-link привязки: бот получает /start <user_id> и связывает telegramId с аккаунтом
  const userId = user?._id || user?.id || '';
  const link = status.botLink || `https://t.me/aiviral_omega_bot${userId ? `?start=${userId}` : ''}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        status.connected
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-sky-500 hover:bg-sky-600 text-white'
      }`}
    >
      <MessageCircle className="w-4 h-4" />
      {status.connected
        ? `✅ Telegram ${t('common.connected')}${status.telegramUsername ? ` — @${status.telegramUsername}` : ''}`
        : t('telegram.writeInTelegram')}
    </a>
  );
}
