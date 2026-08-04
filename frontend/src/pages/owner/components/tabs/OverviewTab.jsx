import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import { selfImprovementApi } from '../../../../services/api'
import { API_BASE_URL } from '../../../../config.js'
import {
    DollarSign, Users, Brain, Calendar, BarChart, Bell, KeyRound, Zap,
    ArrowUpRight, TrendingUp, Server, CreditCard, CheckSquare, MessageSquare,
    Settings, Plus, Sparkles, Activity, Lock, Bot, AlertTriangle, UserX,
    FileText, BarChart2,
} from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'
import '../../../../styles/animations.css'
import { useTranslation } from 'react-i18next'

// [MASTER-v5.6] Animated counter with reduced-motion respect
const AnimatedCounter = ({ value, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setCount(value); return;
        }
        const duration = 1500, steps = 60, increment = value / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) { setCount(value); clearInterval(timer); }
            else setCount(Math.floor(current));
        }, duration / steps);
        return () => clearInterval(timer);
    }, [value]);
    const display = typeof value === 'number' && value % 1 !== 0 ? count.toFixed(1) : count.toLocaleString('ru-RU');
    return <span>{prefix}{display}{suffix}</span>;
};

// [MASTER-v5.6] 3D tilt metric card
const MetricCard = ({ icon: Icon, label, value, trend, color, delay = 0, onClick }) => {
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;

    const handleMouseMove = (e) => {
        if (isTouch || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: y * -8, y: x * 8 });
    };

    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;
    const suffix = typeof value === 'string' && value.includes('%') ? '%' : '';

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            onClick={onClick}
            className="luxury-card shimmer-slow cursor-pointer"
            style={{
                transform: isTouch ? 'none' : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: 'transform 0.1s ease-out, border-color 0.3s, box-shadow 0.3s',
                animationDelay: `${delay}ms`
            }}
        >
            <div className={`absolute top-3 right-3 w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-variant-numeric tabular-nums">
                <AnimatedCounter value={numericValue} suffix={suffix} />
            </p>
            {trend && (
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                    <TrendingUp className="w-3 h-3" /><span>{trend}</span>
                </div>
            )}
        </div>
    );
};

function BentoCard({ title, value, subtext, icon: Icon, color, onClick, children, className = '' }) {
    return (
        <div
            onClick={onClick}
            className={`luxury-card glass p-5 cursor-pointer ${className}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                {onClick && (
                    <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                )}
            </div>
            <div className="text-3xl font-bold tracking-tight text-[var(--text)] mb-1">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mb-2">{title}</div>
            {subtext && <div className="text-[11px] text-[var(--text-muted)]">{subtext}</div>}
            {children}
        </div>
    )
}

export function OverviewTab({ data }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()

    const { staff = [], payments = [], subscriptions = [], agents = [], tasks = [], apiKeys = [], notifications = [] } = data

    const [churnStats, setChurnStats] = useState(null)
    const [atRiskUsers, setAtRiskUsers] = useState([])
    const [loadingChurn, setLoadingChurn] = useState(false)

    // [P20] added: data intelligence reports state
    const [reportNiche, setReportNiche] = useState('all')
    const [reportPeriod, setReportPeriod] = useState('month')
    const [reportFormat, setReportFormat] = useState('json')
    const [reportLoading, setReportLoading] = useState(false)
    const [reportResult, setReportResult] = useState(null)

    useEffect(() => {
        let mounted = true
        setLoadingChurn(true)
        Promise.all([
            selfImprovementApi.churnStats().catch(() => null),
            selfImprovementApi.churnAtRisk(6).catch(() => null),
        ]).then(([statsRes, usersRes]) => {
            if (!mounted) return
            setChurnStats(statsRes?.data || null)
            setAtRiskUsers(usersRes?.data || [])
        }).catch(() => {
            // non-critical
        }).finally(() => {
            if (mounted) setLoadingChurn(false)
        })
        return () => { mounted = false }
    }, [])

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

    // [P20] added: data intelligence report handler
    async function handleBuyReport() {
        setReportLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/owner/reports/intelligence`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ niche: reportNiche, period: reportPeriod, format: reportFormat }),
            })
            const json = await res.json()
            if (json.status === 'success') {
                setReportResult(json)
                if (reportFormat === 'pdf' && json.data?.base64) {
                    const link = document.createElement('a')
                    link.href = `data:application/pdf;base64,${json.data.base64}`
                    link.download = json.data.filename
                    link.click()
                }
            }
        } catch (err) {
            console.warn('[OverviewTab] report failed:', err.message)
        } finally {
            setReportLoading(false)
        }
    }

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
                    <h1 className="text-xl font-semibold text-[var(--text)]">
                        {greeting}, {user?.name || 'Владелец'}
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Сводка состояния AI Viral Studio</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Health</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                        <Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span className="text-sm font-semibold text-[var(--text)]">{businessHealth}</span>
                    </div>
                </div>
            </div>

            {/* [MASTER-v5.6] Bento metrics with 3D tilt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard icon={DollarSign} label="MRR" value={mrr} trend="+12%" color="violet" delay={0} onClick={() => go('/owner?tab=finance')} />
                <MetricCard icon={Users} label="Пользователи" value={1247} trend="+5%" color="cyan" delay={100} />
                <MetricCard icon={Zap} label="AI-генераций" value={8543} trend="+23%" color="amber" delay={200} />
                <MetricCard icon={Brain} label="Uptime" value={99.9} suffix="%" trend="Stable" color="emerald" delay={300} />
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

                {/* [P20] added: data intelligence reports card */}
                <div className="luxury-card glass p-5 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                            <BarChart2 className="w-5 h-5 text-[var(--primary)]" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-[var(--text)]">📊 Отчёты по нишам</div>
                            <div className="text-[11px] text-[var(--text-muted)]">Data Intelligence</div>
                        </div>
                    </div>
                    <div className="space-y-2 mb-3">
                        <select
                            value={reportNiche}
                            onChange={e => setReportNiche(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)]"
                        >
                            <option value="all">Все ниши</option>
                            <option value="tech">Технологии</option>
                            <option value="fitness">Фитнес</option>
                            <option value="travel">Путешествия</option>
                            <option value="food">Еда</option>
                            <option value="gaming">Игры</option>
                            <option value="business">Бизнес</option>
                        </select>
                        <div className="flex gap-2">
                            <select
                                value={reportPeriod}
                                onChange={e => setReportPeriod(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)]"
                            >
                                <option value="week">Неделя</option>
                                <option value="month">Месяц</option>
                                <option value="quarter">Квартал</option>
                                <option value="year">Год</option>
                            </select>
                            <select
                                value={reportFormat}
                                onChange={e => setReportFormat(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)]"
                            >
                                <option value="json">JSON</option>
                                <option value="pdf">PDF</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleBuyReport}
                        disabled={reportLoading}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {reportLoading ? 'Генерация…' : <><FileText className="w-3.5 h-3.5" /> Купить от ${reportPeriod === 'year' ? '149' : reportPeriod === 'quarter' ? '99' : reportPeriod === 'month' ? '79' : '49'}</>}
                    </button>
                    {reportResult && reportFormat === 'json' && (
                        <div className="mt-3 p-2 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/10 text-[10px] text-[var(--success)]">
                            Готово: {reportResult.data?.data?.totalPosts || 0} постов, ER {reportResult.data?.data?.engagementRate || 0}%
                        </div>
                    )}
                </div>

                <div className="luxury-card glass p-5 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-[var(--primary)]" />
                        </div>
                        <div className="text-sm font-medium text-[var(--text)]">Быстрые действия</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => data.setModal?.({ type: 'addTask' })}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                        >
                            <Plus className="w-3.5 h-3.5" /> Задача
                        </button>
                        <button
                            onClick={() => go('/owner?tab=apiKeys')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                        >
                            <KeyRound className="w-3.5 h-3.5" /> Ключ
                        </button>
                        <button
                            onClick={() => go('/settings')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                        >
                            <Settings className="w-3.5 h-3.5" /> Настройки
                        </button>
                        <button
                            onClick={() => go('/ai-chat')}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                        >
                            <Bot className="w-3.5 h-3.5" /> OMEGA
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Подписчики', value: subscriptions.reduce((a, b) => a + (b.users || 0), 0), icon: Users, color: 'text-blue-400' },
                    { label: 'Серверы онлайн', value: `${(data.servers || []).filter(s => s.status === 'online').length}/${(data.servers || []).length}`, icon: Server, color: 'text-emerald-400' },
                    { label: 'Подписок', value: subscriptions.length, icon: CreditCard, color: 'text-purple-400' },
                    { label: 'Выполнено задач', value: tasks.filter(t => t.status === 'done').length, icon: CheckSquare, color: 'text-orange-400' },
                ].map((s, i) => (
                    <div key={i} className="luxury-card glass p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                            <span className="text-[10px] text-[var(--text-muted)]">{s.label}</span>
                        </div>
                        <div className="text-sm font-semibold text-[var(--text)]">{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="luxury-card glass p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                            <UserX className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--text)]">Отток клиентов</h3>
                            <p className="text-xs text-[var(--text-muted)]">Предсказание OMEGA + бонусы до отписки</p>
                        </div>
                    </div>
                    {churnStats && (
                        <div className="flex items-center gap-3 text-xs">
                            <span className="text-[var(--text-muted)]">Неделю: <span className="text-[var(--text)] font-medium">{churnStats.atRisk || 0}</span></span>
                            <span className="text-emerald-400">Предотвращено: {churnStats.prevented || 0}</span>
                            <span className="text-rose-400">Высокий риск: {churnStats.highRisk || 0}</span>
                        </div>
                    )}
                </div>

                {loadingChurn && (
                    <div className="h-32 shimmer rounded-2xl" />
                )}

                {!loadingChurn && atRiskUsers.length === 0 && (
                    <EmptyState
                        icon={AlertTriangle}
                        title="Нет клиентов на грани оттока"
                        description="OMEGA анализирует активность. Когда появится риск — вы увидите карточки здесь."
                    />
                )}

                {!loadingChurn && atRiskUsers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {atRiskUsers.map((u) => (
                            <div key={u.userId} className="luxury-card glass p-4 hover:border-rose-500/20 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="text-sm font-medium text-[var(--text)]">{u.name || '—'}</div>
                                        <div className="text-[11px] text-[var(--text-muted)]">{u.email || '—'}</div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        u.risk === 'high'
                                            ? 'bg-rose-500/10 text-rose-400'
                                            : 'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                        {u.risk === 'high' ? 'Высокий риск' : 'Средний риск'}
                                    </span>
                                </div>
                                <div className="space-y-1 mb-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[var(--text-muted)]">Score</span>
                                        <span className="text-[var(--text)] font-medium">{Math.round((u.score || 0) * 100)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${u.risk === 'high' ? 'bg-rose-500' : 'bg-yellow-500'}`}
                                            style={{ width: `${Math.min(100, (u.score || 0) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted)]">
                                        Неактивен {u.factors?.daysInactive || 0} дн · Постов за 30 дн: {u.factors?.postsCount30d || 0}
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            await selfImprovementApi.churnOffer(u.userId, 1)
                                            alert(`Бонус отправлен для ${u.name || u.email}`)
                                        } catch (err) {
                                            alert('Ошибка отправки бонуса')
                                        }
                                    }}
                                    className="w-full text-xs px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                                >
                                    Отправить персональный бонус
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default OverviewTab
