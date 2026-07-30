import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

function RegisterForm({ onSuccess }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [role, setRole] = useState('creator')
    const [consent, setConsent] = useState({
        acceptedTerms: false,
        acceptedPrivacy: false,
        acceptedConsent: false,
        isAdult: false,
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()

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
            const result = await register(name, email, password, role, consent)
            if (result.success) {
                onSuccess?.()
            } else {
                setError(result.message || 'Ошибка регистрации')
            }
        } catch (err) {
            setError('Ошибка сервера')
        } finally {
            setLoading(false)
        }
    }

    const checkboxClass = "w-4 h-4 rounded border border-white/20 bg-white/5 text-[#00ff41] focus:ring-[#00ff41]/30 focus:ring-offset-0"

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm text-gray-400 mb-1">Имя</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                    placeholder="Ваше имя"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                    placeholder="your@email.com"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1">Пароль</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                    placeholder="Минимум 6 символов"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1">Подтвердите пароль</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                    placeholder="Повторите пароль"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1">Роль (только для теста)</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00ff41]/30 focus:ring-1 focus:ring-[#00ff41]/20 transition-colors"
                >
                    <option value="creator" className="bg-[#0a0a0a]">Пользователь (creator)</option>
                    <option value="admin" className="bg-[#0a0a0a]">Админ (admin)</option>
                    <option value="staff" className="bg-[#0a0a0a]">Сотрудник (staff)</option>
                    <option value="advertiser" className="bg-[#0a0a0a]">Рекламодатель (advertiser)</option>
                    <option value="owner" className="bg-[#0a0a0a]">Владелец (owner)</option>
                </select>
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
