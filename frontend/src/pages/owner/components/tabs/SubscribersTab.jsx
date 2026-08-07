import { useState, useEffect } from 'react';
import { RefreshCcw, RotateCcw, Search, Users, Mail, Megaphone, Download, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../../config.js';
import BroadcastModal from '../../../../components/owner/BroadcastModal.jsx';

const STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-400',
  refunded: 'bg-blue-500/20 text-blue-400',
  canceled: 'bg-gray-500/20 text-gray-400',
  past_due: 'bg-red-500/20 text-red-400',
  unpaid: 'bg-red-500/20 text-red-400',
  trialing: 'bg-yellow-500/20 text-yellow-400',
};

const STATUS_LABELS = {
  active: 'Активна',
  refunded: 'Возврат',
  canceled: 'Отменена',
  past_due: 'Просрочена',
  unpaid: 'Не оплачена',
  trialing: 'Триал',
};

export function SubscribersTab() {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => { loadSubs(); }, []);

  const loadSubs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load subscriptions');
      const data = await res.json();
      setSubs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[SubscribersTab]', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (id) => {
    if (!window.confirm('Вернуть деньги и отменить подписку?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/refund/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Refund failed');
      loadSubs();
    } catch (err) {
      console.error('[SubscribersTab:refund]', err.message);
      alert(err.message);
    }
  };

  const handleExtend = async (id) => {
    const months = window.prompt('На сколько месяцев продлить?', '1');
    if (!months) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/extend/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ months: parseInt(months) || 1 })
      });
      if (!res.ok) throw new Error('Extend failed');
      loadSubs();
    } catch (err) {
      console.error('[SubscribersTab:extend]', err.message);
      alert(err.message);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/admin/subscriptions/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Отчёт_подписчики_${new Date().toLocaleDateString('ru-RU')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      if (window.showToast) window.showToast('Отчёт скачан', 'success');
    } catch (err) {
      console.error('[SubscribersTab:export]', err.message);
      if (window.showToast) window.showToast('Не удалось скачать отчёт', 'error');
    }
  };

  const filtered = subs.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const user = s.userId || {};
    const term = search.toLowerCase();
    const matchesSearch = !term ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.name && user.name.toLowerCase().includes(term)) ||
      (s.plan && s.plan.toLowerCase().includes(term));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} /> Подписчики
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBroadcast(true)}
            className="px-3 py-2 rounded-lg glass-luxury text-sm flex items-center gap-2 hover:bg-primary/20 transition-colors"
          >
            <Megaphone size={16} /> Массовая рассылка
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg glass-luxury text-sm flex items-center gap-2 hover:bg-primary/20 transition-colors"
          >
            <Download size={16} /> 📥 Скачать отчёт
          </button>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по email / имени..."
              className="glass-luxury rounded-lg pl-9 pr-4 py-2 text-sm w-64 bg-white/5 border border-white/10 outline-none focus:border-violet-400/50"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="glass-luxury rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 outline-none"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="past_due">Просроченные</option>
            <option value="canceled">Отменённые</option>
            <option value="refunded">Возвраты</option>
          </select>
        </div>
      </div>

      <div className="glass-luxury rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-text-muted">
              <tr>
                <th className="text-left p-3">Пользователь</th>
                <th className="text-left p-3">Тариф</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Оплачено до</th>
                <th className="text-left p-3">Сумма</th>
                <th className="text-left p-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => (
                <tr key={s._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div className="font-medium">{s.userId?.name || '—'}</div>
                    <div className="text-xs text-text-muted">{s.userId?.email}</div>
                  </td>
                  <td className="p-3 capitalize">{s.plan}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_STYLES[s.status] || STATUS_STYLES.unpaid}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </td>
                  <td className="p-3">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('ru-RU') : '—'}</td>
                  <td className="p-3">{s.amount ? `${s.amount} ${s.currency || '₽'}` : '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExtend(s._id)}
                        title="Продлить"
                        className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 transition-colors"
                      >
                        <RefreshCcw size={14} />
                      </button>
                      <button
                        onClick={() => handleRefund(s._id)}
                        title="Возврат"
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="p-8 text-center text-text-muted text-sm">Загрузка...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-text-muted text-sm">Подписчиков не найдено</div>
        )}
      </div>

      {showBroadcast && (
        <BroadcastModal onClose={() => setShowBroadcast(false)} />
      )}
    </div>
  );
}

export default SubscribersTab;
