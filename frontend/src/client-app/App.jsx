import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboardData'
import { useNotifications } from '../hooks/useNotifications'
import {
    Home, FileText, BarChart2, MessageCircle, Settings,
    RefreshCw, Plus, TrendingUp, Eye, Heart, Share2,
    Calendar, Clock, Zap, AlertTriangle, CheckCircle
} from 'lucide-react'

const TABS = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'posts', label: 'Посты', icon: FileText },
    { id: 'stats', label: 'Статистика', icon: BarChart2 },
    { id: 'chat', label: 'Чат', icon: MessageCircle },
    { id: 'settings', label: 'Настройки', icon: Settings },
]

function usePullToRefresh(onRefresh) {
    const ref = useRef(null)
    const startY = useRef(0)
    const [pulling, setPulling] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const onTouchStart = (e) => { startY.current = e.touches[0].clientY; setPulling(false) }
        const onTouchMove = (e) => {
            const y = e.touches[0].clientY
            if (el.scrollTop === 0 && y - startY.current > 60) {
                setPulling(true)
            }
        }
        const onTouchEnd = () => {
            if (pulling) {
                setPulling(false)
                onRefresh?.()
            }
        }
        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: true })
        el.addEventListener('touchend', onTouchEnd)
        return () => {
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', onTouchEnd)
        }
    }, [onRefresh, pulling])

    return { ref, pulling }
}

function StatCard({ icon: Icon, label, value, color }) {
    const colors = {
        emerald: 'text-emerald-400 bg-emerald-500/10',
        blue: 'text-blue-400 bg-blue-500/10',
        purple: 'text-purple-400 bg-purple-500/10',
        amber: 'text-amber-400 bg-amber-500/10',
        red: 'text-red-400 bg-red-500/10',
    }
    return (
        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${colors[color] || colors.blue}`}>
                <Icon size={16} />
            </div>
            <div className="text-xs text-gray-400">{label}</div>
            <div className="text-lg font-semibold text-white">{value}</div>
        </div>
    )
}

export default function ClientApp() {
    const { user, isAuthenticated, loading } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('home')
    const [refreshTick, setRefreshTick] = useState(0)
    const { data: overview } = useDashboardData('overview')
    const { notifications, unreadCount } = useNotifications()

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login')
        }
    }, [loading, isAuthenticated, navigate])

    const refresh = () => setRefreshTick(t => t + 1)
    const { ref: pullRef, pulling } = usePullToRefresh(refresh)

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
                <div className="animate-spin w-10 h-10 border-2 border-[#00ff41] border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!isAuthenticated) return null

    const demoPosts = [
        { id: 1, title: '3 мифа о вашей нише', platform: 'TikTok', views: 12400, likes: 890, shares: 120, status: 'viral' },
        { id: 2, title: 'POV: первый вирусный ролик', platform: 'Reels', views: 8200, likes: 540, shares: 67, status: 'trending' },
        { id: 3, title: 'Как я набрал 10K за месяц', platform: 'Shorts', views: 5600, likes: 320, shares: 45, status: 'stable' },
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
            <main ref={pullRef} className="flex-1 overflow-y-auto p-4 pb-28">
                {pulling && (
                    <div className="text-center py-3 text-emerald-400 text-sm">
                        <RefreshCw size={16} className="animate-spin inline mr-2" /> Обновление...
                    </div>
                )}

                {activeTab === 'home' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-bold">Привет, {user?.name?.split(' ')[0] || 'Creator'} 👋</h1>
                                <p className="text-xs text-gray-400">Сводка за сегодня</p>
                            </div>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard icon={Eye} label="Просмотры" value="12.4K" color="blue" />
                            <StatCard icon={Heart} label="Лайки" value="890" color="red" />
                            <StatCard icon={Share2} label="Шеры" value="120" color="emerald" />
                            <StatCard icon={TrendingUp} label="Viral Score" value="84" color="purple" />
                        </div>
                        <button
                            onClick={() => navigate('/ai-chat')}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center justify-center gap-2 min-h-[48px]"
                        >
                            <Plus size={18} /> Создать пост с OMEGA
                        </button>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5">
                            <div className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Zap size={16} className="text-amber-400" /> Рекомендация OMEGA
                            </div>
                            <p className="text-xs text-gray-400">Лучшее время публикации сегодня: 18:00–20:00. Тема: «5 ошибок в монтаже Shorts».</p>
                        </div>
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">Мои посты</h1>
                        {demoPosts.map(post => (
                            <div key={post.id} className="p-4 rounded-2xl bg-[#111118] border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400">{post.platform}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        post.status === 'viral' ? 'bg-emerald-500/20 text-emerald-400' :
                                        post.status === 'trending' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>{post.status}</span>
                                </div>
                                <div className="text-sm font-medium text-white mb-3">{post.title}</div>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
                                    <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                                    <span className="flex items-center gap-1"><Share2 size={12} /> {post.shares}</span>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => navigate('/scheduler')}
                            className="w-full py-3 rounded-2xl bg-[#111118] text-white text-sm font-medium flex items-center justify-center gap-2 min-h-[48px]"
                        >
                            <Calendar size={16} /> Открыть планировщик
                        </button>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">Статистика</h1>
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard icon={Eye} label="За неделю" value="84.2K" color="blue" />
                            <StatCard icon={Heart} label="Лайков" value="6.1K" color="red" />
                            <StatCard icon={Share2} label="Шеров" value="892" color="emerald" />
                            <StatCard icon={TrendingUp} label="Рост" value="+24%" color="purple" />
                        </div>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5">
                            <div className="text-sm font-medium mb-3 flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Активность по часам</div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 21 }).map((_, i) => {
                                    const h = Math.floor(Math.random() * 50) + 10
                                    return <div key={i} className="rounded-sm bg-blue-500/30" style={{ height: `${h}px` }} />
                                })}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/analytics')}
                            className="w-full py-3 rounded-2xl bg-[#111118] text-white text-sm font-medium min-h-[48px]"
                        >
                            Подробная аналитика
                        </button>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">OMEGA Chat</h1>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5">
                            <p className="text-sm text-gray-400 mb-3">Напишите OMEGA — она поможет с идеями, скриптами и аналитикой.</p>
                            <button
                                onClick={() => navigate('/ai-chat')}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium min-h-[48px]"
                            >
                                Открыть чат
                            </button>
                        </div>
                        <div className="space-y-2">
                            {['Сгенерировать хук', 'Сделать пост про кофейню', 'Анализ трендов'].map((q, i) => (
                                <button key={i} onClick={() => navigate('/ai-chat')} className="w-full p-3 rounded-xl bg-[#111118] text-left text-sm text-gray-300">
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">Настройки</h1>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5 text-center">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-3 flex items-center justify-center text-2xl font-bold">
                                {user?.name?.charAt(0) || 'C'}
                            </div>
                            <div className="text-lg font-semibold text-white">{user?.name || 'Creator'}</div>
                            <div className="text-xs text-gray-400">{user?.email}</div>
                            <div className="text-xs text-emerald-400 mt-1">role: {user?.role}</div>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => navigate('/settings')} className="w-full p-3 rounded-xl bg-[#111118] text-sm text-white flex items-center justify-between min-h-[44px]">
                                Редактировать профиль <Settings size={16} className="text-gray-500" />
                            </button>
                            <button onClick={() => navigate('/dashboard')} className="w-full p-3 rounded-xl bg-[#111118] text-sm text-white flex items-center justify-between min-h-[44px]">
                                Полная версия <TrendingUp size={16} className="text-gray-500" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-md border-t border-white/5 pb-safe z-50">
                <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
                    {TABS.map(t => {
                        const Icon = t.icon
                        const active = activeTab === t.id
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${active ? 'text-[#8B5CF6]' : 'text-gray-500'}`}
                                aria-label={t.label}
                            >
                                <Icon size={22} />
                                <span className="text-[10px] font-medium">{t.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
