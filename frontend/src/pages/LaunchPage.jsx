import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { API_URL } from '../config.js'
import { Rocket, Mail, Twitter, Linkedin, Users, Clock } from 'lucide-react'

const LAUNCH_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

function useCountdown(target) {
    const [diff, setDiff] = useState(target - Date.now())
    useEffect(() => {
        const id = setInterval(() => setDiff(Math.max(0, target - Date.now())), 1000)
        return () => clearInterval(id)
    }, [target])
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((diff / (1000 * 60)) % 60)
    const seconds = Math.floor((diff / 1000) % 60)
    return { days, hours, minutes, seconds }
}

export function LaunchPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [count, setCount] = useState(0)
    const countdown = useCountdown(LAUNCH_DATE)
    const referredBy = searchParams.get('ref')

    useEffect(() => {
        fetch(`${API_URL}/launch/waitlist/count`).then(r => r.json()).then(d => {
            if (d.success) setCount(d.data.count)
        }).catch(() => {})
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email) return
        try {
            setLoading(true)
            const res = await fetch(`${API_URL}/launch/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, referredBy, utm: { source: 'producthunt' } })
            })
            const data = await res.json()
            if (data.success) {
                setSuccess(true)
                setCount(data.total || count + 1)
            } else {
                toast.error(data.message || 'Error')
            }
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const shareText = encodeURIComponent('AI Viral Studio is launching on Product Hunt! Join the waitlist: ')
    const shareUrl = encodeURIComponent(window.location.origin + '/launch')

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/10 via-transparent to-[#00ff41]/10 pointer-events-none" />
            <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-xs">
                    <Rocket className="w-3.5 h-3.5" /> Product Hunt Launch Kit
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold">{t('launch.title')}</h1>
                <p className="text-gray-400">{t('launch.subtitle')}</p>

                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Days', value: countdown.days },
                        { label: 'Hours', value: countdown.hours },
                        { label: 'Minutes', value: countdown.minutes },
                        { label: 'Seconds', value: countdown.seconds },
                    ].map((u, i) => (
                        <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                            <div className="text-2xl font-bold text-[#00ff41]">{String(u.value).padStart(2, '0')}</div>
                            <div className="text-[10px] text-gray-500 uppercase mt-1">{u.label}</div>
                        </div>
                    ))}
                </div>

                {success ? (
                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4">
                        ✅ {t('launch.notifyButton')} — {count} {t('launch.waitlist')}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={t('launch.emailPlaceholder')}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#8b5cf6]"
                            required
                        />
                        <button type="submit" disabled={loading} className="px-5 py-3 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                            <Mail className="w-4 h-4" /> {loading ? '...' : t('launch.notifyButton')}
                        </button>
                    </form>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" /> {count} {t('launch.waitlist')}
                </div>

                <div className="flex items-center justify-center gap-3">
                    <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-colors">
                        <Twitter className="w-4 h-4" /> {t('launch.shareTwitter')}
                    </a>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-colors">
                        <Linkedin className="w-4 h-4" /> {t('launch.shareLinkedIn')}
                    </a>
                </div>
            </div>
        </div>
    )
}

export default LaunchPage
