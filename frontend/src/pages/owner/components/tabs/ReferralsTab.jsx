import { useEffect, useState, useMemo } from 'react'
import {
    Share2, Users, DollarSign, Award, Copy, Check, AlertCircle, Loader2,
    TrendingUp, Sparkles, Wallet, CreditCard,
    Instagram, Twitter, Linkedin, Facebook
} from 'lucide-react'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../../../../config.js'

const TIERS = [
    { id: 'starter', min: 1, label: 'Starter', reward: '-10% скидка', refs: 1 },
    { id: 'pro', min: 3, label: 'Pro', reward: '-20% скидка', refs: 3 },
    { id: 'agent', min: 5, label: 'Agent', reward: 'Agentic Mode', refs: 5 },
    { id: 'partner', min: 10, label: 'Partner', reward: '12% комиссия', refs: 10 }, // [REFERRAL-PCT] база; рендер — динамический из OwnerSettings (см. tiers ниже)
]

const DEMO_DATA = {
    code: 'DEMO50',
    link: 'https://aiviral-studio.ru/?ref=DEMO50',
    count: 4,
    activeCount: 2,
    earnings: 120,
    available: 120,
    tierLabel: 'Pro',
    referralsToNext: 1,
    referredUsers: [
        { id: '1', name: 'Анна Петрова', email: 'anna@example.com', date: '2026-07-20', tariff: 'Pro', status: 'Активен', earnings: 40 },
        { id: '2', name: 'Иван Сидоров', email: 'ivan@example.com', date: '2026-07-18', tariff: 'Creator', status: 'Регистрация', earnings: 0 },
        { id: '3', name: 'Мария Козлова', email: 'maria@example.com', date: '2026-07-15', tariff: 'Agency', status: 'Оплатил', earnings: 80 },
        { id: '4', name: 'Дмитрий Волков', email: 'dmitry@example.com', date: '2026-07-10', tariff: 'Pro', status: 'Активен', earnings: 0 },
    ],
    payouts: [
        { id: '1', date: '2026-06-25', amount: 50, status: 'Выплачено', method: 'USDT TRC20' },
        { id: '2', name: '2026-07-01', amount: 30, status: 'В обработке', method: 'Банковская карта' },
    ],
}

const STATUS_STYLES = {
    'Регистрация': 'bg-gray-500/10 text-gray-400',
    'Активен': 'bg-emerald-500/10 text-emerald-400',
    'Оплатил': 'bg-blue-500/10 text-blue-400',
}

export function ReferralsTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [isDemo, setIsDemo] = useState(false)
    const [postModalOpen, setPostModalOpen] = useState(false)
    const [generatedPost, setGeneratedPost] = useState('')
    const [generatingPost, setGeneratingPost] = useState(false)
    const [copiedPost, setCopiedPost] = useState(false)
    const [withdrawing, setWithdrawing] = useState(false)

    useEffect(() => {
        loadReferrals()
    }, [])

    const loadReferrals = async () => {
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/referrals`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success' || json.success) {
                const d = json.data
                // normalize fields
                setData({
                    ...DEMO_DATA,
                    ...d,
                    activeCount: d.paidCount || 0,
                    available: d.creditBalance || d.earnings || 0,
                    referredUsers: Array.isArray(d.referredUsers) && d.referredUsers.length > 0
                        ? d.referredUsers.map((r, i) => ({
                            id: r.id || i,
                            name: r.name,
                            email: r.email,
                            date: r.date,
                            tariff: r.tariff || 'Creator',
                            status: r.status === 'оплатил' ? 'Оплатил' : r.status === 'зарегистрировался' ? 'Регистрация' : r.status || 'Регистрация',
                            earnings: r.status === 'оплатил' ? 20 : 0,
                        }))
                        : [],
                    payouts: d.payouts || [],
                })
                if (!Array.isArray(d.referredUsers) || d.referredUsers.length === 0) {
                    setIsDemo(true)
                }
            } else {
                setIsDemo(true)
                setData(DEMO_DATA)
            }
        } catch (err) {
            console.warn('[ReferralsTab] load failed:', err.message)
            setIsDemo(true)
            setData(DEMO_DATA)
        } finally {
            setLoading(false)
        }
    }

    const copyLink = () => {
        if (!data?.link) return
        navigator.clipboard.writeText(data.link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareLink = async () => {
        if (!data?.link) return
        if (navigator.share) {
            try {
                await navigator.share({ title: 'AI Viral Studio', text: 'Присоединяйтесь к AI Viral Studio', url: data.link })
                return
            } catch {}
        }
        copyLink()
    }

    // [REFERRAL-PCT] partner-тир динамический: обещание = механика (из OwnerSettings через /analytics/referrals)
    const refPct = Number.isFinite(data?.referralPercent) ? data.referralPercent : 12
    const tiers = useMemo(() => TIERS.map(t => t.id === 'partner' ? { ...t, reward: `${refPct}% комиссия` } : t), [refPct])

    const currentTierIndex = useMemo(() => {
        const idx = tiers.findIndex(t => t.label === data?.tierLabel)
        return idx >= 0 ? idx : 0
    }, [data, tiers])

    const nextTier = tiers[Math.min(currentTierIndex + 1, tiers.length - 1)]
    const progressToNext = useMemo(() => {
        if (!data) return 0
        const currentMin = tiers[currentTierIndex]?.min || 0
        const nextMin = nextTier?.min || currentMin + 1
        if (nextMin === currentMin) return 100
        const pct = ((data.count - currentMin) / (nextMin - currentMin)) * 100
        return Math.min(100, Math.max(0, pct))
    }, [data, currentTierIndex, nextTier])

    const generateReferralPost = async () => {
        setGeneratingPost(true)
        setPostModalOpen(true)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/generate-template/referral-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: data?.link }),
            })
            const json = await res.json()
            if (json?.text) {
                setGeneratedPost(json.text)
            } else {
                throw new Error('empty')
            }
        } catch {
            setGeneratedPost(
                `🚀 AI Viral Studio — это не просто инструмент, а полноценная команда AI-агентов для роста в соцсетях.\n\n` +
                `Присоединяйтесь по моей ссылке и получите бонус:\n${data?.link || ''}\n\n` +
                `#AI #SMM #Viral #AIViralStudio`
            )
        } finally {
            setGeneratingPost(false)
        }
    }

    const copyPost = () => {
        navigator.clipboard.writeText(generatedPost)
        setCopiedPost(true)
        setTimeout(() => setCopiedPost(false), 2000)
    }

    // [CLIENT-JOURNEY-QA] честная заявка на вывод: создаёт реальный тикет в поддержку
    // (владелец видит в SupportTab и выплачивает вручную через ЮKassa).
    // Раньше был setTimeout-фейк без API. Порог $5 ≈ 500₽ — из MASTER_PLAN («вывод на ЮKassa, мин. 500₽»).
    const MIN_PAYOUT_USD = 5
    const withdraw = async () => {
        if ((data?.available || 0) < MIN_PAYOUT_USD) return
        setWithdrawing(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/support`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subject: 'Заявка на вывод реферальных средств',
                    description: `Доступно к выводу: $${data.available}. Прошу вывести на ЮKassa. Реквизиты уточню в переписке.`,
                }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            toast.success('Заявка на вывод отправлена в поддержку')
        } catch {
            toast.error('Не удалось отправить заявку. Попробуйте позже.')
        } finally {
            setWithdrawing(false)
        }
    }

    if (loading) return <div className="text-center py-12 text-[var(--text-muted)]">Загрузка…</div>
    if (!data) return <div className="text-center py-12 text-[var(--text-muted)]">Нет данных</div>

    return (
        <div className="space-y-6">
            {isDemo && (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> Демо-данные — подключите реферальную программу для реальной статистики.
                </div>
            )}

            {/* Hero */}
            <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/10 to-transparent p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2 mb-2">
                    <Share2 size={24} className="text-[var(--primary)]" />
                    Приглашайте и зарабатывайте
                </h2>
                <p className="text-[var(--text-muted)] mb-6">Получайте до 40% комиссии за каждого приведённого клиента.</p>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <input
                        readOnly
                        value={data.link || ''}
                        className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm outline-none"
                    />
                    <div className="flex gap-2">
                        <button type="button"
                            onClick={copyLink}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Скопировано' : 'Копировать'}
                        </button>
                        <button type="button"
                            onClick={shareLink}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors"
                        >
                            <Share2 size={16} /> Поделиться
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[
                        { label: 'Всего приглашено', value: data.count || 0, icon: Users },
                        { label: 'Активных', value: data.activeCount || 0, icon: TrendingUp },
                        { label: 'Заработано', value: `$${data.earnings || 0}`, icon: DollarSign },
                        { label: 'Доступно к выводу', value: `$${data.available || 0}`, icon: Wallet },
                    ].map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon size={16} className="text-[var(--primary)]" />
                                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-bold text-[var(--text)]">{stat.value}</div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Referrals table */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                <div className="text-sm font-semibold text-[var(--text)] mb-4">Таблица рефералов</div>
                {data.referredUsers.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                        <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                        Пока никто не пришёл по вашей ссылке.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs">
                                    <th className="text-left py-2 font-medium">Имя</th>
                                    <th className="text-left py-2 font-medium">Email</th>
                                    <th className="text-left py-2 font-medium">Дата</th>
                                    <th className="text-left py-2 font-medium">Тариф</th>
                                    <th className="text-left py-2 font-medium">Статус</th>
                                    <th className="text-left py-2 font-medium">Ваш доход</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.referredUsers.map((r, i) => (
                                    <tr key={r.id || i} className="border-b border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
                                        <td className="py-3">{r.name}</td>
                                        <td className="py-3 text-[var(--text-muted)]">{r.email}</td>
                                        <td className="py-3 text-[var(--text-muted)]">{r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '—'}</td>
                                        <td className="py-3">{r.tariff}</td>
                                        <td className="py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-500/10 text-gray-400'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-3">${r.earnings}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Tiers */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                <div className="text-sm font-semibold text-[var(--text)] mb-4">Ваши уровни</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {tiers.map((tier, idx) => {
                        const active = idx === currentTierIndex
                        return (
                            <div
                                key={tier.id}
                                className={`relative p-4 rounded-xl border text-center transition-all ${
                                    active
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg shadow-[var(--primary)]/10'
                                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--primary)]/30'
                                }`}
                            >
                                {active && (
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px]">
                                        Вы здесь
                                    </div>
                                )}
                                <Award size={20} className={`mx-auto mb-2 ${active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                                <div className="text-[var(--text)] font-medium text-sm">{tier.label}</div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-1">{tier.refs}+ рефералов</div>
                                <div className="text-xs text-[var(--primary)] mt-2 font-medium">{tier.reward}</div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                        <span>Прогресс до {nextTier?.label}</span>
                        <span>{data.count || 0} / {nextTier?.min || '∞'}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${progressToNext}%` }} />
                    </div>
                </div>
            </div>

            {/* Payouts */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-[var(--text)]">История выплат</div>
                    <button
                        type="button"
                        onClick={withdraw}
                        disabled={withdrawing || (data.available || 0) < MIN_PAYOUT_USD}
                        title="Минимальная сумма вывода — 500₽ (выплата через ЮKassa после заявки в поддержку)"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                        {withdrawing ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Вывести
                    </button>
                </div>
                {data.payouts?.length === 0 ? (
                    <div className="text-center py-6 text-[var(--text-muted)] text-sm">История выплат пуста.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs">
                                    <th className="text-left py-2 font-medium">Дата</th>
                                    <th className="text-left py-2 font-medium">Сумма</th>
                                    <th className="text-left py-2 font-medium">Статус</th>
                                    <th className="text-left py-2 font-medium">Способ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data.payouts || []).map((p, i) => (
                                    <tr key={p.id || i} className="border-b border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
                                        <td className="py-3">{p.date ? new Date(p.date).toLocaleDateString('ru-RU') : '—'}</td>
                                        <td className="py-3">${p.amount}</td>
                                        <td className="py-3 text-[var(--text-muted)]">{p.status}</td>
                                        <td className="py-3 text-[var(--text-muted)]">{p.method}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Marketing materials */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                <div className="text-sm font-semibold text-[var(--text)] mb-4">Маркетинговые материалы</div>
                <div className="flex flex-wrap gap-3">
                    <button type="button"
                        onClick={generateReferralPost}
                        disabled={generatingPost}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={14} /> Сгенерировать реферальный пост
                    </button>
                </div>
            </div>

            {/* AI post modal */}
            {postModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPostModalOpen(false)}>
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-[var(--primary)]" /> Реферальный пост
                        </h3>
                        {generatingPost ? (
                            <div className="flex items-center justify-center py-8 text-[var(--text-muted)] text-sm">
                                <Loader2 size={18} className="animate-spin mr-2" /> AI генерирует…
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={generatedPost}
                                    onChange={e => setGeneratedPost(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm outline-none resize-none mb-4"
                                />
                                <div className="flex gap-3">
                                    <button type="button"
                                        onClick={() => setPostModalOpen(false)}
                                        className="flex-1 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
                                    >
                                        Закрыть
                                    </button>
                                    <button type="button"
                                        onClick={copyPost}
                                        className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                                    >
                                        {copiedPost ? <Check size={16} className="inline mr-1" /> : <Copy size={16} className="inline mr-1" />}
                                        {copiedPost ? 'Скопировано' : 'Копировать'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReferralsTab
