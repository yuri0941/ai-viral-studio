import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'

// [PAYMENT-v5.2] added: unified multi-currency checkout page
export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') || 'creator'

  const [plans, setPlans] = useState([])
  const [currency, setCurrency] = useState('RUB')
  const [symbol, setSymbol] = useState('₽')
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch(`${API_URL}/geo/currency`)
      .then((r) => r.json())
      .then((data) => {
        if (data.currency) setCurrency(data.currency)
        if (data.symbol) setSymbol(data.symbol)
      })
      .catch(() => {
        // fallback to RUB
      })

    fetch(`${API_URL}/checkout/methods?currency=ALL`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.providers || []
        setProviders(list)
        if (list.length > 0 && !selectedProvider) {
          setSelectedProvider(list[0].id)
        }
      })
      .catch(() => setProviders([]))

    fetch(`${API_URL}/plans?currency=RUB`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans || []))
      .catch(() => setPlans([]))
  }, [])

  const currentPlan = plans.find((p) => p.id === planId)
  const displayPrice = currentPlan
    ? currency === 'USD'
      ? currentPlan.priceUSD || currentPlan.price
      : currentPlan.priceRUB || currentPlan.price
    : 0

  const handlePay = async () => {
    if (!selectedProvider) {
      showToast('Выберите способ оплаты')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId, provider: selectedProvider, currency }),
      })
      const data = await res.json()
      setLoading(false)
      if (data.paymentUrl || data.url) {
        window.location.href = data.paymentUrl || data.url
      } else if (data.address) {
        showToast(`Отправьте ${data.amount} ${data.currency} на ${data.address}`)
      } else {
        showToast(data.message || data.error || 'Ошибка создания платежа')
      }
    } catch (e) {
      setLoading(false)
      showToast('Не удалось создать платёж')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Оформление подписки</h1>
        <p className="text-gray-400 mb-8">
          Тариф: <span className="font-semibold text-white">{currentPlan?.name || planId.toUpperCase()}</span>
        </p>

        {toast && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200">
            {toast}
          </div>
        )}

        <div className="mb-6">
          <label className="text-sm text-gray-400 block mb-2">Валюта</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="USDT">₮ USDT</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {providers.length === 0 && (
            <p className="text-gray-400 col-span-full">Нет доступных способов оплаты для выбранной валюты.</p>
          )}
          {providers.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                selectedProvider === p.id
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                  : 'border-[var(--border)] hover:border-gray-500'
              }`}
            >
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-sm text-gray-400">{p.testMode ? 'Тестовый режим' : 'Рабочий режим'}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handlePay}
          disabled={loading || providers.length === 0}
          className="w-full md:w-auto px-8 py-3 bg-[var(--primary)] rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Создание платежа...' : `Оплатить ${symbol}${displayPrice}`}
        </button>
      </div>
    </div>
  )
}
