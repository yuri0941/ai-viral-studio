import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { API_BASE_URL } from '../../../../config.js'
import { Users, Search, Shield, ShieldOff, Trash2, Eye, X, Loader2, AlertTriangle, User } from 'lucide-react'

const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const PLAN_OPTIONS = [
  { value: '', label: 'Все планы' },
  { value: 'free', label: 'Free' },
  { value: 'creator', label: 'Creator' },
  { value: 'business', label: 'Business' },
  { value: 'agency', label: 'Agency' },
  { value: 'enterprise', label: 'Enterprise' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активен' },
  { value: 'blocked', label: 'Заблокирован' },
  { value: 'deleted', label: 'Удалён' },
]

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blocked: 'bg-red-500/10 text-red-400 border-red-500/20',
    deleted: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    suspended: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${styles[status] || styles.active}`}>
      {status || 'active'}
    </span>
  )
}

export function ClientsTab({ data }) {
  const { t } = useTranslation()
  const { toasts, setToasts } = data
  const [clients, setClients] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, deleted: 0, byPlan: [] })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ email: '', plan: '', status: '' })
  const [selectedClient, setSelectedClient] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [actionClient, setActionClient] = useState(null)
  const [actionReason, setActionReason] = useState('')
  const [actionType, setActionType] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadClients()
    loadStats()
  }, [filters])

  async function loadClients() {
    setLoading(true)
    try {
      const params = {}
      if (filters.email) params.email = filters.email
      if (filters.plan) params.plan = filters.plan
      if (filters.status) params.status = filters.status
      const res = await api.get('/admin/users', { params })
      setClients(res.data?.clients || [])
    } catch (err) {
      console.error('[ClientsTab:load]', err)
      pushToast('error', 'Не удалось загрузить клиентов')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await api.get('/admin/users/stats/overview')
      setStats(res.data?.stats || { total: 0, active: 0, blocked: 0, deleted: 0, byPlan: [] })
    } catch (err) {
      console.error('[ClientsTab:stats]', err)
    }
  }

  function pushToast(type, message) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  async function openDetails(id) {
    setDetailsLoading(true)
    try {
      const res = await api.get(`/admin/users/${id}`)
      setSelectedClient(res.data?.client || null)
    } catch (err) {
      pushToast('error', 'Не удалось загрузить детали клиента')
    } finally {
      setDetailsLoading(false)
    }
  }

  async function confirmAction() {
    if (!actionClient || !actionType) return
    setProcessing(true)
    try {
      if (actionType === 'block') {
        await api.post(`/admin/users/${actionClient._id}/block`, { reason: actionReason })
        pushToast('success', `Клиент ${actionClient.email} заблокирован`)
      } else if (actionType === 'delete') {
        await api.post(`/admin/users/${actionClient._id}/delete`, { reason: actionReason })
        pushToast('success', `Клиент ${actionClient.email} помечен на удаление`)
      }
      setActionClient(null)
      setActionType(null)
      setActionReason('')
      loadClients()
      loadStats()
    } catch (err) {
      pushToast('error', err.response?.data?.error || 'Ошибка действия')
    } finally {
      setProcessing(false)
    }
  }

  async function unblockClient(client) {
    try {
      await api.post(`/admin/users/${client._id}/unblock`)
      pushToast('success', `Клиент ${client.email} разблокирован`)
      loadClients()
      loadStats()
    } catch (err) {
      pushToast('error', err.response?.data?.error || 'Ошибка разблокировки')
    }
  }

  const statCards = [
    { key: 'total', label: 'Всего', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { key: 'active', label: 'Активных', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { key: 'blocked', label: 'Заблокированных', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { key: 'deleted', label: 'Удалённых', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--primary)]" />
            👥 Клиенты — Управление аккаунтами
          </h2>
          <p className="text-[var(--text-muted)] mt-1">Управление пользователями, блокировка и удаление аккаунтов.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.key} className={`glass-card rounded-2xl p-5 border ${s.bg}`}>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{stats[s.key] || 0}</div>
            <div className="text-sm text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              placeholder="Поиск по email"
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <select
            value={filters.plan}
            onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
          >
            {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => { setFilters({ email: '', plan: '', status: '' }); loadClients(); loadStats() }}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="luxury-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">План</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Дата регистрации</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Загрузка…</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">Клиенты не найдены</td></tr>
              ) : clients.map((client) => (
                <tr key={client._id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="px-4 py-3 text-[var(--text)]">{client.email}</td>
                  <td className="px-4 py-3 text-[var(--text)]">{client.name || '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">{client.subscription || 'free'}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{client.createdAt ? new Date(client.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openDetails(client._id)} className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--primary)]/20 text-[var(--text-muted)] hover:text-[var(--primary)]" title="Детали"><Eye size={16} /></button>
                      {client.status === 'blocked' ? (
                        <button onClick={() => unblockClient(client)} className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400" title="Разблокировать"><ShieldOff size={16} /></button>
                      ) : (
                        <button onClick={() => { setActionClient(client); setActionType('block'); setActionReason('') }} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400" title="Заблокировать"><Shield size={16} /></button>
                      )}
                      <button onClick={() => { setActionClient(client); setActionType('delete'); setActionReason('') }} className="p-2 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-red-400" title="Удалить"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2"><User size={20} /> Детали клиента</h3>
              <button onClick={() => setSelectedClient(null)} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"><X size={18} /></button>
            </div>
            {detailsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <div className="space-y-2 text-sm text-[var(--text)]">
                <p><span className="text-[var(--text-muted)]">Email:</span> {selectedClient.email}</p>
                <p><span className="text-[var(--text-muted)]">Имя:</span> {selectedClient.name || '—'}</p>
                <p><span className="text-[var(--text-muted)]">Роль:</span> {selectedClient.role}</p>
                <p><span className="text-[var(--text-muted)]">План:</span> {selectedClient.subscription}</p>
                <p><span className="text-[var(--text-muted)]">Статус:</span> {selectedClient.status}</p>
                <p><span className="text-[var(--text-muted)]">Зарегистрирован:</span> {selectedClient.createdAt ? new Date(selectedClient.createdAt).toLocaleString('ru-RU') : '—'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {actionClient && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle />
              <h3 className="text-lg font-bold text-[var(--text)]">
                {actionType === 'block' ? 'Заблокировать клиента' : 'Удалить аккаунт клиента'}
              </h3>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{actionClient.email}</p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={actionType === 'block' ? 'Причина блокировки' : 'Причина удаления (ПД будут удалены через 30 дней)'}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm min-h-[80px]"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionClient(null); setActionType(null); setActionReason('') }} className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm">Отмена</button>
              <button onClick={confirmAction} disabled={processing} className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm disabled:opacity-50">
                {processing ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                {actionType === 'block' ? 'Заблокировать' : 'Подтвердить удаление'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
