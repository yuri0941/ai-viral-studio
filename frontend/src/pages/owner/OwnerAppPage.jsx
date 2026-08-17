import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useNotifications } from '../../hooks/useNotifications'
import { ownerApi } from '../../services/api'
import { API_URL } from '../../config'
import { ownerBotUrl } from '../../config/bots.js'
import toast from 'react-hot-toast'

export default function OwnerAppPage() {
    const { t } = useTranslation()
    const { user, isAuthenticated, loading } = useAuth()
    const navigate = useNavigate()
    const { data: overview, isLoading: overviewLoading } = useDashboardData('overview')
    const { notifications, unreadCount } = useNotifications()
    const [omegaStatus, setOmegaStatus] = useState('checking')
    const [emergencyLoading, setEmergencyLoading] = useState(false)

    useEffect(() => {
        if (!loading && (!isAuthenticated || user?.role !== 'owner')) {
            navigate('/')
        }
    }, [loading, isAuthenticated, user, navigate])

    useEffect(() => {
        ownerApi.agents().then(() => setOmegaStatus('online')).catch(() => setOmegaStatus('offline'))
    }, [])

    const [emergencyStopped, setEmergencyStopped] = useState(false)

    useEffect(() => {
        fetch(`${API_URL}/admin/emergency-status`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(r => r.json())
            .then(data => setEmergencyStopped(!!data?.emergencyStop))
            .catch(() => {})
    }, [])

    const handleEmergencyStop = async () => {
        if (!confirm(t('ownerApp.emergencyConfirm'))) return
        setEmergencyLoading(true)
        try {
            const res = await fetch(`${API_URL}/admin/emergency-stop`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            if (res.ok) setEmergencyStopped(true)
            if (res.ok) toast.success(t('ownerApp.emergencyActivated'))
            else toast.error(t('ownerApp.emergencyError'))
        } finally {
            setEmergencyLoading(false)
        }
    }

    const handleEmergencyResume = async () => {
        const pin = window.prompt('Введите PIN-код для снятия Emergency Stop:')
        if (!pin) return
        setEmergencyLoading(true)
        try {
            const res = await fetch(`${API_URL}/admin/emergency-resume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ pin }),
            })
            if (res.ok) setEmergencyStopped(false)
            if (res.ok) toast.success('Emergency Stop снят')
            else toast.error('Неверный PIN-код или ошибка сервера')
        } finally {
            setEmergencyLoading(false)
        }
    }

    const handleTelegramStatus = () => {
        window.open(ownerBotUrl('status'), '_blank')
    }

    const handleRedeploy = () => {
        window.open('https://dashboard.render.com', '_blank')
    }

    if (loading || overviewLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
                <div className="animate-spin w-10 h-10 border-2 border-[#00ff41] border-t-transparent rounded-full" />
            </div>
        )
    }

    const mrr = overview?.mrr ?? 0
    const newUsers = overview?.newUsers ?? 0
    const errors = notifications.filter(n => n.type === 'error' || n.title?.includes('ошибка')).length

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-4 pb-8">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold">{t('ownerApp.title')}</h1>
                    <p className="text-xs text-gray-400">{t('ownerApp.subtitle')}</p>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                )}
            </header>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-xs text-gray-400">{t('ownerApp.mrr')}</div>
                    <div className="text-lg font-semibold text-emerald-400">${mrr.toLocaleString()}</div>
                </div>
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-xs text-gray-400">{t('ownerApp.newUsers')}</div>
                    <div className="text-lg font-semibold text-blue-400">{newUsers}</div>
                </div>
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">🧠</div>
                    <div className="text-xs text-gray-400">{t('ownerApp.omegaStatus')}</div>
                    <div className={`text-lg font-semibold ${omegaStatus === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {omegaStatus === 'online' ? t('ownerApp.online') : t('ownerApp.offline')}
                    </div>
                </div>
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">🚨</div>
                    <div className="text-xs text-gray-400">{t('ownerApp.errors')}</div>
                    <div className="text-lg font-semibold text-red-400">{errors}</div>
                </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('ownerApp.quickActions')}</h2>
            <div className="space-y-3">
                <button
                    onClick={emergencyStopped ? handleEmergencyResume : handleEmergencyStop}
                    disabled={emergencyLoading}
                    className={`w-full min-h-[56px] rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 ${
                        emergencyStopped
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}
                >
                    {emergencyStopped ? '▶️' : '🛑'}
                    {emergencyLoading ? t('ownerApp.stopping') : emergencyStopped ? 'Возобновить OMEGA (PIN)' : t('ownerApp.emergencyStop')}
                </button>
                <button
                    onClick={handleTelegramStatus}
                    className="w-full min-h-[56px] bg-[#111118] border border-white/10 text-white rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    📱 {t('ownerApp.telegramStatus')}
                </button>
                <button
                    onClick={handleRedeploy}
                    className="w-full min-h-[56px] bg-[#111118] border border-white/10 text-white rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    🚀 {t('ownerApp.redeploy')}
                </button>
            </div>
        </div>
    )
}
