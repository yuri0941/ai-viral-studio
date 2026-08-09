import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, ToggleLeft, ToggleRight, Loader2, Briefcase, TrendingUp, Lightbulb, Database, FileText, BarChart3, ArrowRight, Bell, Calendar } from 'lucide-react';
import { request } from '../../../../services/api.js';

const TASK_ICONS = {
  'Metrics analysis': BarChart3,
  'Skill acquisition': Lightbulb,
  'Idea generation': Database,
  'Backup & optimize': Database,
  'Content prep': FileText,
  'Predictions': TrendingUp,
};

const DEFAULT_REPORT_TASKS = [
  { time: '00:00', task: 'Metrics analysis', result: 'Analyzed 12 metrics' },
  { time: '01:00', task: 'Skill acquisition', result: 'Learned 2 new skills' },
  { time: '02:00', task: 'Idea generation', result: 'Generated 3 ideas' },
  { time: '03:00', task: 'Backup & optimize', result: 'Database optimized, backups verified' },
  { time: '04:00', task: 'Content prep', result: 'Prepared 7 posts' },
  { time: '05:00', task: 'Predictions', result: 'Generated 3 predictions' },
];

const WEEKLY_IDEAS = [
  'AI-генератор обложек для подкастов',
  'Автоматический перевод вирусных видео на 5 языков',
  'OMEGA-ассистент для рекламных кабинетов',
  'Генератор UGC-сценариев с реальными актёрами',
  'Динамическое ценообразование для агентств',
  'AI-аудит конкурентов в Telegram-каналах',
  'Автопостинг с A/B тестами в один клик',
];

const PREDICTIONS = [
  { day: 'Пн', topic: 'AI Tools', trend: 'рост' },
  { day: 'Вт', topic: 'Social Media', trend: 'рост' },
  { day: 'Ср', topic: 'SaaS Pricing', trend: 'стабильно' },
  { day: 'Чт', topic: 'AI Video', trend: 'рост' },
  { day: 'Пт', topic: 'UGC', trend: 'рост' },
  { day: 'Сб', topic: 'Shorts/Reels', trend: 'стабильно' },
  { day: 'Вс', topic: 'Automation', trend: 'рост' },
];

export default function DreamModeTab({ data }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = data || {};

  const [nightShiftEnabled, setNightShiftEnabled] = useState(false);
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(false);
  const [lastReport, setLastReport] = useState({ tasks: DEFAULT_REPORT_TASKS, timestamp: null });
  const [briefing, setBriefing] = useState(null);
  const [dreamStatus, setDreamStatus] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  useEffect(() => {
    request('/omega-supreme/dream/status')
      .then(d => {
        setDreamStatus(d);
        if (d.lastBriefing) {
          setBriefing({ summary: d.lastBriefing.summary, date: d.lastBriefing.date });
        }
      })
      .catch(() => {});
  }, []);

  const runNightShift = useCallback(async () => {
    setLoadingReport(true);
    try {
      const res = await request('/omega-supreme/dream/night-shift', { method: 'POST' });
      setLastReport(res?.report || { tasks: DEFAULT_REPORT_TASKS, timestamp: new Date() });
      showToast?.(t('dream.nightShiftComplete'), 'success');
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoadingReport(false);
    }
  }, [showToast, t]);

  const fetchBriefing = useCallback(async () => {
    setLoadingBriefing(true);
    try {
      const res = await request('/omega-supreme/dream/morning-briefing');
      setBriefing(res || null);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoadingBriefing(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (nightShiftEnabled) {
      runNightShift();
    }
  }, [nightShiftEnabled, runNightShift]);

  function Toggle({ label, enabled, onChange }) {
    return (
      <button
        onClick={() => onChange(!enabled)}
        className="flex items-center gap-3 w-full glass-luxury rounded-2xl p-4 hover:bg-white/5 transition-colors"
      >
        {enabled ? <ToggleRight size={28} className="text-violet-400" /> : <ToggleLeft size={28} className="text-white/30" />}
        <div className="text-left">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-white/50">{enabled ? t('dream.enabled') : t('dream.disabled')}</p>
        </div>
      </button>
    );
  }

  function Card({ title, icon: Icon, children, className = '' }) {
    return (
      <div className={`glass-luxury rounded-2xl p-5 space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-white text-lg">{title}</h3>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
          <Moon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('dream.title')}</h2>
          <p className="text-white/60 mt-1">{t('dream.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Toggle
          label={t('dream.enableNightShift')}
          enabled={nightShiftEnabled}
          onChange={setNightShiftEnabled}
        />
        <Toggle
          label={t('dream.enableMorningBriefing')}
          enabled={morningBriefingEnabled}
          onChange={setMorningBriefingEnabled}
        />
      </div>

      <Card title={t('dream.lastReport')} icon={Database}>
        <div className="space-y-3">
          {lastReport?.tasks?.map((task, i) => {
            const Icon = TASK_ICONS[task.task] || Sun;
            return (
              <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-xs font-mono text-violet-400 w-12">{task.time}</div>
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{task.task}</p>
                  <p className="text-xs text-white/50">{task.result}</p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={runNightShift}
          disabled={loadingReport}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
        >
          {loadingReport ? <Loader2 size={16} className="animate-spin" /> : <Moon size={16} />}
          {t('dream.runNightShift')}
        </button>
      </Card>

      <Card title={t('dream.morningBriefing')} icon={Sun}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider">{t('dream.pendingDecisions')}</p>
            <p className="text-2xl font-bold text-white mt-1">{(briefing?.decisions || []).length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider">{t('dream.trends')}</p>
            <p className="text-2xl font-bold text-white mt-1">{(briefing?.trends || []).length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider">{t('dream.predictions')}</p>
            <p className="text-2xl font-bold text-white mt-1">{(briefing?.predictions || []).length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider">{t('dream.recommendations')}</p>
            <p className="text-2xl font-bold text-white mt-1">{(briefing?.recommendations || []).length}</p>
          </div>
        </div>
        <button
          onClick={fetchBriefing}
          disabled={loadingBriefing}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2"
        >
          {loadingBriefing ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
          {t('dream.getBriefing')}
        </button>
      </Card>

      <Card title={t('dream.weeklyIdeas')} icon={Lightbulb}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(dreamStatus?.ideas?.length ? dreamStatus.ideas : WEEKLY_IDEAS).map((idea, i) => {
            const text = idea.text || idea;
            const time = idea.time || null;
            return (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 flex-shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="flex-1">
                    {time && <div className="text-[10px] text-white/40 mb-1">{time}</div>}
                    <p className="text-sm text-white">{text}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/project-factory')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-violet-600 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  {t('dream.createProject')} <ArrowRight size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title={t('dream.weeklyForecast')} icon={Calendar}>
        <div className="flex flex-wrap gap-2">
          {PREDICTIONS.map((p, i) => (
            <div key={i} className="flex-1 min-w-[120px] bg-white/5 rounded-xl p-3 border border-white/10 text-center">
              <p className="text-xs text-white/50">{p.day}</p>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mx-auto my-2">
                <TrendingUp size={16} />
              </div>
              <p className="text-sm font-medium text-white">{p.topic}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${p.trend === 'рост' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
                {p.trend}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
