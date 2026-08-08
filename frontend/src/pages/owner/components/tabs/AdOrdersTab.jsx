import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../../hooks/useTranslation.js'
import { request } from '../../../../services/api.js'
import { Megaphone, Loader2, RefreshCw, CheckCircle, XCircle, DollarSign, Gift, Video } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_META = {
  pending: { label: 'Ожидает', emoji: '⏳', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  paid: { label: 'Оплачен', emoji: '💰', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  approved: { label: 'Одобрен', emoji: '✅', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Отклонён', emoji: '❌', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  published: { label: 'Опубликован', emoji: '📢', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  completed: { label: 'Завершён', emoji: '🏁', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

export function AdOrdersTab() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [channels, setChannels] = useState([])
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [editingPrices, setEditingPrices] = useState({})
  const [discountForm, setDiscountForm] = useState({ planId: 'pro', percent: 30 })
  const [videoTopic, setVideoTopic] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await request('/api/ad-orders/all')
      setOrders(res?.data || res || [])
    } catch (err) {
      console.error('[AdOrdersTab] fetch orders failed', err)
      toast.error(t('common.error') || 'Ошибка загрузки заказов')
    } finally {
      setLoading(false)
    }
  }

  const fetchPricing = async () => {
    try {
      const res = await request('/api/ad-orders/pricing')
      setPricing(res)
      setEditingPrices(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.price])))
    } catch (err) {
      console.error('[AdOrdersTab] fetch pricing failed', err)
    }
  }

  const fetchChannels = async () => {
    try {
      const res = await request('/api/channel/config')
      setChannels(res?.data || res || [])
    } catch (err) {
      console.error('[AdOrdersTab] fetch channels failed', err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchPricing()
    fetchChannels()
  }, [])

  const updateStatus = async (id, status) => {
    try {
      await request(`/api/ad-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast.success(status === 'approved' ? (t('adOrders.approve') || 'Одобрено') : (t('adOrders.reject') || 'Отклонено'))
      fetchOrders()
    } catch (err) {
      toast.error(err.message || 'Ошибка')
    }
  }

  const updatePrices = async () => {
    try {
      for (const [slotType, price] of Object.entries(editingPrices)) {
        await request('/api/ad-orders/pricing', { method: 'POST', body: JSON.stringify({ slotType, price: Number(price) }) })
      }
      toast.success(t('adOrders.updatePrices') || 'Цены обновлены')
      fetchPricing()
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления цен')
    }
  }

  const createDiscount = async () => {
    try {
      const res = await request('/api/discounts', { method: 'POST', body: JSON.stringify(discountForm) })
      if (channels[0]) {
        await request(`/api/discounts/${res._id}/publish`, { method: 'POST', body: JSON.stringify({ configId: channels[0]._id }) })
        toast.success(`Скидка опубликована: ${res.promoCode}`)
      } else {
        toast.success(`Скидка создана: ${res.promoCode}`)
      }
    } catch (err) {
      toast.error(err.message || 'Ошибка скидки')
    }
  }

  const openVideoBot = () => {
    const text = encodeURIComponent(`/video ${videoTopic || 'новая тема'}`)
    window.open(`https://t.me/aiviral_alerts_bot?start=${text}`, '_blank')
  }

  const filtered = useMemo(() => {
    return orders.filter(o => filter === 'all' || o.status === filter)
  }, [orders, filter])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-violet-400" /> {t('adOrders.title') || 'Заказы рекламы'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">Реклама в канале @aiviralstudio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-sm text-white outline-none focus:border-violet-500">
            <option value="all">{t('common.all') || 'Все'}</option>
            {Object.entries(STATUS_META).map(([k, meta]) => (
              <option key={k} value={k}>{meta.emoji} {meta.label}</option>
            ))}
          </select>
          <button onClick={fetchOrders} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !orders.length ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f0f14]">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">{t('adOrders.client') || 'Клиент'}</th>
                <th className="px-4 py-3">{t('adOrders.slotType') || 'Формат'}</th>
                <th className="px-4 py-3">{t('adOrders.price') || 'Цена'}</th>
                <th className="px-4 py-3">{t('adOrders.status') || 'Статус'}</th>
                <th className="px-4 py-3">{t('adOrders.actions') || 'Действия'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(o => {
                const meta = STATUS_META[o.status] || STATUS_META.pending
                return (
                  <tr key={o._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-400">#{String(o._id).slice(-6)}</td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">@{o.clientUsername || '—'}</div>
                      <div className="text-xs text-gray-500">{o.clientName || o.clientTelegramId}</div>
                    </td>
                    <td className="px-4 py-3 text-white">{o.slotType}</td>
                    <td className="px-4 py-3 text-white">{o.price?.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${meta.color}`}>
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {o.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(o._id, 'approved')} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs transition-colors">
                              <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> {t('adOrders.approve') || 'Одобрить'}
                            </button>
                            <button onClick={() => updateStatus(o._id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs transition-colors">
                              <XCircle className="w-3.5 h-3.5 inline mr-1" /> {t('adOrders.reject') || 'Отклонить'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">{t('adOrders.noOrders') || 'Нет заказов'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing */}
      <div className="p-5 rounded-2xl border border-white/10 bg-[#0f0f14]">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-violet-400" /> {t('adOrders.pricing') || 'Цены'}</h3>
        {pricing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {Object.entries(pricing).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <label className="text-xs text-gray-400">{v.description}</label>
                <input
                  type="number"
                  value={editingPrices[k] ?? v.price}
                  onChange={e => setEditingPrices({ ...editingPrices, [k]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>
        ) : <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />}
        <button onClick={updatePrices} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">{t('adOrders.updatePrices') || 'Обновить цены'}</button>
      </div>

      {/* Discounts */}
      <div className="p-5 rounded-2xl border border-white/10 bg-[#0f0f14]">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><Gift className="w-4 h-4 text-violet-400" /> Скидки</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 block mb-1">План</label>
            <select value={discountForm.planId} onChange={e => setDiscountForm({ ...discountForm, planId: e.target.value })} className="px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500">
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">%</label>
            <input type="number" value={discountForm.percent} onChange={e => setDiscountForm({ ...discountForm, percent: Number(e.target.value) })} className="px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500 w-24" />
          </div>
          <button onClick={createDiscount} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">Создать и опубликовать</button>
        </div>
      </div>

      {/* Video */}
      <div className="p-5 rounded-2xl border border-white/10 bg-[#0f0f14]">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><Video className="w-4 h-4 text-violet-400" /> Видео / Reels</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            value={videoTopic}
            onChange={e => setVideoTopic(e.target.value)}
            placeholder="Тема видео"
            className="px-3 py-2 rounded-xl bg-[#15151c] border border-white/10 text-white text-sm outline-none focus:border-violet-500 w-full sm:w-80"
          />
          <button onClick={openVideoBot} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">Сгенерировать в Telegram</button>
        </div>
      </div>
    </div>
  )
}
