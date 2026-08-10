import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useNotifications } from '../../hooks/useNotifications'
import { ownerApi, request } from '../../services/api'
import toast from 'react-hot-toast'
import {
    LayoutDashboard, Brain, Users, CheckCircle, User, Mic,
    FileText, AlertTriangle, Zap, TrendingUp, Activity, Clock,
    ChevronRight, Share2, RefreshCw, Check, X, Edit3, Menu, Download
} from 'lucide-react'
import { PWAInstallButton } from '../../components/pwa/PWAInstallButton'

const TABS = [
    { id: 'command', label: 'Обзор', icon: LayoutDashboard },
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'approvals', label: 'Утверд.', icon: CheckCircle },
    { id: 'omega', label: 'OMEGA', icon: Brain },
    { id: 'profile', label: 'Профиль', icon: User },
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

export default function OwnerApp() {
    const { user, isAuthenticated, loading } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('command')
    const [refreshTick, setRefreshTick] = useState(0)
    const { data: overview } = useDashboardData('overview')
    const { data: team } = useDashboardData('team')
    const { data: agents } = useDashboardData('agents')
    const { notifications, unreadCount, markRead } = useNotifications()
    const [omegaStatus, setOmegaStatus] = useState('checking')
    const [emergencyTaps, setEmergencyTaps] = useState(0)
    const [listening, setListening] = useState(false)
    const [voiceText, setVoiceText] = useState('')
    const [approvals, setApprovals] = useState([])

    useEffect(() => {
        if (!loading && (!isAuthenticated || user?.role !== 'owner')) {
            navigate('/')
        }
    }, [loading, isAuthenticated, user, navigate])

    useEffect(() => {
        ownerApi.agents().then(() => setOmegaStatus('online')).catch(() => setOmegaStatus('offline'))
    }, [refreshTick])

    useEffect(() => {
        const pending = notifications.filter(n => n.requiresApproval && !n.read).slice(0, 10).map(n => ({
            id: n.id,
            title: n.title || 'OMEGA запрос',
            body: n.message || 'Требуется ваше решение',
            action: n.action || 'publish',
            status: 'pending',
        }))
        setApprovals(pending)
    }, [notifications])

    const refresh = () => setRefreshTick(t => t + 1)
    const { ref: pullRef, pulling } = usePullToRefresh(refresh)

    const handleEmergency = () => {
        const now = Date.now()
        setEmergencyTaps(t => {
            if (t === 0) {
                setTimeout(() => setEmergencyTaps(0), 1500)
                return 1
            }
            if (t === 1) {
                if (confirm('Активировать Emergency Stop? Все AI-операции будут остановлены.')) {
                    request('/omega/emergency-stop', { method: 'POST' }).catch(() => {})
                    toast.success('Emergency Stop активирован')
                }
                return 0
            }
            return t
        })
    }

    const handleApproval = (id, decision) => {
        setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: decision } : a))
        markRead?.(id)
        setTimeout(() => setApprovals(prev => prev.filter(a => a.id !== id)), 400)
    }

    const startVoice = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) return toast.error('Голосовой ввод не поддерживается')
        const rec = new SR()
        rec.lang = 'ru-RU'
        rec.onstart = () => setListening(true)
        rec.onend = () => setListening(false)
        rec.onresult = (e) => {
            const text = e.results[0][0].transcript
            setVoiceText(text)
            if (text.toLowerCase().includes('omega')) navigate('/ai-chat')
        }
        rec.start()
    }

    if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white"><div className="animate-spin w-10 h-10 border-2 border-[#00ff41] border-t-transparent rounded-full" /></div>

    const mrr = overview?.mrr ?? 0
    const newUsers = overview?.newUsers ?? 0
    const errors = notifications.filter(n => n.type === 'error').length
    const onlineTeam = (team?.staff || []).filter(s => s.status === 'active').length
    const activeAgents = (agents?.agents || []).filter(a => a.status === 'active').length

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
            <main ref={pullRef} className="flex-1 overflow-y-auto p-4 pb-24">
                {pulling && (
                    <div className="text-center py-3 text-emerald-400 text-sm">
                        <RefreshCw size={16} className="animate-spin inline mr-2" /> Обновление...
                    </div>
                )}

                {activeTab === 'command' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-bold">Command Center</h1>
                                <p className="text-xs text-gray-400">Сводка всего проекта</p>
                            </div>
                            {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Card icon={TrendingUp} label="MRR" value={`$${mrr.toLocaleString()}`} color="emerald" />
                            <Card icon={Users} label="Новые" value={newUsers} color="blue" />
                            <Card icon={Brain} label="OMEGA" value={omegaStatus === 'online' ? 'ON' : 'OFF'} color={omegaStatus === 'online' ? 'emerald' : 'red'} />
                            <Card icon={AlertTriangle} label="Ошибки" value={errors} color="red" />
                        </div>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5">
                            <div className="text-sm font-medium mb-3 flex items-center gap-2"><Activity size={16} className="text-purple-400" /> Активность</div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 21 }).map((_, i) => {
                                    const h = Math.floor(Math.random() * 40) + 10
                                    return <div key={i} className="rounded-sm bg-purple-500/30" style={{ height: `${h}px` }} />
                                })}
                            </div>
                        </div>
                        <button onClick={handleEmergency} className="w-full min-h-[56px] bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl font-semibold active:scale-[0.98] transition-transform">
                            {emergencyTaps === 0 ? '🛑 Emergency Stop (нажмите 2 раза)' : '⚠️ Нажмите ещё раз для активации'}
                        </button>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">Team Pulse</h1>
                        <div className="grid grid-cols-2 gap-3">
                            <Card icon={Users} label="Онлайн" value={`${onlineTeam}/${team?.staff?.length || 0}`} color="emerald" />
                            <Card icon={Zap} label="Агентов" value={activeAgents} color="purple" />
                        </div>
                        <div className="space-y-3">
                            {(team?.staff || []).map(s => (
                                <div key={s.id} className="p-3 rounded-xl bg-[#111118] border border-white/5 flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-white">{s.name}</div>
                                        <div className="text-xs text-gray-500">{s.role} · {s.lastActive}</div>
                                    </div>
                                    <div className="text-xs text-gray-400">{s.tasksCompleted} задач</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5">
                            <div className="text-sm font-medium mb-2 flex items-center gap-2"><Clock size={16} className="text-amber-400" /> Heatmap активности</div>
                            <div className="grid grid-cols-7 gap-1">
                                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="text-[10px] text-center text-gray-500">{d}</div>)}
                                {Array.from({ length: 28 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded bg-white/5" style={{ opacity: Math.random() * 0.8 + 0.2 }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">Approval Stream</h1>
                        {approvals.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-400/50" />
                                <p className="text-sm">Нет запросов на утверждение</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {approvals.map(a => (
                                    <div key={a.id} className={`p-4 rounded-2xl bg-[#111118] border border-white/5 transition-transform ${a.status === 'pending' ? '' : 'opacity-50 scale-95'}`}>
                                        <div className="text-sm font-medium text-white mb-1">{a.title}</div>
                                        <p className="text-xs text-gray-400 mb-3">{a.body}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproval(a.id, 'approved')} className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium"><Check size={14} className="inline mr-1" /> Да</button>
                                            <button onClick={() => handleApproval(a.id, 'rejected')} className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium"><X size={14} className="inline mr-1" /> Нет</button>
                                            <button onClick={() => handleApproval(a.id, 'edited')} className="flex-1 py-2 rounded-xl bg-white/5 text-white text-sm font-medium"><Edit3 size={14} className="inline mr-1" /> Правка</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'omega' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">OMEGA Voice</h1>
                        <button
                            onClick={startVoice}
                            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all ${listening ? 'bg-red-500/20 scale-110' : 'bg-[#8B5CF6]/20'}`}
                        >
                            <Mic size={40} className={listening ? 'text-red-400' : 'text-[#8B5CF6]'} />
                        </button>
                        <p className="text-center text-sm text-gray-400">
                            {listening ? 'Слушаю... Скажите «OMEGA» или команду' : 'Удерживайте кнопку и говорите'}
                        </p>
                        {voiceText && <div className="p-3 rounded-xl bg-[#111118] text-sm text-white">«{voiceText}»</div>}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/ai-chat')} className="p-3 rounded-xl bg-[#111118] text-sm text-white">Открыть чат</button>
                            <button onClick={() => navigate('/owner')} className="p-3 rounded-xl bg-[#111118] text-sm text-white">Owner Dashboard</button>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-4">
                        <h1 className="text-xl font-bold">Профиль</h1>
                        <div className="p-4 rounded-2xl bg-[#111118] border border-white/5 text-center">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-3 flex items-center justify-center text-2xl font-bold">
                                {user?.name?.charAt(0) || 'O'}
                            </div>
                            <div className="text-lg font-semibold text-white">{user?.name || 'Owner'}</div>
                            <div className="text-xs text-gray-400">{user?.email}</div>
                            <div className="text-xs text-emerald-400 mt-1">role: owner</div>
                        </div>
                        {/* [P21] added: install app button */}
                        <PWAInstallButton variant="hint" className="w-full" />
                        <div className="space-y-2">
                            <button onClick={() => navigate('/settings')} className="w-full p-3 rounded-xl bg-[#111118] text-sm text-white flex items-center justify-between">
                                Настройки <ChevronRight size={16} className="text-gray-500" />
                            </button>
                            <button onClick={() => navigate('/owner')} className="w-full p-3 rounded-xl bg-[#111118] text-sm text-white flex items-center justify-between">
                                Полный Owner Dashboard <ChevronRight size={16} className="text-gray-500" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-md border-t border-white/5 pb-safe">
                <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
                    {TABS.map(t => {
                        const Icon = t.icon
                        const active = activeTab === t.id
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${active ? 'text-[#8B5CF6]' : 'text-gray-500'}`}
                            >
                                <Icon size={20} />
                                <span className="text-[10px] font-medium">{t.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}

function Card({ icon: Icon, label, value, color }) {
    const colors = {
        emerald: 'text-emerald-400 bg-emerald-500/10',
        blue: 'text-blue-400 bg-blue-500/10',
        purple: 'text-purple-400 bg-purple-500/10',
        red: 'text-red-400 bg-red-500/10',
        amber: 'text-amber-400 bg-amber-500/10',
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
