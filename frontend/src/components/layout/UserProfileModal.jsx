import { useState, useEffect, useRef } from 'react'
import { X, User, Mail, Phone, MessageCircle, Camera } from 'lucide-react'

export function UserProfileModal({ user, isOpen, onClose, onSave }) {
    const [form, setForm] = useState({ name: '', email: '', avatar: '', phone: '', telegram: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (isOpen && user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                avatar: user.avatar || '',
                phone: user.phone || '',
                telegram: user.telegram || '',
            })
        }
    }, [isOpen, user])

    if (!isOpen) return null

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
                }),
            })
            const data = await res.json()
            if (data.success) {
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#0f0f1a] border border-white/10 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <User size={18} className="text-[#8B5CF6]" /> Профиль
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
                    )}

                    <div className="flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-2xl font-bold text-white overflow-hidden hover:opacity-90 transition-opacity"
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
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <p className="text-xs text-gray-500">Нажмите на аватар, чтобы загрузить</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><User size={12} /> Имя</label>
                            <input
                                value={form.name}
                                onChange={handleChange('name')}
                                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#8B5CF6]/30"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Mail size={12} /> Email</label>
                            <input
                                type="email"
                                value={form.email}
                                disabled
                                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-gray-400 outline-none cursor-not-allowed"
                            />
                            <p className="text-[10px] text-gray-600 mt-1">Email меняется в разделе безопасности</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Phone size={12} /> Телефон</label>
                            <input
                                value={form.phone}
                                onChange={handleChange('phone')}
                                placeholder="+7 999 000-00-00"
                                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><MessageCircle size={12} /> Telegram</label>
                            <input
                                value={form.telegram}
                                onChange={handleChange('telegram')}
                                placeholder="@username"
                                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-sm text-[#8B5CF6] font-medium hover:bg-[#8B5CF6]/30 transition-colors disabled:opacity-50"
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
