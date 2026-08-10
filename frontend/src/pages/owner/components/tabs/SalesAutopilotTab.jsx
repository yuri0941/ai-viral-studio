import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, TrendingUp, Bell, Users, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { request } from '../../../../services/api.js';

const FUNNEL = [
  { step: 'Free', color: 'bg-slate-500', width: '100%' },
  { step: 'Creator', color: 'bg-blue-500', width: '75%' },
  { step: 'Pro', color: 'bg-purple-500', width: '45%' },
  { step: 'Agency', color: 'bg-emerald-500', width: '15%' }
];

export default function SalesAutopilotTab() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total: 0, sent: 0, opened: 0, converted: 0, rate: 0 });
  const [steps, setSteps] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await request('/sales-autopilot/stats');
      setStats(data.data || data);
      const stepsData = await request('/sales-autopilot/steps');
      setSteps(stepsData.steps || []);
      const triggersData = await request('/sales-autopilot/triggers');
      setTriggers(triggersData.triggers || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Rocket className="w-6 h-6 text-[var(--primary)]" /> {t('salesAutopilot.title') || 'Sales Autopilot'}</h2>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="glass-luxury rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('salesAutopilot.funnel') || 'Воронка Free → Paid'}</h3>
        <div className="space-y-3">
          {FUNNEL.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium">{f.step}</div>
              <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${f.color}`} style={{ width: f.width }} />
              </div>
              <div className="w-12 text-right text-xs text-[var(--text-muted)]">{f.width}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Users} value={stats.total} label={t('salesAutopilot.total') || 'Всего'} />
        <MetricCard icon={CheckCircle} value={stats.sent} label={t('salesAutopilot.sent') || 'Отправлено'} />
        <MetricCard icon={Clock} value={stats.opened} label={t('salesAutopilot.opened') || 'Открыто'} />
        <MetricCard icon={TrendingUp} value={`${stats.rate}%`} label={t('salesAutopilot.conversion') || 'Конверсия'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4" /> {t('salesAutopilot.drip') || 'Drip Campaign'}</h3>
          <div className="space-y-2">
            {steps.length ? steps.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-bold">{s.step}</span>
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">+{s.delayDays}d</span>
              </div>
            )) : <p className="text-sm text-[var(--text-muted)]">{t('common.loading')}</p>}
          </div>
        </div>

        <div className="glass-luxury rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('salesAutopilot.upsell') || 'Upsell Triggers'}</h3>
          <div className="space-y-2">
            {triggers.map((tr, i) => (
              <div key={i} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm">
                <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{tr.key}</span>
                <p className="mt-1">{tr.message}</p>
              </div>
            ))}
            {!triggers.length && <p className="text-sm text-[var(--text-muted)]">{t('salesAutopilot.noTriggers') || 'Нет активных триггеров'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, value, label }) {
  return (
    <div className="glass-luxury rounded-2xl p-5 text-center">
      <Icon className="w-5 h-5 mx-auto mb-2 text-[var(--primary)]" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

