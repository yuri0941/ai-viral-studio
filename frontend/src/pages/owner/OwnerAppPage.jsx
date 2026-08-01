import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useNotifications } from '../../hooks/useNotifications'
import { ownerApi } from '../../services/api'
import { API_URL } from '../../config'

export default function OwnerAppPage() {
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

    const handleEmergencyStop = async () => {
        if (!confirm('Остановить все OMEGA-агенты?')) return
        setEmergencyLoading(true)
        try {
            const res = await fetch(`${API_URL}/omega/emergency-stop`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            alert(res.ok ? 'Emergency Stop активирован' : 'Ошибка остановки')
        } finally {
            setEmergencyLoading(false)
        }
    }

    const handleTelegramStatus = () => {
        window.open('https://t.me/your_bot_username?start=status', '_blank')
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
                    <h1 className="text-xl font-bold">Owner App</h1>
                    <p className="text-xs text-gray-400">Command Center</p>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                )}
            </header>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-xs text-gray-400">MRR</div>
                    <div className="text-lg font-semibold text-emerald-400">${mrr.toLocaleString()}</div>
                </div>
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-xs text-gray-400">Новые</div>
                    <div className="text-lg font-semibold text-blue-400">{newUsers}</div>
                </div>
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">🧠</div>
                    <div className="text-xs text-gray-400">OMEGA</div>
                    <div className={`text-lg font-semibold ${omegaStatus === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {omegaStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
                    </div>
                </div>
                <div className="bg-[#111118] border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">🚨</div>
                    <div className="text-xs text-gray-400">Ошибки</div>
                    <div className="text-lg font-semibold text-red-400">{errors}</div>
                </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Быстрые действия</h2>
            <div className="space-y-3">
                <button
                    onClick={handleEmergencyStop}
                    disabled={emergencyLoading}
                    className="w-full min-h-[56px] bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    🛑 {emergencyLoading ? 'Остановка...' : 'Emergency Stop'}
                </button>
                <button
                    onClick={handleTelegramStatus}
                    className="w-full min-h-[56px] bg-[#111118] border border-white/10 text-white rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    📱 /status Telegram
                </button>
                <button
                    onClick={handleRedeploy}
                    className="w-full min-h-[56px] bg-[#111118] border border-white/10 text-white rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    🚀 Redeploy
                </button>
            </div>
        </div>
    )
}
