import { useState, useEffect } from 'react'
import { launchApi } from '../../services/api.js'

const NICHES = [
    { value: 'coffee', label: 'Кофейня' },
    { value: 'beauty', label: 'Бьюти' },
    { value: 'it', label: 'IT' },
    { value: 'auto', label: 'Авто' },
    { value: 'clothing', label: 'Одежда' },
    { value: 'food', label: 'Еда' },
    { value: 'other', label: 'Другое' },
]

const EST_DAYS_PER_WAVE = 7

function WaitlistSection({ onScrollToWaitlist }) {
    const [email, setEmail] = useState('')
    const [niche, setNiche] = useState('')
    const [businessSize, setBusinessSize] = useState('')
    const [status, setStatus] = useState('idle') // idle | loading | success | error
    const [message, setMessage] = useState('')
    const [result, setResult] = useState(null)
    const [referralInput, setReferralInput] = useState('')
    const [referralStatus, setReferralStatus] = useState('idle')
    const [boostStatus, setBoostStatus] = useState({ telegram: 'idle', tiktok: 'idle' })

    useEffect(() => {
        const saved = localStorage.getItem('omega_waitlist_email')
        if (saved) setEmail(saved)
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !niche) return
        setStatus('loading')
        try {
            const res = await launchApi.joinWaitlist({ email, niche, businessSize, source: 'prelaunch_fomo' })
            setResult(res)
            setStatus('success')
            localStorage.setItem('omega_waitlist_email', email)
            const daysLeft = Math.max(1, Math.ceil((res.position || 1) / 100) * EST_DAYS_PER_WAVE)
            setMessage(`Вы № ${res.position || res.total} в очереди. Осталось ~${daysLeft} дней`)
        } catch (err) {
            setStatus('error')
            setMessage(err.message || 'Ошибка при регистрации')
        }
    }

    const applyReferral = async () => {
        if (!referralInput || !email) return
        setReferralStatus('loading')
        try {
            const res = await launchApi.applyReferral(email, referralInput)
            setMessage(`+${50} мест! Новая позиция: ${res.data.position}`)
            setReferralStatus('success')
        } catch (err) {
            setReferralStatus('error')
        }
    }

    const applyBoost = async (action) => {
        if (!email || boostStatus[action] !== 'idle') return
        setBoostStatus(prev => ({ ...prev, [action]: 'loading' }))
        try {
            const res = await launchApi.boost(email, action)
            const points = action === 'telegram' ? 20 : 15
            setMessage(`+${points} мест! Позиция: ${res.data.position}`)
            setBoostStatus(prev => ({ ...prev, [action]: 'success' }))
        } catch (err) {
            setBoostStatus(prev => ({ ...prev, [action]: 'error' }))
        }
    }

    const isTop100 = result?.position && result.position <= 100

    return (
        <section id="waitlist" className="py-24 relative border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="glass-card p-8 md:p-12 rounded-3xl border-[#00ff41]/10">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-5xl font-black mb-4">
                            Хочешь <span className="gradient-text">первым</span> получить доступ?
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Встань в очередь на бета-запуск. Чем выше позиция — тем больше бонусов.
                        </p>
                    </div>

                    {status === 'success' && isTop100 && (
                        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 text-center">
                            <div className="text-2xl font-black text-yellow-400 mb-1">Founding Member</div>
                            <p className="text-yellow-200/80 text-sm">Ты в топ-100! Пожизненный доступ с -30% к любому тарифу.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <input
                                type="email"
                                required
                                placeholder="Ваш email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/50"
                            />
                            <select
                                required
                                value={niche}
                                onChange={e => setNiche(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00ff41]/50"
                            >
                                <option value="" className="bg-[#0a0a0f]">Выберите нишу</option>
                                {NICHES.map(n => (
                                    <option key={n.value} value={n.value} className="bg-[#0a0a0f]">{n.label}</option>
                                ))}
                            </select>
                        </div>

                        <select
                            value={businessSize}
                            onChange={e => setBusinessSize(e.target.value)}
                            className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00ff41]/50"
                        >
                            <option value="" className="bg-[#0a0a0f]">Размер бизнеса (необязательно)</option>
                            <option value="solo" className="bg-[#0a0a0f]">Соло / блогер</option>
                            <option value="small" className="bg-[#0a0a0f]">Малый бизнес</option>
                            <option value="medium" className="bg-[#0a0a0f]">Средний бизнес</option>
                            <option value="enterprise" className="bg-[#0a0a0f]">Корпорация</option>
                        </select>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full btn btn-primary text-lg py-4 disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Добавляем...' : 'Встать в очередь'}
                        </button>
                    </form>

                    {status === 'success' && (
                        <div className="mt-10 max-w-xl mx-auto space-y-6">
                            <div className="p-6 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 text-center">
                                <div className="text-3xl font-black text-[#00ff41] mb-2">{message}</div>
                                {result?.referralCode && (
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-400 mb-2">Ваша реферальная ссылка:</p>
                                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                            <code className="text-[#00ff41] font-mono">{result.referralCode}</code>
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard.writeText(`${window.location.origin}?ref=${result.referralCode}`)}
                                                className="text-xs text-gray-400 hover:text-white"
                                            >
                                                Копировать
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl glass border border-white/10">
                                    <h4 className="font-bold mb-2">Пригласи друга</h4>
                                    <p className="text-sm text-gray-400 mb-3">Введи чужой реферальный код и получи +50 мест.</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={referralInput}
                                            onChange={e => setReferralInput(e.target.value)}
                                            placeholder="OMEGA..."
                                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={applyReferral}
                                            disabled={referralStatus !== 'idle'}
                                            className="px-3 py-2 rounded-lg bg-[#00ff41]/20 text-[#00ff41] text-sm font-medium hover:bg-[#00ff41]/30 disabled:opacity-50"
                                        >
                                            +50
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl glass border border-white/10 space-y-3">
                                    <h4 className="font-bold">Ускорь очередь</h4>
                                    <button
                                        type="button"
                                        onClick={() => applyBoost('telegram')}
                                        disabled={boostStatus.telegram !== 'idle'}
                                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                                    >
                                        <span>Подписаться на Telegram</span>
                                        <span className="text-[#00ff41]">+20</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyBoost('tiktok')}
                                        disabled={boostStatus.tiktok !== 'idle'}
                                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                                    >
                                        <span>Подписаться на TikTok</span>
                                        <span className="text-[#00ff41]">+15</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <p className="mt-4 text-center text-red-400 text-sm">{message}</p>
                    )}
                </div>
            </div>
        </section>
    )
}

export default WaitlistSection
