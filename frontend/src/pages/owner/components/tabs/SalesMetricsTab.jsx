import { useState, useEffect } from 'react';
import { TrendingUp, MessageCircle, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { request } from '../../../../services/api.js';
import toast from 'react-hot-toast';

const COLORS = ['#8B5CF6', '#06B6D4', '#F97316', '#10B981', '#EF4444'];

export default function SalesMetricsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/api/admin/sales-metrics')
      .then(d => { setData(d); setLoading(false); })
      .catch((err) => {
        console.error('[SalesMetricsTab] fetch failed', err);
        toast.error('Не удалось загрузить метрики');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Загрузка метрик...</div>;
  if (!data) return <div className="p-8 text-center text-[var(--text-muted)]">Нет данных</div>;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
        <TrendingUp className="text-[var(--primary)]" /> Метрики продаж (OMEGA Chat)
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0f0f14]">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><MessageCircle size={16} /> Диалогов</div>
          <div className="text-2xl font-bold text-white">{data.summary.total}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0f0f14]">
          <div className="flex items-center gap-2 text-green-400 text-sm mb-1"><ShoppingCart size={16} /> Конверсий</div>
          <div className="text-2xl font-bold text-green-400">{data.summary.converted}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0f0f14]">
          <div className="flex items-center gap-2 text-violet-400 text-sm mb-1"><CheckCircle size={16} /> Конверсия</div>
          <div className="text-2xl font-bold text-violet-400">{data.summary.conversionRate}%</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0f0f14]">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1"><AlertTriangle size={16} /> Churn Risk</div>
          <div className="text-2xl font-bold text-red-400">{data.summary.churnRisk}</div>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0f0f14]">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Динамика за 7 дней</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.daily}>
            <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
            <Bar dataKey="total" fill="#8B5CF6" name="Всего" radius={[4, 4, 0, 0]} />
            <Bar dataKey="converted" fill="#10B981" name="Конверсии" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Intent Pie */}
      <div className="glass-card p-4 rounded-xl border border-white/10 bg-[#0f0f14]">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Топ интентов клиентов</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data.intents} dataKey="count" nameKey="intent" cx="50%" cy="50%" outerRadius={80} label>
              {data.intents.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
