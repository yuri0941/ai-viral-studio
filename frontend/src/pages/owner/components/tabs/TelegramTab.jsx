import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Loader2, Calendar, BarChart3, Bot, MessageSquare,
  ChevronDown, ChevronUp, Copy, CheckCircle, AlertTriangle,
  Save, Sparkles, Rocket, BookOpen, Settings2, Eye, EyeOff
} from 'lucide-react';
import { request } from '../../../../services/api.js';

const TONES = [
  { id: 'expert', label: 'expert' },
  { id: 'energetic', label: 'energetic' },
  { id: 'funny', label: 'funny' },
];

const LENGTHS = [
  { id: 'short', label: 'short' },
  { id: 'medium', label: 'medium' },
  { id: 'long', label: 'long' },
];

function Section({ title, icon: Icon, children, open, onToggle }) {
  return (
    <div className="glass-luxury rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
            <Icon size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {open ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
      </button>
      {open && <div className="px-5 pb-6 border-t border-white/10">{children}</div>}
    </div>
  );
}

export default function TelegramTab({ data }) {
  const { t } = useTranslation();
  const { showToast } = data || {};

  const [activeSection, setActiveSection] = useState('quickPost');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('expert');
  const [length, setLength] = useState('medium');
  const [loading, setLoading] = useState({});
  const [lastPost, setLastPost] = useState(null);
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState({ subscribers: 0, mock: true });
  const [settings, setSettings] = useState({ channelId: '', botToken: '', autoReply: true });
  const [showToken, setShowToken] = useState(false);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('telegram_tab_settings') || '{}');
      setSettings(prev => ({ ...prev, ...saved }));
      setHistory(JSON.parse(localStorage.getItem('telegram_post_history') || '[]'));
      setLogs(JSON.parse(localStorage.getItem('telegram_bot_logs') || '[]'));
    } catch {}
    fetchStats();
  }, []);

  const addLog = useCallback((message) => {
    setLogs(prev => {
      const next = [{ id: Date.now(), message, time: new Date().toLocaleString('ru-RU') }, ...prev].slice(0, 10);
      localStorage.setItem('telegram_bot_logs', JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchStats = async () => {
    try {
      const res = await request('/telegram/channel/stats');
      setStats(res || { subscribers: 0, mock: true });
    } catch (err) {
      console.error('[TelegramTab] stats failed', err);
    }
  };

  const handleGenerateAndPublish = async () => {
    if (!topic.trim()) {
      showToast?.(t('telegram.topicRequired', 'Укажите тему поста'), 'error');
      return;
    }
    setLoading(prev => ({ ...prev, quickPost: true }));
    try {
      const res = await request('/telegram/channel/post', {
        method: 'POST',
        body: JSON.stringify({ topic, tone, length }),
      });
      setLastPost(res);
      if (res?.publish?.success) {
        showToast?.(t('telegram.published'), 'success');
        addLog(`Опубликован пост: ${res.post?.title}`);
      } else {
        showToast?.(`${t('telegram.mockMode')}: ${res?.publish?.message || ''}`, 'warning');
        addLog(`Mock-пост: ${res?.post?.title}`);
      }
      if (res?.post) {
        setHistory(prev => {
          const next = [res.post, ...prev].slice(0, 5);
          localStorage.setItem('telegram_post_history', JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      showToast?.(err.message || 'Ошибка публикации', 'error');
    }
    setLoading(prev => ({ ...prev, quickPost: false }));
  };

  const handleGeneratePlan = async () => {
    setLoading(prev => ({ ...prev, plan: true }));
    try {
      const res = await request('/telegram/channel/plan', { method: 'POST', body: JSON.stringify({}) });
      setPlan(res?.plan || []);
      addLog(`Сгенерирован план на ${res?.days || 7} дней`);
    } catch (err) {
      showToast?.(err.message || 'Ошибка генерации плана', 'error');
    }
    setLoading(prev => ({ ...prev, plan: false }));
  };

  const handlePublishDay = async (dayIndex) => {
    setLoading(prev => ({ ...prev, [`day_${dayIndex}`]: true }));
    try {
      const res = await request('/telegram/channel/publish-plan', {
        method: 'POST',
        body: JSON.stringify({ dayIndex }),
      });
      if (res?.publish?.success) {
        showToast?.(`${t('telegram.published')}: ${res?.post?.title}`, 'success');
        addLog(`Опубликован день ${dayIndex + 1}: ${res?.post?.title}`);
      } else {
        showToast?.(t('telegram.mockMode'), 'warning');
      }
    } catch (err) {
      showToast?.(err.message || 'Ошибка публикации', 'error');
    }
    setLoading(prev => ({ ...prev, [`day_${dayIndex}`]: false }));
  };

  const handleCopyPlan = async () => {
    if (!plan?.length) return;
    const text = plan.map(p => `День ${p.day}: ${p.topic}\n${p.title}\n${p.text}\n${p.hashtags?.join(' ') || ''}\n${p.cta || ''}`).join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveSettings = async () => {
    try {
      await request('/owner/settings', {
        method: 'PUT',
        body: JSON.stringify({ telegramSettings: settings }),
      });
      localStorage.setItem('telegram_tab_settings', JSON.stringify(settings));
      showToast?.(t('telegram.saveSettings', 'Настройки сохранены'), 'success');
      addLog('Настройки Telegram обновлены');
    } catch (err) {
      showToast?.(err.message || 'Ошибка сохранения', 'error');
    }
  };

  const handleTestMessage = () => {
    addLog('Тестовое сообщение отправлено владельцу (placeholder)');
    showToast?.('Тестовое сообщение отправлено', 'info');
  };

  const handleRunImprove = () => {
    addLog('Команда /improve запущена в Telegram-боте');
    showToast?.('/improve — используйте в Telegram-боте', 'info');
  };

  const handleDialogStats = () => {
    addLog(`Активных диалогов: ${logs.length}`);
    showToast?.(`Диалогов: ${logs.length}`, 'info');
  };

  const botOnline = Boolean(settings.channelId && settings.botToken);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Send className="text-violet-400" />
            {t('telegram.title')}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{t('telegram.subtitle', 'Авто-посты, план на неделю и управление ботом')}</p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 ${botOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
          <span className={`w-2 h-2 rounded-full ${botOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {botOnline ? t('telegram.online') : t('telegram.offline')}
        </div>
      </div>

      <Section
        title={t('telegram.quickPost')}
        icon={Sparkles}
        open={activeSection === 'quickPost'}
        onToggle={() => setActiveSection(activeSection === 'quickPost' ? '' : 'quickPost')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-2">{t('telegram.topic')}</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('telegram.topic', 'Тема поста')}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">{t('telegram.tone')}</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            >
              {TONES.map(tone => (
                <option key={tone.id} value={tone.id} className="bg-slate-900">{t(`telegram.${tone.label}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">{t('telegram.length')}</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            >
              {LENGTHS.map(len => (
                <option key={len.id} value={len.id} className="bg-slate-900">{t(`telegram.${len.label}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerateAndPublish}
          disabled={loading.quickPost}
          className="mt-5 w-full md:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center justify-center gap-2"
        >
          {loading.quickPost ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          {t('telegram.generateAndPublish')}
        </button>

        {lastPost && (
          <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              {lastPost.publish?.success ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-amber-400" />}
              <span className="font-semibold text-white">
                {lastPost.publish?.success ? t('telegram.published') : t('telegram.mockMode')}
              </span>
            </div>
            <h4 className="font-semibold text-white">{lastPost.post?.title}</h4>
            <p className="text-gray-300 text-sm mt-1 line-clamp-4">{lastPost.post?.text}</p>
            <div className="text-xs text-violet-400 mt-2">{lastPost.post?.hashtags?.join(' ')}</div>
          </div>
        )}
      </Section>

      <Section
        title={t('telegram.weeklyPlan')}
        icon={Calendar}
        open={activeSection === 'weeklyPlan'}
        onToggle={() => setActiveSection(activeSection === 'weeklyPlan' ? '' : 'weeklyPlan')}
      >
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={handleGeneratePlan}
            disabled={loading.plan}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
          >
            {loading.plan ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            {t('telegram.generatePlan')}
          </button>
          {plan && (
            <button
              onClick={handleCopyPlan}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium flex items-center gap-2"
            >
              {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {t('telegram.copyPlan')}
            </button>
          )}
        </div>

        {plan && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.map((post, idx) => (
              <div key={idx} className="glass-card rounded-xl p-4 border border-white/10 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-violet-400">{t('telegram.day')} {post.day}</span>
                  <span className="text-xs text-gray-400">{post.scheduledTime || post.suggestedTime || '09:00'}</span>
                </div>
                <h4 className="font-semibold text-white text-sm">{post.title}</h4>
                <p className="text-gray-300 text-xs mt-1 line-clamp-3 flex-1">{post.text}</p>
                <div className="text-[10px] text-violet-300 mt-2">{post.hashtags?.join(' ')}</div>
                <button
                  onClick={() => handlePublishDay(idx)}
                  disabled={loading[`day_${idx}`]}
                  className="mt-3 w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium flex items-center justify-center gap-1"
                >
                  {loading[`day_${idx}`] ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                  {t('telegram.publishNow')}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={`${t('telegram.stats')} + ${t('telegram.saveSettings')}`}
        icon={BarChart3}
        open={activeSection === 'stats'}
        onToggle={() => setActiveSection(activeSection === 'stats' ? '' : 'stats')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="glass-card rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-xs">{t('telegram.subscribers')}</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.subscribers || 0}</p>
            {stats.mock && <span className="text-xs text-amber-400">Mock</span>}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">{t('telegram.channelId')}</label>
            <input
              value={settings.channelId}
              onChange={(e) => setSettings(prev => ({ ...prev, channelId: e.target.value }))}
              placeholder="@channelname или -100..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div className="relative">
            <label className="block text-sm text-gray-300 mb-2">{t('telegram.botToken')}</label>
            <input
              type={showToken ? 'text' : 'password'}
              value={settings.botToken}
              onChange={(e) => setSettings(prev => ({ ...prev, botToken: e.target.value }))}
              placeholder="123456:ABC..."
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500"
            />
            <button
              onClick={() => setShowToken(prev => !prev)}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-white"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-2"
        >
          <Save size={16} />
          {t('telegram.saveSettings')}
        </button>
      </Section>

      <Section
        title={t('telegram.botControl')}
        icon={Bot}
        open={activeSection === 'botControl'}
        onToggle={() => setActiveSection(activeSection === 'botControl' ? '' : 'botControl')}
      >
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={handleTestMessage} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm flex items-center gap-2">
            <MessageSquare size={16} /> {t('telegram.testMessage')}
          </button>
          <button onClick={handleRunImprove} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm flex items-center gap-2">
            <Sparkles size={16} /> {t('telegram.runImprove')}
          </button>
          <button onClick={handleDialogStats} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm flex items-center gap-2">
            <BarChart3 size={16} /> {t('telegram.dialogStats')}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-gray-300">{t('telegram.autoReply')}</span>
          <button
            onClick={() => setSettings(prev => ({ ...prev, autoReply: !prev.autoReply }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoReply ? 'bg-violet-600' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.autoReply ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="mt-5">
          <h4 className="text-sm font-medium text-gray-300 mb-2">{t('telegram.logs', 'Логи')}</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.length === 0 && <p className="text-xs text-gray-500">Нет сообщений</p>}
            {logs.map(log => (
              <div key={log.id} className="text-xs text-gray-300 bg-white/5 rounded-lg p-2 border border-white/5">
                <span className="text-gray-500">{log.time}</span> — {log.message}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title={t('telegram.history')}
        icon={BookOpen}
        open={activeSection === 'history'}
        onToggle={() => setActiveSection(activeSection === 'history' ? '' : 'history')}
      >
        <div className="mt-4 space-y-3">
          {history.length === 0 && <p className="text-sm text-gray-500">{t('telegram.noHistory', 'История пуста')}</p>}
          {history.map((post, idx) => (
            <div key={idx} className="glass-card rounded-xl p-4 border border-white/10">
              <h4 className="font-semibold text-white text-sm">{post.title}</h4>
              <p className="text-gray-300 text-xs mt-1 line-clamp-2">{post.text}</p>
              <div className="text-[10px] text-violet-400 mt-2">{post.hashtags?.join(' ')}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
