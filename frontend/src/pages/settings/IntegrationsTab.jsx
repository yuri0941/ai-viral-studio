import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../../config.js';
import InstructionBlock from '../../components/common/InstructionBlock.jsx';

const PLATFORMS = [
  { id: 'vk', name: 'VKontakte', icon: 'VK', color: 'bg-blue-600', desc: 'Стена, группы' },
  { id: 'telegram', name: 'Telegram', icon: 'TG', color: 'bg-gradient-to-br from-blue-400 to-cyan-400', desc: 'Каналы, боты, уведомления' },
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600', desc: 'Посты, Reels' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: 'bg-black border border-white/20', desc: 'Видео' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'bg-blue-700', desc: 'Профиль, компания' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: 'bg-red-600', desc: 'Видео, Shorts' },
  { id: 'pinterest', name: 'Pinterest', icon: 'P', color: 'bg-red-700', desc: 'Пины, доски' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: 'bg-blue-800', desc: 'Страницы, группы' },
  { id: 'twitter', name: 'Twitter / X', icon: 'X', color: 'bg-black border border-white/20', desc: 'Посты, треды' },
  { id: 'discord', name: 'Discord', icon: 'D', color: 'bg-indigo-500', desc: 'Webhook' }
];

export default function IntegrationsTab() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'discord' | null
  const [toast, setToast] = useState('');
  const [vkStatus, setVkStatus] = useState({ configured: false, connected: false });
  const [tgStatus, setTgStatus] = useState({ configured: false, connected: false });
  const [vkCommunityKey, setVkCommunityKey] = useState('');
  const [vkGroupId, setVkGroupId] = useState('');
  const [vkSaving, setVkSaving] = useState(false);
  const [vkTesting, setVkTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/integrations/my`, { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json()),
      fetch(`${API_BASE_URL}/vk/status`, { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json()),
      fetch(`${API_BASE_URL}/telegram/status`, { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json()),
      fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json()).catch(() => ({})),
    ])
      .then(([data, vk, tg, me]) => {
        setIntegrations(Array.isArray(data) ? data : []);
        if (vk?.success) {
          setVkStatus({
            configured: vk.configured,
            connected: vk.connected,
            hasCommunityKey: vk.hasCommunityKey,
            groupId: vk.groupId,
            groupIdValid: vk.groupIdValid,
            maskedKey: vk.maskedKey,
            groupName: vk.groupName,
            accountName: vk.accountName,
            tested: vk?.groupName ? true : false,
          });
          setVkGroupId(vk.groupId || '');
        }
        // [v9.9.19.15.5] pre-fill from /users/me root-level fields so values survive F5
        const meUser = me?.user || me?.data;
        if (meUser?.vkGroupId) setVkGroupId(String(meUser.vkGroupId));
        if (meUser?.vkCommunityKey && !meUser.vkCommunityKey.includes('•')) {
          setVkCommunityKey(meUser.vkCommunityKey);
        }
        if (tg?.success) setTgStatus({ configured: tg.configured, connected: tg.connected, username: tg.username });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (msg) => setToast(msg);

  const isConnected = (provider) => {
    if (provider === 'vk') return vkStatus.connected;
    if (provider === 'telegram') return tgStatus.connected;
    return integrations.some(i => i.provider === provider);
  };
  const isConfigured = (provider) => {
    if (provider === 'vk') return vkStatus.configured;
    if (provider === 'telegram') return tgStatus.configured;
    return true;
  };

  const handleConnect = async (provider) => {
    if (provider === 'discord') { setModal('discord'); return; }
    if (provider === 'telegram') {
      try {
        const res = await fetch(`${API_BASE_URL}/telegram/connect-link`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data?.success && data.url) window.open(data.url, '_blank');
        else showToast(data.error || t('telegram.connectLinkFailed'));
      } catch (e) {
        showToast(t('telegram.connectLinkFailed'));
      }
      return;
    }
    if (provider === 'vk') {
      // [v9.9.19.15.4] VK community-token flow: no OAuth here; handled inline in the card.
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/integrations/${provider}/url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || t('socials.connectUnavailable', { provider }));
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      showToast(t('socials.connectError'));
    }
  };

  const saveVkCommunity = async () => {
    const normalizedGroupId = String(vkGroupId).trim().replace(/^-/, '');
    if (!/^\d+$/.test(normalizedGroupId)) {
      showToast(t('vk.invalidGroup'));
      return;
    }
    const key = vkCommunityKey.trim();
    if (!key && !vkStatus.hasCommunityKey) {
      showToast(t('vk.missingKey'));
      return;
    }
    if (key && key.length < 10) {
      showToast(t('vk.invalidToken'));
      return;
    }
    setVkSaving(true);
    try {
      const payload = { groupId: normalizedGroupId };
      if (key) payload.communityKey = key;
      const res = await fetch(`${API_BASE_URL}/vk/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) {
        showToast(t('vk.saved'));
        setVkCommunityKey('');
        setVkStatus(prev => ({
          ...prev,
          connected: true,
          hasCommunityKey: true,
          groupId: normalizedGroupId,
          groupIdValid: true,
          maskedKey: data.maskedKey || prev.maskedKey,
        }));
      } else {
        showToast(data.message || data.error || t('vk.saveError'));
      }
    } catch (e) {
      showToast(t('vk.saveError'));
    } finally {
      setVkSaving(false);
    }
  };

  const testVkCommunity = async () => {
    setVkTesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vk/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success) {
        showToast(t('vk.works', { name: data.groupName || data.groupId }));
        setVkStatus(prev => ({ ...prev, groupName: data.groupName || prev.groupName, connected: true, tested: true }));
      } else {
        const map = {
          invalid_token: t('vk.invalidToken'),
          group_not_found: t('vk.groupNotFound'),
          no_wall_permission: t('vk.noWallPermission'),
        };
        showToast(map[data.error] || data.message || t('vk.testError'));
      }
    } catch (e) {
      showToast(t('vk.testError'));
    } finally {
      setVkTesting(false);
    }
  };

  const disconnect = (provider) => {
    if (confirm(t('socials.disconnectConfirm', { provider }))) {
      const endpoint = provider === 'vk' ? '/vk' : `/integrations/${provider}`;
      fetch(`${API_BASE_URL}${endpoint}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }})
        .then(() => window.location.reload());
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
        showToast(data.error || t('socials.connectError'));
      }
    } catch (e) {
      showToast(t('socials.connectError'));
    }
  };

  const Modal = () => {
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');

    if (!modal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
          <>
            <h4 className="text-lg font-bold text-[var(--text)]">{t('discord.connectTitle')}</h4>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Webhook URL</label>
              <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-[var(--text)] hover:bg-white/5 transition">{t('common.cancel')}</button>
              <button onClick={() => connectDiscord(webhookUrl)} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 transition">{t('common.connect')}</button>
            </div>
          </>
        </div>
      </div>
    );
  };

  const renderVkCard = (p) => {
    const connected = vkStatus.connected;
    const hasKey = vkStatus.hasCommunityKey;
    const tested = vkStatus.tested;
    const statusLabel = connected
      ? (tested ? t('vk.statusWorking') : t('vk.statusSaved'))
      : (hasKey ? t('vk.statusSaved') : t('vk.statusDisconnected'));
    const statusClass = connected
      ? (tested ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400')
      : (hasKey ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400');

    return (
      <div key={p.id} className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center text-white font-bold text-sm`}>
            {p.icon}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>{statusLabel}</span>
        </div>
        <h4 className="text-white font-medium mb-1">{p.name}</h4>
        <p className="text-xs text-gray-500 mb-4">
          {connected
            ? t('vk.accountGroup', { name: vkStatus.groupName || vkStatus.groupId || '' })
            : t('vk.communityTokenHint')}
        </p>

        {connected ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 space-y-1">
              <p>{t('vk.communityKey')}: <span className="text-gray-300 font-mono">{vkStatus.maskedKey || '***'}</span></p>
              <p>{t('vk.groupId')}: <span className="text-gray-300 font-mono">{vkStatus.groupId}</span></p>
              {vkStatus.groupName && <p>{t('vk.groupName')}: <span className="text-gray-300">{vkStatus.groupName}</span></p>}
            </div>
            <button
              onClick={() => disconnect(p.id)}
              className="w-full py-2 rounded-xl text-sm font-medium transition-all bg-white/5 text-gray-300 hover:bg-white/10"
            >
              {t('socials.disconnect')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t('vk.communityKey')}</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={vkCommunityKey}
                  onChange={e => setVkCommunityKey(e.target.value)}
                  placeholder={hasKey ? t('vk.keySavedPlaceholder') || '•••• (сохранён)' : t('vk.communityKeyPlaceholder')}
                  className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] text-sm outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(prev => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {hasKey && !vkCommunityKey && (
                <p className="text-[10px] text-gray-500 mt-1">{t('vk.keySaved') || 'Ключ уже сохранён. Оставьте поле пустым, чтобы не менять.'}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t('vk.groupId')}</label>
              <input
                type="text"
                value={vkGroupId}
                onChange={e => setVkGroupId(e.target.value)}
                placeholder={t('vk.groupIdPlaceholder')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text)] text-sm outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <p className="text-[10px] text-gray-500 mt-1">{t('vk.groupIdHint')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveVkCommunity}
                disabled={vkSaving || !vkGroupId.trim() || (!vkCommunityKey.trim() && !hasKey)}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {vkSaving ? t('common.loading') : t('vk.save')}
              </button>
              <button
                onClick={testVkCommunity}
                disabled={vkTesting || !hasKey}
                className="flex-1 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {vkTesting ? t('common.loading') : t('vk.test')}
              </button>
            </div>
            <InstructionBlock
              titleKey="instruction.vk.title"
              stepKeys={[
                'instruction.vk.step1',
                'instruction.vk.step2',
                'instruction.vk.step3',
                'instruction.vk.step4',
                'instruction.vk.step5',
                'instruction.vk.step6',
              ]}
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[var(--text)]">{t('socials.title')}</h3>
        <p className="text-gray-400 text-sm">{t('socials.subtitle')}</p>
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-2 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
      <h3 className="text-xl font-bold text-[var(--text)]">{t('socials.title')}</h3>
      <p className="text-gray-400 text-sm">{t('socials.subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map(p => {
          if (p.id === 'vk') return renderVkCard(p);

          const connected = isConnected(p.id);
          const configured = isConfigured(p.id);
          const status = integrations.find(i => i.provider === p.id);
          const accountName = p.id === 'telegram' ? tgStatus.username : status?.accountName;
          return (
            <div key={p.id} className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {p.icon}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  connected ? 'bg-emerald-500/20 text-emerald-400'
                    : configured ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {connected ? t('socials.connected')
                    : (configured ? t('socials.notConnected') : t('socials.notConfigured'))}
                </span>
              </div>
              <h4 className="text-white font-medium mb-1">{p.name}</h4>
              <p className="text-xs text-gray-500 mb-4">
                {connected && accountName ? t('socials.account', { name: accountName }) : (configured ? p.desc : t('socials.configureHint'))}
              </p>
              <button
                onClick={() => connected ? disconnect(p.id) : handleConnect(p.id)}
                disabled={!configured && !connected}
                className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                  connected ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connected ? t('socials.disconnect')
                  : (configured ? t('socials.connect') : t('socials.notConfigured'))}
              </button>
            </div>
          );
        })}
      </div>
      <Modal />
    </div>
  );
}
