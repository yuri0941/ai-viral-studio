import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config.js'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams()
    const plan = searchParams.get('plan')
    const navigate = useNavigate()
    const [status, setStatus] = useState('loading')
    const [subscription, setSubscription] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            setStatus('missing')
            return
        }

        let cancelled = false
        async function verify() {
            try {
                const res = await fetch(`${API_BASE_URL}/subscriptions/current`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                if (cancelled) return
                if (data.success && data.subscription) {
                    setSubscription(data.subscription)
                    if (data.subscription.status === 'active' || data.subscription.status === 'trialing') {
                        setStatus('success')
                    } else {
                        setStatus('pending')
                    }
                } else {
                    setStatus('pending')
                }
            } catch (err) {
                console.error('[PaymentSuccess]', err)
                if (!cancelled) setStatus('pending')
            }
        }

        verify()
        const interval = setInterval(() => {
            if (status === 'loading' || status === 'pending') verify()
        }, 5000)

        const timeout = setTimeout(() => {
            if (status === 'loading') setStatus('pending')
        }, 3000)

        return () => {
            cancelled = true
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [status])

    const goToDashboard = () => navigate('/dashboard')

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#1a1a24] rounded-2xl border border-white/5 p-8 text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Проверяем оплату...</h1>
                        <p className="text-gray-400 text-sm">Пожалуйста, подождите, мы активируем вашу подписку.</p>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Ожидаем подтверждения</h1>
                        <p className="text-gray-400 text-sm mb-4">Платёж обрабатывается. Обычно это занимает до нескольких минут.</p>
                        <button onClick={goToDashboard} className="inline-block px-6 py-2.5 bg-[#252530] hover:bg-[#303040] text-white font-medium rounded-lg transition-colors">
                            Перейти в кабинет
                        </button>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-green-400 mb-2">Оплата прошла успешно! ✅</h1>
                        <p className="text-gray-400 text-sm mb-4">Ваш тариф: <b className="text-white">{plan?.toUpperCase() || subscription?.plan?.toUpperCase() || '—'}</b></p>
                        <p className="text-gray-400 text-sm mb-6">Подписка активна на 30 дней. Спасибо за покупку!</p>
                        <button onClick={goToDashboard} className="inline-block px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors">
                            Перейти в кабинет
                        </button>
                    </>
                )}

                {status === 'missing' && (
                    <>
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Не удалось проверить оплату</h1>
                        <p className="text-gray-400 text-sm mb-6">Войдите в аккаунт, чтобы увидеть статус подписки.</p>
                        <button onClick={() => navigate('/login')} className="inline-block px-6 py-2.5 bg-[#252530] hover:bg-[#303040] text-white font-medium rounded-lg transition-colors">
                            Войти
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
