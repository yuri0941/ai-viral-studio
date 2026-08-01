import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Turnstile } from '@marsidev/react-turnstile'

function LoginForm({ onSuccess }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    // Turnstile is temporarily disabled on non-Cloudflare Pages domains
    const isTurnstileEnabled = typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')

    useEffect(() => {
        if (!isTurnstileEnabled) {
            setTurnstileToken('disabled')
        }
    }, [isTurnstileEnabled])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (isTurnstileEnabled && !turnstileToken) {
            setError('Пройдите проверку Turnstile')
            return
        }

        setLoading(true)

        try {
            const result = await login(email, password, turnstileToken || 'disabled')
            if (result.success) {
                onSuccess?.()
                setTimeout(() => {
                    navigate('/redirect')
                }, 100)
            } else {
                setError(result.message || 'Ошибка входа')
            }
        } catch (err) {
            setError('Ошибка сервера')
        } finally {
            setLoading(false)
        }
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
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full max-w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
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
                        className="w-full max-w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder="••••••••"
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

            {isTurnstileEnabled && (
                <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAECRR8t_7EdD8onI'}
                    onSuccess={setTurnstileToken}
                    className="mx-auto"
                />
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3 disabled:opacity-50"
            >
                {loading ? '⏳ Вход...' : '🔐 Войти'}
            </button>
        </form>
    )
}

export default LoginForm