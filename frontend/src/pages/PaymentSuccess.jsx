import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../config.js'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams()
    const paymentId = searchParams.get('paymentId')
    const [status, setStatus] = useState('loading')
    const [payment, setPayment] = useState(null)

    useEffect(() => {
        if (!paymentId) {
            setStatus('missing')
            return
        }

        let cancelled = false
        const token = localStorage.getItem('token')

        async function checkStatus() {
            try {
                const res = await fetch(`${API_BASE_URL}/payments/status?paymentId=${paymentId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                const data = await res.json()
                if (cancelled) return

                if (data.success && data.payment) {
                    setPayment(data.payment)
                    if (data.payment.status === 'succeeded') {
                        setStatus('success')
                    } else if (data.payment.status === 'pending') {
                        setStatus('pending')
                    } else {
                        setStatus(data.payment.status || 'pending')
                    }
                } else {
                    setStatus('pending')
                }
            } catch (err) {
                console.error('[PaymentSuccess]', err)
                if (!cancelled) setStatus('pending')
            }
        }

        checkStatus()
        const interval = setInterval(() => {
            if (!['success', 'canceled'].includes(status)) {
                checkStatus()
            }
        }, 5000)

        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [paymentId, status])

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#1a1a24] rounded-2xl border border-white/5 p-8 text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Проверяем оплату...</h1>
                        <p className="text-gray-400 text-sm">Пожалуйста, подождите, мы уточняем статус платежа.</p>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Ожидаем подтверждения от банка</h1>
                        <p className="text-gray-400 text-sm">Это может занять несколько минут. Страница обновляется автоматически.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Оплата прошла успешно!</h1>
                        <p className="text-gray-400 text-sm mb-4">Подписка активна. Спасибо за покупку.</p>
                        {payment && (
                            <div className="text-sm text-gray-500 mb-6">
                                План: <span className="text-white capitalize">{payment.planId}</span><br />
                                Сумма: <span className="text-white">{payment.amount} {payment.currency}</span>
                            </div>
                        )}
                        <a href="/dashboard" className="inline-block px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors">
                            Перейти в Dashboard
                        </a>
                    </>
                )}

                {status === 'canceled' && (
                    <>
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Платёж отменён</h1>
                        <p className="text-gray-400 text-sm mb-6">Попробуйте оформить подписку снова.</p>
                        <a href="/settings" className="inline-block px-6 py-2.5 bg-[#252530] hover:bg-[#303040] text-white font-medium rounded-lg transition-colors">
                            К тарифам
                        </a>
                    </>
                )}

                {status === 'missing' && (
                    <>
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">ID платежа не указан</h1>
                        <p className="text-gray-400 text-sm mb-6">Вернитесь в настройки и попробуйте снова.</p>
                        <a href="/settings" className="inline-block px-6 py-2.5 bg-[#252530] hover:bg-[#303040] text-white font-medium rounded-lg transition-colors">
                            К настройкам
                        </a>
                    </>
                )}
            </div>
        </div>
    )
}
