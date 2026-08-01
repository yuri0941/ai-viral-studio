import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import {
    DollarSign, Users, Brain, Calendar, BarChart, Bell, KeyRound, Zap,
    ArrowUpRight, TrendingUp, Server, CreditCard, CheckSquare, MessageSquare,
    Settings, Plus, Sparkles, Activity, Lock, Bot,
} from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'

function BentoCard({ title, value, subtext, icon: Icon, color, onClick, children, className = '' }) {
    return (
        <div
            onClick={onClick}
            className={`group relative rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-5 hover:scale-[1.02] hover:bg-white/[0.05] hover:border-[#8B5CF6]/30 transition-all duration-200 cursor-pointer ${className}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-${color}-500/10`}>
                    <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                {onClick && (
                    <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-[#8B5CF6] transition-colors" />
                )}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-gray-500 mb-2">{title}</div>
            {subtext && <div className="text-[11px] text-gray-400">{subtext}</div>}
            {children}
        </div>
    )
}

export function OverviewTab({ data }) {
    const navigate = useNavigate()
    const { user } = useAuth()

    const { staff = [], payments = [], subscriptions = [], agents = [], tasks = [], apiKeys = [], notifications = [] } = data

    const totalIncome = payments.filter(p => p.type === 'income').reduce((a, b) => a + (b.amount || 0), 0)
    const totalExpenses = payments.filter(p => p.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0)
    const net = totalIncome - totalExpenses
    const mrr = subscriptions.reduce((a, b) => a + (b.price || 0) * (b.users || 0), 0)

    const activeStaff = staff.filter(s => s.status === 'active').length
    const activeAgents = agents.filter(a => a.status === 'active').length
    const pendingTasks = tasks.filter(t => t.status !== 'done').length
    const unreadNotifications = notifications.filter(n => !n.read).length
    const activeKeys = apiKeys.filter(k => k.status === 'active' || k.value).length
    const missingKeys = apiKeys.length - activeKeys

    const businessHealth = data.aiAnalytics?.businessHealth ?? 87

    const go = (route) => navigate(route)

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

    return (
        <div className="space-y-6">
            {payments.length === 0 && subscriptions.length === 0 && (
                <EmptyState
                    icon={CreditCard}
                    title="Начните с первой подписки"
                    description="Создайте тарифный план, чтобы начать получать платежи и отслеживать MRR."
                    actionLabel="Создать тариф"
                    onClick={() => go('/owner?tab=subscriptions')}
                />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white">
                        {greeting}, {user?.name || 'Владелец'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Сводка состояния AI Viral Studio</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs text-gray-500">Health</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span className="text-sm font-semibold text-white">{businessHealth}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <BentoCard
                    title="Доход"
                    value={formatCurrency(net)}
                    subtext={`MRR ${formatCurrency(mrr)} · Расходы ${formatCurrency(totalExpenses)}`}
                    icon={DollarSign}
                    color="emerald"
                    onClick={() => go('/owner?tab=finance')}
                />

                <BentoCard
                    title="Команда"
                    value={`${activeStaff}/${staff.length}`}
                    subtext="Активных сотрудников"
                    icon={Users}
                    color="blue"
                    onClick={() => go('/owner?tab=team')}
                />

                <BentoCard
                    title="OMEGA"
                    value={activeAgents}
                    subtext="AI агентов онлайн"
                    icon={Brain}
                    color="purple"
                    onClick={() => go('/owner?tab=omega')}
                />

                <BentoCard
                    title="Планировщик"
                    value={pendingTasks}
                    subtext={`Всего задач: ${tasks.length}`}
                    icon={Calendar}
                    color="orange"
                    onClick={() => go('/owner?tab=tasks')}
                />

                <BentoCard
                    title="Аналитика"
                    value={`${businessHealth}%`}
                    subtext="Индекс здоровья бизнеса"
                    icon={BarChart}
                    color="pink"
                    onClick={() => go('/owner?tab=aiAnalytics')}
                />

                <BentoCard
                    title="Уведомления"
                    value={unreadNotifications}
                    subtext="Непрочитанных"
                    icon={Bell}
                    color="yellow"
                    onClick={() => go('/owner?tab=notifications')}
                />

                <BentoCard
                    title="API Keys"
                    value={`${activeKeys}/${apiKeys.length}`}
                    subtext={missingKeys > 0 ? `${missingKeys} ключей отсутствует` : 'Все ключи активны'}
                    icon={KeyRound}
                    color="cyan"
                    onClick={() => go('/owner?tab=apiKeys')}
                />

                <div className="group rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-5 hover:scale-[1.02] hover:bg-white/[0.05] hover:border-[#8B5CF6]/30 transition-all duration-200 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2.5 rounded-xl bg-purple-500/10">
                            <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-sm font-medium text-white">Быстрые действия</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => data.setModal?.({ type: 'addTask' })}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-[#8B5CF6]/10 text-xs text-gray-300 hover:text-white transition-colors text-left"
                        >
                            <Plus className="w-3.5 h-3.5" /> Задача
                        </button>
                        <button
                            onClick={() => go('/owner?tab=apiKeys')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-[#8B5CF6]/10 text-xs text-gray-300 hover:text-white transition-colors text-left"
                        >
                            <KeyRound className="w-3.5 h-3.5" /> Ключ
                        </button>
                        <button
                            onClick={() => go('/settings')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-[#8B5CF6]/10 text-xs text-gray-300 hover:text-white transition-colors text-left"
                        >
                            <Settings className="w-3.5 h-3.5" /> Настройки
                        </button>
                        <button
                            onClick={() => go('/ai-chat')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-[#8B5CF6]/10 text-xs text-gray-300 hover:text-white transition-colors text-left"
                        >
                            <Bot className="w-3.5 h-3.5" /> OMEGA
                        </button>
                    </div>
                </div>
            </div>

            {/* Mini stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Подписчики', value: subscriptions.reduce((a, b) => a + (b.users || 0), 0), icon: Users, color: 'text-blue-400' },
                    { label: 'Серверы онлайн', value: `${(data.servers || []).filter(s => s.status === 'online').length}/${(data.servers || []).length}`, icon: Server, color: 'text-emerald-400' },
                    { label: 'Подписок', value: subscriptions.length, icon: CreditCard, color: 'text-purple-400' },
                    { label: 'Выполнено задач', value: tasks.filter(t => t.status === 'done').length, icon: CheckSquare, color: 'text-orange-400' },
                ].map((s, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                            <span className="text-[10px] text-gray-500">{s.label}</span>
                        </div>
                        <div className="text-sm font-semibold text-white">{s.value}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default OverviewTab
