import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

function RegisterForm({ onSuccess }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [consent, setConsent] = useState({
        acceptedTerms: false,
        acceptedPrivacy: false,
        acceptedConsent: false,
        isAdult: false,
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [registered, setRegistered] = useState(false)
    const [resendSeconds, setResendSeconds] = useState(60)
    const [resendLoading, setResendLoading] = useState(false)
    const { register } = useAuth()

    useEffect(() => {
        if (!registered || resendSeconds <= 0) return
        const t = setInterval(() => setResendSeconds(s => s - 1), 1000)
        return () => clearInterval(t)
    }, [registered, resendSeconds])

    const allConsentsChecked = Object.values(consent).every(Boolean)

    const handleConsentChange = (key) => (e) => {
        setConsent(prev => ({ ...prev, [key]: e.target.checked }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!allConsentsChecked) {
            setError('Примите все обязательные условия')
            return
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают')
            return
        }

        if (password.length < 6) {
            setError('Пароль минимум 6 символов')
            return
        }

        setLoading(true)

        try {
            const result = await register(name, email, password, consent)
            if (result.success) {
                setRegistered(true)
                setResendSeconds(60)
            } else {
                setError(result.message || 'Ошибка регистрации')
            }
        } catch (err) {
            setError('Ошибка сервера')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (resendSeconds > 0) return
        setResendLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/auth/send-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            })
            const data = await res.json()
            if (data.success) {
                setResendSeconds(60)
            } else {
                setError(data.message || 'Не удалось отправить письмо')
            }
        } catch (err) {
            setError('Ошибка сервера')
        } finally {
            setResendLoading(false)
        }
    }

    const checkboxClass = "w-4 h-4 rounded border border-white/20 bg-white/5 text-[#00ff41] focus:ring-[#00ff41]/30 focus:ring-offset-0"

    if (registered) {
        return (
            <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <Mail className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Письмо отправлено</h3>
                    <p className="text-sm text-gray-400">
                        Письмо отправлено на email. Проверьте почту и подтвердите регистрацию.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendSeconds > 0 || resendLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#252530] hover:bg-[#303040] text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {resendLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : resendSeconds > 0 ? (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Отправить повторно через {resendSeconds} сек
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Отправить повторно
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => onSuccess?.()}
                    className="text-sm text-[#00ff41] hover:underline"
                >
                    Продолжить без подтверждения
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="min-h-[3rem]">
                {error && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-snug">
                        {error}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1.5">Имя</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full max-w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                    placeholder="Ваше имя"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full max-w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                    placeholder="your@email.com"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1.5">Пароль</label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full max-w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                        placeholder="Минимум 6 символов"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1.5">Подтвердите пароль</label>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full max-w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                        placeholder="Повторите пароль"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <p className="text-sm text-gray-400 font-medium">Обязательные согласия</p>

                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={consent.acceptedTerms}
                        onChange={handleConsentChange('acceptedTerms')}
                        className={checkboxClass}
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">
                        Я согласен с{' '}
                        <Link to="/terms-of-service" target="_blank" className="text-[#00ff41] hover:underline">Условиями использования</Link>
                    </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={consent.acceptedPrivacy}
                        onChange={handleConsentChange('acceptedPrivacy')}
                        className={checkboxClass}
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">
                        Я согласен с{' '}
                        <Link to="/privacy-policy" target="_blank" className="text-[#00ff41] hover:underline">Политикой конфиденциальности</Link>
                    </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={consent.acceptedConsent}
                        onChange={handleConsentChange('acceptedConsent')}
                        className={checkboxClass}
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">
                        Я даю{' '}
                        <Link to="/consent" target="_blank" className="text-[#00ff41] hover:underline">Согласие на обработку ПДн</Link>
                        , включая трансграничную передачу в США/ЕС
                    </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={consent.isAdult}
                        onChange={handleConsentChange('isAdult')}
                        className={checkboxClass}
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">
                        Мне исполнилось 18 лет
                    </span>
                </label>
            </div>

            <button
                type="submit"
                disabled={loading || !allConsentsChecked}
                className="w-full py-3 px-4 rounded-xl bg-[#00ff41] text-black font-semibold hover:bg-[#00ff41]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Регистрация...' : 'Создать аккаунт'}
            </button>
        </form>
    )
}

export default RegisterForm
