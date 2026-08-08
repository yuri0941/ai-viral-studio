import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../../../config.js'
import { CreditCard, Plus, CheckCircle, Loader2, AlertTriangle, DollarSign } from 'lucide-react'

const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export function MonetizationTab({ data }) {
  const { setToasts } = data
  const [refunds, setRefunds] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, totalAmount: 0 })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId: '', amount: '', reason: '', paymentId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => { loadRefunds() }, [])

  async function loadRefunds() {
    setLoading(true)
    try {
      const res = await api.get('/admin/refunds')
      setRefunds(res.data?.refunds || [])
      setStats(res.data?.stats || { total: 0, pending: 0, completed: 0, totalAmount: 0 })
    } catch (err) {
      console.error('[MonetizationTab:refunds]', err)
      pushToast('error', 'Не удалось загрузить возвраты')
    } finally {
      setLoading(false)
    }
  }

  function pushToast(type, message) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  async function createRefund(e) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.userId || amount <= 0) {
      pushToast('error', 'Укажите ID пользователя и сумму')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/admin/refunds', { userId: form.userId, amount, reason: form.reason, paymentId: form.paymentId })
      pushToast('success', 'Запрос на возврат создан')
      setForm({ userId: '', amount: '', reason: '', paymentId: '' })
      setShowForm(false)
      loadRefunds()
    } catch (err) {
      pushToast('error', err.response?.data?.error || 'Ошибка создания возврата')
    } finally {
      setSubmitting(false)
    }
  }

  async function processRefund(id) {
    setProcessingId(id)
    try {
      const res = await api.post(`/admin/refunds/${id}/process`)
      const refund = res.data?.refund
      if (refund?.mock) {
        pushToast('warning', refund.message || 'Mock-режим. Подключите ЮKassa в API Keys')
      } else {
        pushToast('success', 'Возврат выполнен')
      }
      loadRefunds()
    } catch (err) {
      pushToast('error', err.response?.data?.error || 'Ошибка обработки возврата')
    } finally {
      setProcessingId(null)
    }
  }

  const statCards = [
    { key: 'total', label: 'Всего', color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/10' },
    { key: 'pending', label: 'Ожидают', color: 'text-yellow-400', bg: 'border-yellow-500/20 bg-yellow-500/10' },
    { key: 'completed', label: 'Выполнено', color: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/10' },
    { key: 'totalAmount', label: 'Сумма возвратов', color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/10' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[var(--primary)]" />
            💸 Монетизация — Возвраты
          </h2>
          <p className="text-[var(--text-muted)] mt-1">Управление возвратами средств. ЮKassa-ready (mock-режим по умолчанию).</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Создать возврат
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.key} className={`glass-card rounded-2xl p-5 border ${s.bg}`}>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>
              {s.key === 'totalAmount' ? `${stats[s.key] || 0} ₽` : stats[s.key] || 0}
            </div>
            <div className="text-sm text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={createRefund} className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            placeholder="ID пользователя"
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
          />
          <input
            type="number"
            min={1}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Сумма, ₽"
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
          />
          <input
            value={form.paymentId}
            onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
            placeholder="ID платежа (опц.)"
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
          />
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Причина"
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
          />
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-medium disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null} Создать
            </button>
          </div>
        </form>
      )}

      <div className="luxury-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium">Причина</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Загрузка…</td></tr>
              ) : refunds.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">Нет запросов на возврат</td></tr>
              ) : refunds.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{r.id}</td>
                  <td className="px-4 py-3 text-[var(--text)]">{r.userId}</td>
                  <td className="px-4 py-3 text-[var(--text)] font-mono">{r.amount} ₽</td>
                  <td className="px-4 py-3 text-[var(--text)]">{r.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[r.status] || STATUS_COLORS.pending}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' ? (
                      <button
                        onClick={() => processRefund(r.id)}
                        disabled={processingId === r.id}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs disabled:opacity-50"
                      >
                        {processingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign size={14} />}
                        Вернуть деньги
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 justify-end"><CheckCircle size={14} className="text-emerald-400" /> Выполнен</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Mock-режим возвратов</p>
          <p className="opacity-80">Для реальных возвратов через ЮKassa добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в переменные окружения.</p>
        </div>
      </div>
    </div>
  )
}
