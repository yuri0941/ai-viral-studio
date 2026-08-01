import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../config'

const PLANS = [
  { id: 'starter', interval: 'monthly', label: 'Starter', price: '$9/mo' },
  { id: 'pro', interval: 'monthly', label: 'Pro', price: '$29/mo' },
  { id: 'starter', interval: 'yearly', label: 'Starter Yearly', price: '$90/yr' },
  { id: 'pro', interval: 'yearly', label: 'Pro Yearly', price: '$290/yr' },
]

export default function StripeCheckoutPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [selected, setSelected] = useState(PLANS[1])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handlePay = async () => {
        setLoading(true)
        setError('')
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/stripe/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    plan: selected.id,
                    interval: selected.interval,
                    currency: 'USD',
                }),
            })
            const data = await res.json()
            if (!res.ok || data.error) {
                throw new Error(data.error || data.message || 'Stripe error')
            }
            if (data.disabled) {
                setError(data.message || t('stripe.error'))
                return
            }
            if (data.url) {
                window.location.href = data.url
            } else {
                navigate('/payment-success')
            }
        } catch (err) {
            setError(err.message || t('stripe.error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111118] border border-white/10 rounded-2xl p-6">
                <h1 className="text-2xl font-bold mb-2">{t('stripe.title')}</h1>
                <p className="text-gray-400 text-sm mb-6">{t('stripe.paySubscription')}</p>

                <div className="space-y-3 mb-6">
                    {PLANS.map((plan) => (
                        <button
                            key={`${plan.id}-${plan.interval}`}
                            onClick={() => setSelected(plan)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${
                                selected.id === plan.id && selected.interval === plan.interval
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
                            }`}
                        >
                            <span className="font-medium">{plan.label}</span>
                            <span className="text-emerald-400 font-semibold">{plan.price}</span>
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full min-h-[56px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                    {loading ? t('stripe.processing') : t('stripe.paySubscription')}
                </button>
            </div>
        </div>
    )
}
