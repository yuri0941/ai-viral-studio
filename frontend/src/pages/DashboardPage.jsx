import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

function DashboardPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        aiRequests: 13,
        aiLimit: 20,
        scheduled: 5,
        published: 42,
        views: 125000,
        followers: 8500
    })

    // Данные для графика просмотров
    const viewsData = [
        { name: 'Пн', views: 12000, followers: 7200 },
        { name: 'Вт', views: 15000, followers: 7400 },
        { name: 'Ср', views: 18000, followers: 7600 },
        { name: 'Чт', views: 14000, followers: 7800 },
        { name: 'Пт', views: 22000, followers: 8000 },
        { name: 'Сб', views: 28000, followers: 8200 },
        { name: 'Вс', views: 35000, followers: 8500 },
    ]

    // Данные для графика активности
    const activityData = [
        { name: '00:00', ai: 2, posts: 0 },
        { name: '04:00', ai: 0, posts: 0 },
        { name: '08:00', ai: 5, posts: 1 },
        { name: '12:00', ai: 8, posts: 2 },
        { name: '16:00', ai: 12, posts: 1 },
        { name: '20:00', ai: 15, posts: 3 },
        { name: '23:59', ai: 13, posts: 5 },
    ]

    // Последние AI-чаты
    const recentChats = [
        { id: 1, title: 'Скрипт для TikTok о путешествиях', time: '5 мин назад', type: 'script' },
        { id: 2, title: 'Хуки для YouTube Shorts', time: '15 мин назад', type: 'hooks' },
        { id: 3, title: 'Описание для Instagram Reels', time: '1 час назад', type: 'description' },
        { id: 4, title: 'Тренды в нише "Фитнес"', time: '2 часа назад', type: 'trends' },
    ]

    // Быстрые действия
    const quickActions = [
        {
            title: 'Новый скрипт',
            desc: 'AI сгенерирует скрипт',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            ),
            action: () => navigate('/ai-chat'),
            color: 'from-[#00ff41]/20 to-[#00ff41]/5',
            borderColor: 'border-[#00ff41]/20',
            textColor: 'text-[#00ff41]'
        },
        {
            title: 'Анализ трендов',
            desc: 'Что вирусится сейчас',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            action: () => navigate('/analytics'),
            color: 'from-[#2563eb]/20 to-[#2563eb]/5',
            borderColor: 'border-[#2563eb]/20',
            textColor: 'text-[#2563eb]'
        },
        {
            title: 'Запланировать',
            desc: 'Добавить в календарь',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            action: () => navigate('/scheduler'),
            color: 'from-[#f0883e]/20 to-[#f0883e]/5',
            borderColor: 'border-[#f0883e]/20',
            textColor: 'text-[#f0883e]'
        },
        {
            title: 'Опубликовать',
            desc: 'Сразу во все сети',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            ),
            action: () => navigate('/scheduler'),
            color: 'from-purple-500/20 to-purple-500/5',
            borderColor: 'border-purple-500/20',
            textColor: 'text-purple-400'
        }
    ]

    // Форматирование чисел
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    // Приветствие по времени
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 6) return 'Доброй ночи'
        if (hour < 12) return 'Доброе утро'
        if (hour < 18) return 'Добрый день'
        return 'Добрый вечер'
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">

            <main className="lg:ml-64 min-h-screen">
                <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            {getGreeting()}, {user?.name?.split(' ')[0] || 'Создатель'}! 👋
                        </h1>
                        <p className="text-gray-400">Вот что произошло с твоим контентом сегодня</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400 text-sm">AI запросы</span>
                                <div className="w-8 h-8 rounded-lg bg-[#00ff41]/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-[#00ff41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-2xl font-black mb-1">{stats.aiRequests}<span className="text-gray-500 text-lg font-normal">/{stats.aiLimit}</span></div>
                            <div className="w-full bg-white/5 rounded-full h-1.5">
                                <div className="bg-gradient-to-r from-[#00ff41] to-[#00cc33] h-1.5 rounded-full transition-all" style={{ width: `${(stats.aiRequests / stats.aiLimit) * 100}%` }} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400 text-sm">Запланировано</span>
                                <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-2xl font-black">{stats.scheduled}</div>
                            <p className="text-xs text-gray-500 mt-1">постов на этой неделе</p>
                        </div>

                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400 text-sm">Просмотры</span>
                                <div className="w-8 h-8 rounded-lg bg-[#f0883e]/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-[#f0883e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-2xl font-black">{formatNumber(stats.views)}</div>
                            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                +12.5% за неделю
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400 text-sm">Подписчики</span>
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-2xl font-black">{formatNumber(stats.followers)}</div>
                            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                +324 сегодня
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4">Быстрые действия</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickActions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={action.action}
                                    className={`bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 text-left ${action.borderColor} hover:scale-[1.02] transition-all duration-300 group`}
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 ${action.textColor}`}>
                                        {action.icon}
                                    </div>
                                    <h3 className="font-bold mb-1 group-hover:text-white transition-colors">{action.title}</h3>
                                    <p className="text-sm text-gray-400">{action.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid lg:grid-cols-2 gap-6 mb-8">
                        {/* Views Chart */}
                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold">Просмотры и подписчики</h3>
                                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-[#00ff41]/30">
                                    <option>7 дней</option>
                                    <option>30 дней</option>
                                    <option>90 дней</option>
                                </select>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={viewsData}>
                                    <defs>
                                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="followersGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="views" stroke="#00ff41" fillOpacity={1} fill="url(#viewsGradient)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="followers" stroke="#2563eb" fillOpacity={1} fill="url(#followersGradient)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Activity Chart */}
                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold">Активность сегодня</h3>
                                <span className="text-xs text-gray-500">Последние 24 часа</span>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="ai" fill="#00ff41" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="posts" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#00ff41]" />
                                    <span className="text-sm text-gray-400">AI запросы</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#2563eb]" />
                                    <span className="text-sm text-gray-400">Публикации</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Recent AI Chats */}
                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold">Последние AI-чаты</h3>
                                <button onClick={() => navigate('/ai-chat')} className="text-sm text-[#00ff41] hover:underline">
                                    Все чаты →
                                </button>
                            </div>
                            <div className="space-y-3">
                                {recentChats.map((chat) => (
                                    <div key={chat.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-10 h-10 rounded-lg bg-[#00ff41]/10 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-[#00ff41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-[#00ff41] transition-colors">{chat.title}</p>
                                            <p className="text-xs text-gray-500">{chat.time}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 capitalize">
                                            {chat.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Posts */}
                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold">Ближайшие публикации</h3>
                                <button onClick={() => navigate('/scheduler')} className="text-sm text-[#00ff41] hover:underline">
                                    Календарь →
                                </button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { id: 1, title: 'TikTok: Топ 5 лайфхаков', time: 'Сегодня, 18:00', platform: 'TikTok', status: 'scheduled' },
                                    { id: 2, title: 'YouTube: Обзор гаджета', time: 'Завтра, 12:00', platform: 'YouTube', status: 'scheduled' },
                                    { id: 3, title: 'Instagram: Мотивация понедельника', time: 'Завтра, 09:00', platform: 'Instagram', status: 'draft' },
                                    { id: 4, title: 'Twitter: Тред о продуктивности', time: 'Чт, 15:00', platform: 'Twitter', status: 'scheduled' },
                                ].map((post) => (
                                    <div key={post.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${post.platform === 'TikTok' ? 'bg-black border border-white/10' :
                                            post.platform === 'YouTube' ? 'bg-red-500/20' :
                                                post.platform === 'Instagram' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                                                    'bg-blue-500/20'
                                            }`}>
                                            <span className="text-xs font-bold text-white">{post.platform[0]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{post.title}</p>
                                            <p className="text-xs text-gray-500">{post.time}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${post.status === 'scheduled'
                                            ? 'bg-[#00ff41]/10 text-[#00ff41]'
                                            : 'bg-yellow-500/10 text-yellow-400'
                                            }`}>
                                            {post.status === 'scheduled' ? 'Запланировано' : 'Черновик'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DashboardPage
