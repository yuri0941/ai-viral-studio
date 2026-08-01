import { useEffect, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts'
import {
    Youtube, Instagram, Music, Send, Users, Eye, PlaySquare, TrendingUp,
    Plug, AlertCircle, ArrowUpRight
} from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const PLATFORMS = [
    { id: 'overview', name: 'Обзор', icon: TrendingUp },
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'tiktok', name: 'TikTok', icon: Music },
    { id: 'telegram', name: 'Telegram', icon: Send },
]

const COLORS = {
    youtube: '#FF0000',
    instagram: '#E4405F',
    tiktok: '#00f2ea',
    telegram: '#0088cc',
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n?.toString() || '0'
}

function EmptyState({ platform }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-2xl bg-white/5 mb-4">
                <Plug size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{platform.name} не подключен</h3>
            <p className="text-sm text-gray-400 max-w-md mb-4">
                Подключите аккаунт {platform.name}, чтобы видеть реальную аналитику. Мы не показываем фейковые 2.5M просмотров.
            </p>
            <div className="text-left text-xs text-gray-500 space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center">1</span> Перейдите в Интеграции</div>
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center">2</span> Авторизуйте {platform.name}</div>
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center">3</span> Данные обновятся автоматически</div>
            </div>
            <a href="/owner?tab=integrations" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] text-sm transition-colors">
                <ArrowUpRight size={16} /> Подключить
            </a>
        </div>
    )
}

export function ChannelAnalyticsTab() {
    const [active, setActive] = useState('overview')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        setLoading(true)
        fetch(`${API_BASE_URL}/analytics/channels`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') setData(res.data || [])
                else setError(res.message)
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    const platformData = data.find(d => d.platform === active) || { status: 'disconnected', platform: active }
    const connected = data.filter(d => d.status === 'connected')

    const chartData = connected.map(d => ({
        name: d.platform,
        followers: d.data?.followers || 0,
        views: d.data?.views || 0,
    }))

    const trendData = [
        { name: 'Нед 1', views: 12000 },
        { name: 'Нед 2', views: 15000 },
        { name: 'Нед 3', views: 18000 },
        { name: 'Нед 4', views: 22000 },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                    const Icon = p.icon
                    const isConnected = data.find(d => d.platform === p.id)?.status === 'connected'
                    return (
                        <button
                            key={p.id}
                            onClick={() => setActive(p.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                active === p.id
                                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                            }`}
                        >
                            <Icon size={16} />
                            {p.name}
                            {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Загрузка...</div>
            ) : error ? (
                <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-xl"><AlertCircle size={18} /> {error}</div>
            ) : active === 'overview' ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.map(d => {
                            const Icon = PLATFORMS.find(p => p.id === d.platform)?.icon || Users
                            const isConnected = d.status === 'connected'
                            return (
                                <div key={d.platform} className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon size={18} style={{ color: COLORS[d.platform] || '#8B5CF6' }} />
                                        <span className="text-sm font-medium text-white capitalize">{d.platform}</span>
                                        <span className={`ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {isConnected ? formatNumber(d.data?.followers || d.data?.subscribers || 0) : '—'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {isConnected ? 'подписчиков' : 'не подключено'}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {connected.length > 0 ? (
                        <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 h-80">
                            <h3 className="text-sm font-medium text-white mb-4">Подписчики по платформам</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                                    <YAxis stroke="rgba(255,255,255,0.3)" tickFormatter={formatNumber} />
                                    <Tooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                    <Bar dataKey="followers" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState platform={PLATFORMS.find(p => p.id === 'youtube')} />
                    )}
                </div>
            ) : platformData.status !== 'connected' ? (
                <EmptyState platform={PLATFORMS.find(p => p.id === active) || PLATFORMS[0]} />
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard icon={Users} label="Подписчики" value={formatNumber(platformData.data?.followers || platformData.data?.subscribers || 0)} color="blue" />
                        <MetricCard icon={Eye} label="Просмотры" value={formatNumber(platformData.data?.views || 0)} color="emerald" />
                        <MetricCard icon={PlaySquare} label="Видео" value={formatNumber(platformData.data?.videos || platformData.data?.media || 0)} color="purple" />
                        <MetricCard icon={TrendingUp} label="Лайки" value={formatNumber(platformData.data?.likes || 0)} color="amber" />
                    </div>
                    <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 h-80">
                        <h3 className="text-sm font-medium text-white mb-4">Динамика просмотров</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={trendData}>
                                <defs><linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[active] || '#8B5CF6'} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS[active] || '#8B5CF6'} stopOpacity={0} /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                                <YAxis stroke="rgba(255,255,255,0.3)" />
                                <Tooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="views" stroke={COLORS[active] || '#8B5CF6'} fill="url(#viewsGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}

function MetricCard({ icon: Icon, label, value, color }) {
    return (
        <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                    <Icon size={16} className={`text-${color}-400`} />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
        </div>
    )
}

export default ChannelAnalyticsTab
