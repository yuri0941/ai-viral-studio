import { useEffect, useMemo, useState } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import { subscriptionsApi, yookassaApi, stripeApi } from '../../../../services/api.js'
import { useAuth } from '../../../../context/AuthContext.jsx'
import { useSmartData } from '../../../../hooks/useSmartData'
import { API_BASE_URL } from '../../../../config.js'
import {
    CreditCard, Calendar, CheckCircle, Loader2, AlertCircle,
    ToggleLeft, ToggleRight, Receipt, ExternalLink, Globe, Settings, Zap, Sparkles, X, Pencil
} from 'lucide-react'

const DEMO_PLANS = [
    { id: 'creator', name: 'Creator', price: 2900, period: 'month', currency: 'RUB' },
    { id: 'pro', name: 'Pro', price: 4300, period: 'month', currency: 'RUB' },
    { id: 'agency', name: 'Agency', price: 7900, period: 'month', currency: 'RUB' },
    { id: 'enterprise', name: 'Enterprise', price: 19900, period: 'month', currency: 'RUB' },
    { id: 'whitelabel', name: 'White Label', price: 47500, period: 'month', currency: 'RUB' },
]

const FEATURES = {
    free: ['1 проект', 'Базовая аналитика', 'Email поддержка'],
    starter: ['3 проекта', 'Расширенная аналитика', 'Email поддержка'],
    creator: ['5 проектов', 'AI генерация идей', 'Приоритетная поддержка'],
    pro: ['20 проектов', 'API доступ', 'Расширенный AI'],
    agency: ['Безлимит проектов', 'White label', 'Выделенный менеджер'],
    enterprise: ['Кастом решения', 'On-premise', 'SLA 99.9%'],
}

const COLORS = {
    free: '#6b7280',
    starter: '#3b82f6',
    creator: '#2563eb',
    pro: '#8b5cf6',
    agency: '#00ff41',
    enterprise: '#f0883e',
}

const CURRENCIES = [
    { value: 'RUB', label: '₽', symbol: '₽' },
    { value: 'USD', label: '$', symbol: '$' },
    { value: 'EUR', label: '€', symbol: '€' },
]

const IS_STRIPE_ENABLED = false

function formatPrice(amount, currency) {
    const cur = CURRENCIES.find((c) => c.value === currency)
    const symbol = cur?.symbol || currency
    if (currency === 'RUB') return `${amount.toLocaleString('ru-RU')} ${symbol}`
    return `${symbol}${amount.toLocaleString('en-US')}`
}

export function SubscriptionsTab({ data }) {
    const { toasts, setToasts } = data
    const { user, updatePreferences } = useAuth()
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const [currency, setCurrency] = useState(user?.preferences?.currency || 'RUB')
    const [current, setCurrent] = useState(null)
    const [history, setHistory] = useState([])
    const [isYearly, setIsYearly] = useState(false)
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(null)
    const [quotaSettings, setQuotaSettings] = useState({ generationsLimit: 100, overageCost: 4, topUpPackSize: 100, topUpPackPrice: 4 })
    const [savingQuota, setSavingQuota] = useState(false)
    const [pricingOpen, setPricingOpen] = useState(false)
    const [pricingForm, setPricingForm] = useState({ niche: 'SaaS', region: 'Global', competitorPrices: '' })
    const [pricingLoading, setPricingLoading] = useState(false)
    const [pricingResult, setPricingResult] = useState(null)
    const [editingPlanId, setEditingPlanId] = useState(null)
    const [editPrice, setEditPrice] = useState('')
    const [planOverrides, setPlanOverrides] = useState({})

    const plansUrl = useMemo(() => {
        return `${API_BASE_URL}/subscriptions/plans${currency ? `?currency=${currency}` : ''}`
    }, [currency])

    const { data: plans, isDemo } = useSmartData(plansUrl, DEMO_PLANS, token)
    const safePlans = Array.isArray(plans) ? plans : []
    const safeHistory = Array.isArray(history) ? history : []

    useEffect(() => {
        loadCurrentAndHistory()
    }, [currency])

    async function loadCurrentAndHistory() {
        setLoading(true)
        try {
            const [currentRes, historyRes] = await Promise.all([
                subscriptionsApi.current(),
                subscriptionsApi.history(),
            ])
            setCurrent(currentRes.subscription || null)
            setHistory(historyRes.history || [])
        } catch (err) {
            console.error('[SubscriptionsTab:loadData]', err)
            pushToast('error', 'Не удалось загрузить данные подписок')
        } finally {
            setLoading(false)
        }
    }

    async function handleCurrencyChange(nextCurrency) {
        setCurrency(nextCurrency)
        if (updatePreferences) {
            await updatePreferences({ currency: nextCurrency })
        }
    }

    function pushToast(type, message) {
        const id = Date.now() + Math.random()
        setToasts((prev) => [...prev, { id, type, message }])
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
    }

    async function saveQuotaSettings() {
        setSavingQuota(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/quota/settings`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(quotaSettings),
            })
            const json = await res.json()
            if (json.status === 'success') {
                pushToast('success', 'Настройки лимитов сохранены')
            } else {
                pushToast('error', json.message || 'Ошибка')
            }
        } catch (err) {
            pushToast('error', err.message)
        } finally {
            setSavingQuota(false)
        }
    }

    const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'

    async function savePlanPrice(planId) {
        const price = Number(editPrice)
        if (Number.isNaN(price) || price < 0) {
            pushToast('error', 'Некорректная цена')
            return
        }
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/owner/subscription-plans/${planId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ price, currency }),
            })
            const json = await res.json()
            if (json.status === 'success' || json.success) {
                setPlanOverrides(prev => ({ ...prev, [planId]: price }))
                setEditingPlanId(null)
                pushToast('success', 'Цена обновлена')
            } else {
                pushToast('error', json.message || 'Ошибка сохранения')
            }
        } catch (err) {
            // fallback: update locally if backend endpoint not available
            setPlanOverrides(prev => ({ ...prev, [planId]: price }))
            setEditingPlanId(null)
            pushToast('success', 'Цена обновлена (локально)')
        }
    }

    async function handleSubscribe(planId) {
        if (currency !== 'RUB') {
            pushToast('error', 'Международная оплата временно недоступна. Выберите ₽ (RUB).')
            return
        }

        const plan = (Array.isArray(plans) ? plans : []).find(p => p.id === planId)
        if (!plan || plan.price <= 0) {
            pushToast('error', 'Бесплатный тариф не требует оплаты')
            return
        }

        setPaying(planId)
        try {
            const token = localStorage.getItem('token')
            const basePrice = planOverrides[plan.id] ?? plan.price
            const amount = isYearly ? Math.round(basePrice * 12 * 0.8) : basePrice
            const res = await fetch(`${API_BASE_URL}/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    planId,
                    amount,
                    description: `Подписка ${plan.name}`,
                }),
            }).then(r => r.json())

            if (res.success && res.confirmationUrl) {
                pushToast('success', 'Перенаправляем на страницу оплаты…')
                window.location.href = res.confirmationUrl
                return
            }

            pushToast('error', res.error || 'Не удалось создать платёж')
        } catch (err) {
            console.error('[SubscriptionsTab:handleSubscribe]', err)
            pushToast('error', err.message || 'Ошибка при создании платежа')
        } finally {
            setPaying(null)
        }
    }

    const currentPlanId = current?.plan || 'free'

    if (loading) {
        return (
            <div className="p-6 flex items-center gap-3 text-[var(--text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin" />
                Загрузка подписок…
            </div>
        )
    }

    return (
        <div className="space-y-8 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-[#00ff41]" />
                        Подписки
                    </h2>
                    <p className="text-[var(--text-muted)] mt-1">Управление тарифами и оплатой</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-lg p-1">
                        {CURRENCIES.map((cur) => (
                            <button
                                key={cur.value}
                                onClick={() => handleCurrencyChange(cur.value)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                    currency === cur.value
                                        ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                }`}
                            >
                                {cur.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsYearly(!isYearly)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors w-fit"
                    >
                        {isYearly ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} className="text-gray-500" />}
                        {isYearly ? 'Годовой (−20%)' : 'Месячный'}
                    </button>
                    {(user?.role === 'owner' || user?.role === 'admin') && (
                        <button
                            onClick={() => setPricingOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--primary)] hover:bg-[var(--card-hover)] transition-colors"
                        >
                            <Sparkles size={16} />
                            AI-анализ цен
                        </button>
                    )}
                </div>
            </div>

            {/* Current subscription */}
            {current && (
                <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#0a0a0f] font-bold"
                                style={{ backgroundColor: COLORS[currentPlanId] || COLORS.free }}
                            >
                                {(current.plan || 'F').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Текущий тариф</p>
                                <h3 className="text-xl font-bold text-[var(--text)] capitalize">{current.plan}</h3>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <StatusBadge status={current.status === 'active' ? 'active' : 'warning'} label={current.status} />
                                    <span className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {current.endDate
                                            ? `до ${new Date(current.endDate).toLocaleDateString('ru-RU')}`
                                            : 'бессрочно'}
                                    </span>
                                    {current.autoRenew && (
                                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            Автопродление
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-[var(--text)]">
                                {current.price > 0 ? formatPrice(current.price, current.currency) : 'Free'}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">{current.interval === 'year' ? 'в год' : 'в месяц'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Plans */}
            <div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Доступные тарифы</h3>
                {isDemo && (
                    <div className="bg-yellow-900/30 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-4">
                        📊 Пример тарифов — подключите платёжную систему
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {(() => {
                        const safeData = Array.isArray(plans) ? plans : []
                        return safeData.map((plan) => {
                        const isCurrent = currentPlanId === plan.id
                        const isFree = plan.id === 'free'
                        const basePrice = planOverrides[plan.id] ?? plan.price
                        const displayPrice = isYearly && !isFree
                            ? Math.round(basePrice * 12 * 0.8)
                            : basePrice

                        return (
                            <div
                                key={plan.id}
                                className={`rounded-2xl border p-5 transition-all ${
                                    isCurrent
                                        ? 'bg-[var(--card)] border-[#00ff41]/50 ring-1 ring-[#00ff41]/20'
                                        : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border)] hover:shadow-lg'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[plan.id] || '#6b7280' }}
                                    />
                                    <h4 className="text-sm font-semibold text-[var(--text)] capitalize">{plan.name}</h4>
                                    {isCurrent && <CheckCircle className="w-4 h-4 text-[#00ff41] ml-auto" />}
                                </div>

                                <div className="mb-4">
                                    {editingPlanId === plan.id ? (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                value={editPrice}
                                                onChange={e => setEditPrice(e.target.value)}
                                                disabled={isFree}
                                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]/50 disabled:opacity-50"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => savePlanPrice(plan.id)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20"
                                                >
                                                    <CheckCircle size={12} /> Сохранить
                                                </button>
                                                <button
                                                    onClick={() => setEditingPlanId(null)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--card-hover)] text-[var(--text-muted)] text-xs hover:bg-[var(--surface)]"
                                                >
                                                    <X size={12} /> Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {isFree ? (
                                                <div className="text-2xl font-bold text-[var(--text)]">Free</div>
                                            ) : (
                                                <div className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                                                    {formatPrice(displayPrice, plan.currency)}
                                                    <span className="text-xs text-[var(--text-muted)] font-normal">/{isYearly ? 'год' : 'мес'}</span>
                                                    {isOwnerOrAdmin && (
                                                        <button
                                                            onClick={() => { setEditingPlanId(plan.id); setEditPrice(String(planOverrides[plan.id] ?? plan.price)) }}
                                                            disabled={isFree}
                                                            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {isYearly && !isFree && (
                                                <p className="text-xs text-emerald-400 mt-1">Экономия 20%</p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="space-y-2 mb-4">
                                    {(() => {
                                        const raw = FEATURES[plan.id] || plan.description || []
                                        const list = Array.isArray(raw)
                                            ? raw
                                            : String(raw).split(', ').filter(Boolean)
                                        return list.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                <div className="w-1 h-1 rounded-full bg-[#00ff41]" /> {f}
                                            </div>
                                        ))
                                    })()}
                                </div>

                                <button
                                    onClick={() => !isCurrent && !isFree && handleSubscribe(plan.id)}
                                    disabled={isCurrent || isFree || paying === plan.id}
                                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                        isCurrent
                                            ? 'bg-[#00ff41]/10 text-[#00ff41] cursor-default'
                                            : isFree
                                            ? 'bg-[var(--card-hover)] text-[var(--text-muted)] cursor-default'
                                            : paying === plan.id
                                            ? 'bg-[var(--card-hover)] text-[var(--text-muted)] cursor-wait'
                                            : 'bg-[#00ff41] text-[#0a0a0f] hover:bg-[#00ff41]/90'
                                    }`}
                                >
                                    {paying === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {isCurrent ? 'Активен' : isFree ? 'Бесплатно' : paying === plan.id ? 'Создание…' : 'Оформить'}
                                </button>
                            </div>
                        )
                    })})()}
                </div>
            </div>

            {/* Quota settings for owner */}
            {(user?.role === 'owner' || user?.role === 'admin') && (
                <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-5 h-5 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-semibold text-[var(--text)]">Настройки лимитов генераций</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { key: 'generationsLimit', label: 'Лимит генераций', suffix: 'шт/мес' },
                            { key: 'overageCost', label: 'Стоимость overage', suffix: '$/100' },
                            { key: 'topUpPackSize', label: 'Размер пакета', suffix: 'шт' },
                            { key: 'topUpPackPrice', label: 'Цена пакета', suffix: '$' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">{field.label}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={quotaSettings[field.key]}
                                        onChange={e => setQuotaSettings(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] outline-none"
                                    />
                                    <span className="text-xs text-[var(--text-muted)]">{field.suffix}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={saveQuotaSettings}
                        disabled={savingQuota}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00ff41] text-[#0a0a0f] text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {savingQuota ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Сохранить лимиты
                    </button>
                </div>
            )}

            {/* International / Stripe note */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-[var(--text)]">Международные платежи</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Сейчас доступна оплата через ЮKassa (РФ). Stripe для USD/EUR подготовлен, но отключён до открытия иностранной компании.
                    </p>
                    {!IS_STRIPE_ENABLED && currency !== 'RUB' && (
                        <p className="text-sm text-[var(--error)] mt-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Международная оплата временно недоступна. Выберите ₽ (RUB).
                        </p>
                    )}
                </div>
            </div>

            {/* AI Pricing Modal */}
            {pricingOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                            <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                                <Sparkles size={18} className="text-[var(--primary)]" /> AI-анализ цен
                            </h3>
                            <button onClick={() => setPricingOpen(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">Ниша</label>
                                    <input
                                        value={pricingForm.niche}
                                        onChange={(e) => setPricingForm(p => ({ ...p, niche: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">Регион</label>
                                    <input
                                        value={pricingForm.region}
                                        onChange={(e) => setPricingForm(p => ({ ...p, region: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">Цены конкурентов (через запятую)</label>
                                <input
                                    value={pricingForm.competitorPrices}
                                    onChange={(e) => setPricingForm(p => ({ ...p, competitorPrices: e.target.value }))}
                                    placeholder="19, 29, 49, 99"
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    setPricingLoading(true)
                                    try {
                                        const token = localStorage.getItem('token')
                                        const res = await fetch(`${API_BASE_URL}/subscriptions/analyze-pricing`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({
                                                niche: pricingForm.niche,
                                                region: pricingForm.region,
                                                competitorPrices: pricingForm.competitorPrices.split(',').map(s => Number(s.trim())).filter(Boolean),
                                                currency,
                                            }),
                                        })
                                        const json = await res.json()
                                        if (json.success) setPricingResult(json.data)
                                        else pushToast('error', json.error || 'Ошибка анализа')
                                    } catch (err) {
                                        pushToast('error', err.message)
                                    } finally {
                                        setPricingLoading(false)
                                    }
                                }}
                                disabled={pricingLoading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {pricingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {pricingLoading ? 'Анализ…' : 'Проанализировать'}
                            </button>

                            {pricingResult?.recommendations?.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="text-sm text-[var(--text-muted)]">Позиционирование: <span className="text-[var(--text)] font-medium">{pricingResult.marketPosition}</span></div>
                                    {pricingResult.recommendations.map((rec) => (
                                        <div key={rec.plan} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <div className="font-semibold text-[var(--text)]">{rec.plan}</div>
                                                <div className="text-xs text-[var(--text-muted)] mt-1">{rec.reasoning}</div>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="text-right">
                                                    <div className="text-xs text-[var(--text-muted)]">Текущая</div>
                                                    <div className="text-sm text-[var(--text)] line-through">{formatPrice(rec.currentPrice, currency)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-[var(--text-muted)]">Рекомендуемая</div>
                                                    <div className="text-sm font-bold text-[var(--success)]">{formatPrice(rec.suggestedPrice, currency)}</div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const planId = rec.plan?.toLowerCase()
                                                        const token = localStorage.getItem('token')
                                                        try {
                                                            const res = await fetch(`${API_BASE_URL}/subscriptions/plan-price`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                body: JSON.stringify({ planId, currency, price: rec.suggestedPrice }),
                                                            })
                                                            const json = await res.json()
                                                            if (json.success) {
                                                                pushToast('success', `Цена ${rec.plan} обновлена`)
                                                                loadCurrentAndHistory()
                                                            } else pushToast('error', json.error || 'Ошибка')
                                                        } catch (err) {
                                                            pushToast('error', err.message)
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-secondary)] text-xs font-medium hover:opacity-90 transition-opacity"
                                                >
                                                    Применить
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History */}
            {safeHistory.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        История подписок
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Тариф</th>
                                    <th className="px-4 py-3 font-medium">Статус</th>
                                    <th className="px-4 py-3 font-medium">Сумма</th>
                                    <th className="px-4 py-3 font-medium">Период</th>
                                    <th className="px-4 py-3 font-medium">Дата</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {safeHistory.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-[var(--card-hover)]">
                                        <td className="px-4 py-3 text-[var(--text)] capitalize">{item.plan}</td>
                                        <td className="px-4 py-3"><StatusBadge status={item.status} label={item.status} /></td>
                                        <td className="px-4 py-3 text-[var(--text)]">
                                            {item.price > 0 ? formatPrice(item.price, item.currency) : 'Free'}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-muted)]">{item.interval === 'year' ? 'год' : 'мес'}</td>
                                        <td className="px-4 py-3 text-[var(--text-muted)]">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SubscriptionsTab
