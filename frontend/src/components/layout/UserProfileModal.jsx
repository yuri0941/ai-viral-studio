import { useState, useEffect, useRef, useMemo } from 'react'
import { X, User, Mail, Phone, MessageCircle, Camera, Globe, Moon, Sun, Monitor } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const ROLE_LABELS = {
    owner: { label: 'Owner', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
    admin: { label: 'Admin', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
    staff: { label: 'Staff', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
    advertiser: { label: 'Advertiser', color: 'bg-purple-500/20 text-purple-500 border-purple-500/30' },
    creator: { label: 'Creator', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
    business: { label: 'Business', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
}

const THEMES = [
    { value: 'system', label: 'Системная', icon: Monitor },
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Тёмная', icon: Moon },
]

function getTimezones() {
    try {
        return Intl.supportedValuesOf('timeZone')
    } catch {
        return [
            'UTC',
            'Europe/Moscow',
            'Europe/London',
            'Europe/Berlin',
            'Europe/Paris',
            'America/New_York',
            'America/Los_Angeles',
            'America/Chicago',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Asia/Singapore',
            'Asia/Dubai',
            'Australia/Sydney',
        ]
    }
}

export function UserProfileModal({ user, isOpen, onClose, onSave }) {
    const { updateUser } = useAuth()
    const [form, setForm] = useState({
        name: '',
        email: '',
        avatar: '',
        phone: '',
        telegram: '',
        language: 'ru',
        theme: 'system',
        timezone: 'Europe/Moscow',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)
    const timezones = useMemo(getTimezones, [])

    useEffect(() => {
        if (isOpen && user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                avatar: user.avatar || '',
                phone: user.phone || '',
                telegram: user.telegram || '',
                language: user.preferences?.language || localStorage.getItem('app_language') || 'ru',
                theme: user.preferences?.theme || 'system',
                timezone: user.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
            })
        }
    }, [isOpen, user])

    const handleChange = (key) => (e) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }))
    }

    const handleAvatarClick = () => fileInputRef.current?.click()

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => setForm(prev => ({ ...prev, avatar: ev.target.result }))
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: form.name,
                    avatar: form.avatar,
                    phone: form.phone,
                    telegram: form.telegram,
                    preferences: {
                        language: form.language,
                        theme: form.theme,
                        timezone: form.timezone,
                    },
                }),
            })
            const data = await res.json()
            if (data.success) {
                updateUser(data.user)
                localStorage.setItem('app_language', form.language)
                onSave?.(data.user)
                onClose?.()
            } else {
                setError(data.message || 'Ошибка сохранения')
            }
        } catch (err) {
            setError('Ошибка сети')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const roleCfg = ROLE_LABELS[user?.role] || ROLE_LABELS.creator
    const subscriptionName = user?.subscription?.plan || 'Free'
    const subscriptionStatus = user?.subscription?.status || 'active'

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--glass)] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                        <User size={18} className="text-[var(--primary)]" /> Профиль пользователя
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {error && (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
                    )}

                    {/* Avatar + role/subscription */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-xl font-bold text-white overflow-hidden hover:opacity-90 transition-opacity shrink-0"
                        >
                            {form.avatar ? (
                                <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                form.name?.[0]?.toUpperCase() || <User size={28} />
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Camera size={18} className="text-white" />
                            </div>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                        <div className="space-y-2">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${roleCfg.color}`}>
                                {roleCfg.label}
                            </div>
                            <div className="text-sm text-[var(--text-muted)]">
                                Подписка: <span className="text-[var(--text)] font-medium">{subscriptionName}</span>
                                <span className={`ml-2 inline-block w-2 h-2 rounded-full ${subscriptionStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><User size={12} /> Имя</label>
                            <input
                                value={form.name}
                                onChange={handleChange('name')}
                                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50 transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><Mail size={12} /> Email</label>
                            <input
                                type="email"
                                value={form.email}
                                disabled
                                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)] outline-none cursor-not-allowed"
                            />
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">Меняется в разделе безопасности</p>
                        </div>

                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><Phone size={12} /> Телефон</label>
                            <input
                                value={form.phone}
                                onChange={handleChange('phone')}
                                placeholder="+7 999 000-00-00"
                                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><MessageCircle size={12} /> Telegram</label>
                            <input
                                value={form.telegram}
                                onChange={handleChange('telegram')}
                                placeholder="@username"
                                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><Globe size={12} /> Язык</label>
                                <select
                                    value={form.language}
                                    onChange={handleChange('language')}
                                    className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50 transition-colors"
                                >
                                    <option value="ru">Русский</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><Sun size={12} /> Тема</label>
                                <select
                                    value={form.theme}
                                    onChange={handleChange('theme')}
                                    className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50 transition-colors"
                                >
                                    {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-[var(--text-muted)] mb-1.5">Часовой пояс</label>
                            <select
                                value={form.timezone}
                                onChange={handleChange('timezone')}
                                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50 transition-colors"
                            >
                                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--card-hover)] transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default UserProfileModal
