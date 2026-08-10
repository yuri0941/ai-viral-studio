import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, DollarSign, TrendingUp, Inbox, CheckCircle, XCircle } from 'lucide-react';
import { request } from '../../../../services/api.js';

export default function AdvertiserDashboard() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqData, campData] = await Promise.all([
        request('/api/ad-orders').catch(() => ({ data: [] })),
        request('/api/advertiser-suite/campaigns').catch(() => ({ data: [] }))
      ]);
      setRequests(reqData.data || []);
      setCampaigns(campData.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalRoi = campaigns.length ? Math.round(campaigns.reduce((sum, c) => sum + (c.roi || 0), 0) / campaigns.length) : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-[var(--primary)]" /> {t('advertiser.dashboardTitle') || 'Advertiser Dashboard'}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Inbox} value={requests.length} label={t('advertiser.requests') || 'Заявки'} />
        <MetricCard icon={DollarSign} value={totalBudget.toLocaleString('ru-RU') + ' ₽'} label={t('advertiser.budget') || 'Бюджет'} />
        <MetricCard icon={TrendingUp} value={campaigns.length} label={t('advertiser.campaigns') || 'Кампании'} />
        <MetricCard icon={CheckCircle} value={`${totalRoi}%`} label={t('advertiser.avgRoi') || 'Средний ROI'} />
      </div>

      <div className="glass-luxury rounded-2xl p-6">
        <h3 className="font-semibold mb-4">{t('advertiser.incomingRequests') || 'Входящие заявки'}</h3>
        <div className="space-y-3">
          {requests.length ? requests.map(r => (
            <div key={r._id || r.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div>
                <p className="font-medium">{r.company || r.name || '—'}</p>
                <p className="text-xs text-[var(--text-muted)]">{r.budget?.toLocaleString('ru-RU')} ₽ · {r.format} · {r.goal}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t('btn.approve')}</button>
                <button className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> {t('btn.reject')}</button>
              </div>
            </div>
          )) : <p className="text-sm text-[var(--text-muted)]">{t('advertiser.noRequests') || 'Нет заявок'}</p>}
        </div>
      </div>

      <div className="glass-luxury rounded-2xl p-6">
        <h3 className="font-semibold mb-4">{t('advertiser.activeCampaigns') || 'Активные кампании'}</h3>
        <div className="space-y-3">
          {campaigns.length ? campaigns.map(c => (
            <div key={c._id || c.id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{c.company || c.format}</span>
                <span className={`text-xs px-2 py-1 rounded ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{c.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
                <span>{t('advertiser.budget')}: {c.budget?.toLocaleString('ru-RU')} ₽</span>
                <span>CTR: {c.ctr}%</span>
                <span>ROI: {c.roi}%</span>
              </div>
            </div>
          )) : <p className="text-sm text-[var(--text-muted)]">{t('advertiser.noCampaigns') || 'Нет активных кампаний'}</p>}
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
