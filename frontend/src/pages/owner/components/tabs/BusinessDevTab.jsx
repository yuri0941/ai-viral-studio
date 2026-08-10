import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Search, Mail, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { request } from '../../../../services/api.js';

export default function BusinessDevTab() {
  const { t } = useTranslation();
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        request(`/api/business-dev/prospects?niche=${encodeURIComponent(niche)}&location=${encodeURIComponent(location)}`),
        request('/api/business-dev/stats')
      ]);
      setProspects(p.data || []);
      setStats(s.data || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateEmail = async (prospect) => {
    try {
      const data = await request('/api/business-dev/email', {
        method: 'POST',
        body: JSON.stringify({ prospect, niche })
      });
      setEmail(data.email);
      setSelected(prospect);
    } catch (e) { console.error(e); }
  };

  const schedule = async (prospectId, step) => {
    try {
      await request('/api/business-dev/follow-up', {
        method: 'POST',
        body: JSON.stringify({ prospectId, step })
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6 text-[var(--primary)]" /> {t('businessDev.title') || 'Business Development'}</h2>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Search} value={stats?.prospects || 0} label={t('businessDev.prospects') || 'Prospects'} />
        <MetricCard icon={Mail} value={stats?.emailsSent || 0} label={t('businessDev.emailsSent') || 'Emails sent'} />
        <MetricCard icon={BarChart3} value={stats?.responses || 0} label={t('businessDev.responses') || 'Responses'} />
        <MetricCard icon={Calendar} value={stats?.meetings || 0} label={t('businessDev.meetings') || 'Meetings'} />
      </div>

      <div className="glass-luxury rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input value={niche} onChange={e => setNiche(e.target.value)} placeholder={t('businessDev.niche') || 'Ниша'} className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('businessDev.location') || 'Город'} className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-2 text-sm" />
          <button onClick={load} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium flex items-center gap-2"><Search className="w-4 h-4" /> {t('businessDev.search') || 'Найти'}</button>
        </div>

        <div className="space-y-3">
          {prospects.map(p => (
            <div key={p.id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium">{p.company}</p>
                <p className="text-sm text-[var(--text-muted)]">{p.contact} · {p.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 rounded bg-white/5">{p.niche}</span>
                  <span className="text-xs px-2 py-1 rounded bg-white/5">{p.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--primary)]">{p.score}</div>
                  <div className="text-xs text-[var(--text-muted)]">score</div>
                </div>
                <button onClick={() => generateEmail(p)} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {t('businessDev.generateEmail') || 'Письмо'}</button>
                <button onClick={() => schedule(p.id, 1)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Follow-up</button>
              </div>
            </div>
          ))}
          {!prospects.length && <p className="text-sm text-[var(--text-muted)]">{t('businessDev.noProspects') || 'Нет prospects'}</p>}
        </div>
      </div>

      {email && selected && (
        <div className="glass-luxury rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> {t('businessDev.emailFor') || 'Письмо для'} {selected.company}</h3>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm space-y-2">
            <p className="font-medium">{email.subject}</p>
            <p className="whitespace-pre-wrap text-[var(--text-muted)]">{email.body}</p>
          </div>
        </div>
      )}
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
