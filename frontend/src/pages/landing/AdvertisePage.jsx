import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, BarChart3, Users, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { request } from '../../services/api.js';

export default function AdvertisePage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', company: '', email: '', budget: 50000, niche: '', goal: 'awareness', format: 'post', phone: '' });
  const [metrics, setMetrics] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const calculate = async () => {
    try {
      const data = await request('/advertiser-suite/metrics', {
        method: 'POST',
        body: JSON.stringify({ budget: form.budget, format: form.format })
      });
      setMetrics(data.metrics);
    } catch (e) { console.error(e); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const [prop] = await Promise.all([
        request('/advertiser-suite/proposal', {
          method: 'POST',
          body: JSON.stringify({ budget: form.budget, niche: form.niche, goal: form.goal, format: form.format })
        }),
        calculate()
      ]);
      setProposal(prop);
      setSent(true);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-sm">
            <Megaphone className="w-4 h-4" /> {t('advertiser.tag') || 'Реклама'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">{t('advertiser.heroTitle') || 'Рекламируйтесь в AI Viral Studio'}</h1>
          <p className="text-xl text-[var(--text-muted)]">{t('advertiser.heroSubtitle') || '50K+ SMM-специалистов, креаторов и бизнесов'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={Users} value="50K+" label={t('advertiser.audience') || 'Аудитория'} />
          <StatCard icon={BarChart3} value="3.5%" label={t('advertiser.ctr') || 'Средний CTR'} />
          <StatCard icon={Target} value="x4" label={t('advertiser.roi') || 'ROI'} />
        </div>

        <div className="glass-luxury rounded-3xl p-8 md:p-12 space-y-8">
          <h2 className="text-2xl font-bold text-center">{t('advertiser.calculator') || 'Калькулятор охвата'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('advertiser.name') || 'Имя'} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm" />
              <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder={t('advertiser.company') || 'Компания'} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t('advertiser.email') || 'Email'} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm" />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('advertiser.phone') || 'Телефон'} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm" />
            </div>
            <div className="space-y-4">
              <input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} placeholder={t('advertiser.niche') || 'Ниша'} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm" />
              <select value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm">
                <option value="awareness">{t('advertiser.goalAwareness') || 'Охват'}</option>
                <option value="leads">{t('advertiser.goalLeads') || 'Лиды'}</option>
                <option value="sales">{t('advertiser.goalSales') || 'Продажи'}</option>
              </select>
              <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3 text-sm">
                <option value="post">{t('advertiser.formatPost') || 'Пост'}</option>
                <option value="story">{t('advertiser.formatStory') || 'Сторис'}</option>
                <option value="banner">{t('advertiser.formatBanner') || 'Баннер'}</option>
                <option value="newsletter">{t('advertiser.formatNewsletter') || 'Email'}</option>
                <option value="video">{t('advertiser.formatVideo') || 'Видео'}</option>
              </select>
              <div className="flex items-center gap-4">
                <span className="text-sm whitespace-nowrap">{t('advertiser.budget') || 'Бюджет'}: {Number(form.budget).toLocaleString('ru-RU')} ₽</span>
                <input type="range" min="5000" max="500000" step="5000" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} className="flex-1" />
              </div>
            </div>
          </div>

          <button onClick={submit} disabled={loading || !form.email} className="w-full py-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? t('common.loading') : <>{t('advertiser.cta') || 'Получить предложение'} <ArrowRight className="w-5 h-5" /></>}
          </button>

          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[var(--border)]">
              <MetricBox label={t('advertiser.reach') || 'Охват'} value={metrics.reach.toLocaleString('ru-RU')} />
              <MetricBox label={t('advertiser.clicks') || 'Клики'} value={metrics.clicks.toLocaleString('ru-RU')} />
              <MetricBox label={t('advertiser.conversions') || 'Конверсии'} value={metrics.conversions.toLocaleString('ru-RU')} />
              <MetricBox label={t('advertiser.roi') || 'ROI'} value={`${metrics.roi}%`} />
            </div>
          )}

          {sent && proposal && (
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">{t('advertiser.proposalReady') || 'КП готово за 30 сек'}</h3>
                <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{proposal.proposal}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="glass-luxury rounded-2xl p-6 text-center">
      <Icon className="w-8 h-8 mx-auto mb-3 text-[var(--primary)]" />
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center">
      <div className="text-xl font-bold text-[var(--primary)]">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
