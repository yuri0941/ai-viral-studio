import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'
import { Check, X, Loader2, AlertCircle, Shield, FileText, Code, Megaphone, Wallet, Key } from 'lucide-react'

const TYPE_META = {
  code_change: { icon: Code, label: 'Код', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  post: { icon: FileText, label: 'Пост', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  campaign: { icon: Megaphone, label: 'Кампания', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  budget: { icon: Wallet, label: 'Бюджет', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  feature: { icon: Shield, label: 'Фича', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  api_key: { icon: Key, label: 'API Key', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
}

export function OmegaApprovalQueue() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState({})

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/approvals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      // [OWNER-OMEGA] API может вернуть не-массив ({} при ошибке) — не падаем в ErrorBoundary
      setItems(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      console.warn('[OmegaApprovalQueue] load failed:', err.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  const handleResolve = async (id, action) => {
    setProcessing(prev => ({ ...prev, [id]: action }))
    try {
      const res = await fetch(`${API_BASE_URL}/approvals/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (res.ok) load()
    } catch (err) {
      console.warn(`[OmegaApprovalQueue] ${action} failed:`, err.message)
    } finally {
      setProcessing(prev => ({ ...prev, [id]: null }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Загрузка очереди...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {['pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'pending' ? '⏳ Ожидают' : f === 'approved' ? '✅ Одобрено' : '⛔ Отклонено'}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-gray-400 text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Нет запросов в статусе «{filter === 'pending' ? 'ожидание' : filter === 'approved' ? 'одобрено' : 'отклонено'}»
        </div>
      )}

      {items.map(item => {
        const meta = TYPE_META[item.type] || TYPE_META.feature
        const Icon = meta.icon
        const isProcessing = processing[item._id]
        return (
          <div
            key={item._id}
            className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${meta.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{meta.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.color}`}>
                      {item.proposedBy || 'OMEGA'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.description}</p>
                  {item.data && Object.keys(item.data).length > 0 && (
                    <pre className="mt-2 p-2 rounded-lg bg-black/30 text-[10px] text-gray-400 overflow-x-auto">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  )}
                  <p className="text-[10px] text-gray-500 mt-2">{new Date(item.createdAt).toLocaleString('ru-RU')}</p>
                </div>
              </div>

              {item.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResolve(item._id, 'approve')}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-medium disabled:opacity-50"
                  >
                    {isProcessing === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    ✅
                  </button>
                  <button
                    onClick={() => handleResolve(item._id, 'reject')}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-medium disabled:opacity-50"
                  >
                    {isProcessing === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    ⛔
                  </button>
                </div>
              )}

              {item.status === 'approved' && (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">✅ Одобрено</span>
              )}
              {item.status === 'rejected' && (
                <span className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">⛔ Отклонено</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OmegaApprovalQueue
