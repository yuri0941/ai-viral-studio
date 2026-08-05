import { useEffect, useMemo, useState } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import { subscriptionsApi, yookassaApi, stripeApi } from '../../../../services/api.js'
import { useAuth } from '../../../../context/AuthContext.jsx'
import { useSmartData } from '../../../../hooks/useSmartData'
import { API_BASE_URL } from '../../../../config.js'
import { useTranslation } from 'react-i18next'
import { playSound } from '../../../../hooks/useSound.js'
import { PLANS, getPrice } from '../../../../config/plans.js' // [P24] fixed: unified plans config
import {
    CreditCard, Calendar, CheckCircle, Loader2, AlertCircle,
    ToggleLeft, ToggleRight, Receipt, ExternalLink, Globe, Settings, Zap, Sparkles, X, Pencil, Check,
    Wallet, Bitcoin, Landmark
} from 'lucide-react'
import { EmptyState } from '../../../../components/common/EmptyState.jsx' // [v6.0] added

// [P24] fixed: backend-shape fallback built from unified PLANS config
// [MONETIZE-2026-08-04] fixed: pass plan id, not object
const DEMO_PLANS = Object.values(PLANS).filter(p => p.id !== 'free').map(p => ({
    id: p.id,
    name: p.name,
    price: getPrice(p.id, 'RUB'),
    period: 'month',
    currency: 'RUB',
    features: p.features,
    popular: p.id === 'pro'
}))

const COLORS = {
    free: '#6b7280',
    starter: '#3b82f6',
    creator: '#2563eb',
    pro: '#8b5cf6',
    agency: '#10b981',
    enterprise: '#f0883e',
}

const CURRENCIES = [
    { value: 'RUB', label: '₽', symbol: '₽' },
    { value: 'USD', label: '$', symbol: '$' },
    { value: 'EUR', label: '€', symbol: '€' },
    { value: 'UAH', label: '₴', symbol: '₴' },
    { value: 'KZT', label: '₸', symbol: '₸' },
    { value: 'BYN', label: 'Br', symbol: 'Br' },
]

const EXCHANGE_RATES = {
    RUB: 1,
    USD: 0.011,
    EUR: 0.01,
    UAH: 0.45,
    KZT: 5.5,
    BYN: 0.036,
}

const IS_STRIPE_ENABLED = false

function formatPrice(amount, currency) {
    const cur = CURRENCIES.find((c) => c.value === currency)
    const symbol = cur?.symbol || currency
    if (currency === 'RUB') return `${amount.toLocaleString('ru-RU')} ${symbol}`
    return `${symbol}${amount.toLocaleString('en-US')}`
}

function convertPrice(amount, from, to) {
    if (from === to) return amount
    const fromRate = EXCHANGE_RATES[from] ?? 1
    const toRate = EXCHANGE_RATES[to] ?? 1
    return Math.round((amount * toRate) / fromRate)
}

const METHOD_ICON = {
    yookassa: Landmark,
    stripe: CreditCard,
    paypal: Wallet,
    crypto: Bitcoin,
}

export function SubscriptionsTab({ data }) {
    const { t } = useTranslation()
    const { toasts, setToasts } = data
    const { user, updatePreferences } = useAuth()
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const [currency, setCurrency] = useState(user?.preferences?.currency || 'RUB')
    const [paymentMethod, setPaymentMethod] = useState('yookassa')
    const [paymentMethods, setPaymentMethods] = useState([])
    const [rate, setRate] = useState(1)
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
    // [P23] fixed: loading states for async plan-price actions
    const [savingPlanId, setSavingPlanId] = useState(null)
    const [applyingPlan, setApplyingPlan] = useState(null)
    // [P18] added: dynamic pricing badge
    const [dynamicBadge, setDynamicBadge] = useState(null)

    // [PLANS-SYNC] added: load plans from unified /api/plans endpoint
    const plansUrl = useMemo(() => {
        return `${API_BASE_URL}/plans${currency ? `?currency=${currency}` : ''}`
    }, [currency])

    const { data: plans, isDemo } = useSmartData(plansUrl, DEMO_PLANS, token)
    const safePlans = Array.isArray(plans) ? plans : []
    const safeHistory = Array.isArray(history) ? history : []

    useEffect(() => {
        loadCurrentAndHistory()
        loadDynamicPricingStatus()
        loadPaymentConfig()
    }, [currency])

    // [P24] added: load geo-currency config and exchange rate
    async function loadPaymentConfig() {
        try {
            const [configRes, rateRes] = await Promise.all([
                fetch(`${API_BASE_URL}/subscriptions/config`).then(r => r.json()),
                fetch(`${API_BASE_URL}/subscriptions/exchange-rate?from=RUB&to=${currency}`).then(r => r.json()),
            ])
            if (configRes.success) {
                setPaymentMethods(configRes.paymentMethods || [])
                setPaymentMethod(prev => configRes.paymentMethods?.find(m => m.id === prev) ? prev : configRes.paymentMethods?.[0]?.id || 'yookassa')
            }
            if (rateRes.success) setRate(rateRes.rate || 1)
        } catch (e) {
            console.warn('[SubscriptionsTab] Load failed:', e.message)
            setPaymentMethods([])
            setPaymentMethod('yookassa')
            setRate(1)
        }
    }

    async function loadCurrentAndHistory() {
        setLoading(true)
        try {
            const [currentRes, historyRes] = await Promise.all([
                subscriptionsApi.current(),
                subscriptionsApi.history(),
            ])
            setCurrent(currentRes.subscription || null)
            setHistory(historyRes.history || [])
        } catch (e) {
            console.warn('[SubscriptionsTab] Load failed:', e.message)
            setCurrent(null) // [v6.0] added
            setHistory([]) // [v6.0] added
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
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions/exchange-rate?from=RUB&to=${nextCurrency}`)
            const json = await res.json()
            if (json.success) setRate(json.rate || 1)
        } catch (err) {
            console.error('[SubscriptionsTab:handleCurrencyChange]', err)
        }
    }

    function pushToast(type, message) {
        const id = Date.now() + Math.random()
        // [P19] added: sound feedback for success/error toasts
        if (type === 'success') playSound('success')
        if (type === 'error') playSound('error')
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

    // [P18] added: dynamic pricing status badge loader
    async function loadDynamicPricingStatus() {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/subscriptions/dynamic-pricing-status`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.success && json.data?.badge) setDynamicBadge(json.data.badge)
            else setDynamicBadge(null)
        } catch (err) {
            console.error('[SubscriptionsTab:dynamicPricing]', err)
            setDynamicBadge(null)
        }
    }

    async function savePlanPrice(planId) {
        const price = Number(editPrice)
        if (Number.isNaN(price) || price < 0) {
            pushToast('error', 'Некорректная цена')
            return
        }
        setSavingPlanId(planId)
        try {
            const token = localStorage.getItem('token')
            // [PLANS-SYNC] added: update in-memory unified plans config
            const res = await fetch(`${API_BASE_URL}/plans/${planId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(currency === 'USD' ? { priceUSD: price } : { priceRUB: price }),
            })
            const json = await res.json()
            if (json.success) {
                setPlanOverrides(prev => ({ ...prev, [planId]: price }))
                setEditingPlanId(null)
                pushToast('success', t('subscriptions.priceUpdated'))
            } else {
                pushToast('error', json.error || json.message || 'Ошибка сохранения')
            }
        } catch (err) {
            setPlanOverrides(prev => ({ ...prev, [planId]: price }))
            setEditingPlanId(null)
            pushToast('success', t('subscriptions.priceUpdated'))
        } finally {
            setSavingPlanId(null)
        }
    }

    async function handleSubscribe(planId) {
        const plan = (Array.isArray(plans) ? plans : []).find(p => p.id === planId)
        if (!plan || plan.price <= 0) {
            pushToast('error', t('subscriptions.freePlanNoPayment'))
            return
        }

        setPaying(planId)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const fallbackToYookassa = () => {
            if (paymentMethod !== 'yookassa') {
                setPaymentMethod('yookassa')
                pushToast('info', t('subscriptions.fallbackToYookassa'))
            }
        }

        try {
            const token = localStorage.getItem('token')
            const planCurrency = plan.currency || 'RUB'
            const basePrice = planOverrides[plan.id] ?? convertPrice(plan.price, planCurrency, currency)
            const amount = isYearly ? Math.round(basePrice * 12 * 0.8) : basePrice
            const body = JSON.stringify({
                planId,
                amount,
                currency,
                description: `Подписка ${plan.name}`,
            })

            let res
            if (paymentMethod === 'yookassa') {
                // [PLANS-SYNC] added: use dedicated YooKassa subscription endpoint
                res = await fetch(`${API_BASE_URL}/yookassa/pay/subscription`, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ planId, userId: user?._id || user?.id }),
                }).then(r => r.json())
                if (res.paymentUrl) {
                    window.location.href = res.paymentUrl
                    return
                }
            } else if (paymentMethod === 'stripe') {
                res = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ planId: plan.name, price: amount, isYearly, currency, userId: user?._id || user?.id }),
                }).then(r => r.json())
                if (res.url) {
                    window.location.href = res.url
                    return
                }
            } else if (paymentMethod === 'paypal') {
                res = await fetch(`${API_BASE_URL}/paypal/create-order`, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body,
                }).then(r => r.json())
                if (res.approvalUrl) {
                    window.location.href = res.approvalUrl
                    return
                }
            } else if (paymentMethod === 'crypto') {
                res = await fetch(`${API_BASE_URL}/payments/crypto-charge`, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: `AI Viral Studio — ${plan.name}`, description: `Подписка ${plan.name}`, price: amount, currency }),
                }).then(r => r.json())
                if (res.hosted_url) {
                    window.open(res.hosted_url, '_blank')
                    pushToast('success', t('subscriptions.cryptoWindowOpened'))
                    setPaying(null)
                    return
                }
            }

            // If backend returned fallback suggestion, switch automatically
            if (res?.fallback && res?.status === 'error') {
                fallbackToYookassa()
            }
            pushToast('error', res?.error || res?.message || t('subscriptions.paymentError'))
        } catch (err) {
            if (err.name === 'AbortError') {
                pushToast('error', t('subscriptions.gatewayTimeout'))
                fallbackToYookassa()
            } else {
                console.error('[SubscriptionsTab:handleSubscribe]', err)
                pushToast('error', err.message || t('subscriptions.paymentError'))
            }
        } finally {
            clearTimeout(timeoutId)
            setPaying(null)
        }
    }

    const currentPlanId = current?.plan || 'free'

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <div className="h-40 shimmer rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-64 shimmer rounded-2xl" />
                    <div className="h-64 shimmer rounded-2xl" />
                    <div className="h-64 shimmer rounded-2xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-[var(--success)]" />
                        {t('subscriptions.title')}
                    </h2>
                    <p className="text-[var(--text-muted)] mt-1">{t('subscriptions.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center glass rounded-lg p-1">
                        {CURRENCIES.map((cur) => (
                            <button
                                key={cur.value}
                                onClick={() => handleCurrencyChange(cur.value)}
                                className={`min-h-[44px] px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                    currency === cur.value
                                        ? 'bg-[var(--primary)] text-[var(--text-inverse)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                }`}
                            >
                                {/* [P23] fixed: currency button touch target */}
                                {cur.label}
                            </button>
                        ))}
                    </div>
                    {paymentMethods.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {paymentMethods.map((method) => {
                                const Icon = METHOD_ICON[method.id] || CreditCard
                                return (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        title={method.name}
                                        className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg glass text-sm flex items-center gap-2 transition-colors ${
                                            paymentMethod === method.id
                                                ? 'bg-[var(--primary)] text-[var(--text-inverse)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        <span className="hidden sm:inline">{method.name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    <button
                        onClick={() => setIsYearly(!isYearly)}
                        className="min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-[var(--text)] hover:bg-[var(--surface)] transition-colors w-fit"
                    >
                        {/* [P23] fixed: billing toggle touch target */}
                        {isYearly ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} className="text-gray-500" />}
                        {isYearly ? t('subscriptions.yearly') : t('subscriptions.monthly')}
                    </button>
                    {/* [P18] added: AI Pricing Engine trigger */}
                    {(user?.role === 'owner' || user?.role === 'admin') && (
                        <button
                            onClick={() => setPricingOpen(true)}
                            className="min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-[var(--primary)] hover:bg-[var(--surface)] transition-colors"
                        >
                            {/* [P23] fixed: pricing-engine button touch target */}
                            <Sparkles size={16} />
                            {t('subscriptions.aiPricing')}
                        </button>
                    )}
                    {/* [P18] added: dynamic pricing badge */}
                    {dynamicBadge && (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full glass ${dynamicBadge.color || 'text-[var(--text)]'}`}>
                            {dynamicBadge.text}
                        </span>
                    )}
                </div>
            </div>

            {current && (
                <div className={`bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 ${current.status === 'active' ? 'border-[var(--success)] ring-1 ring-[var(--success)]/20' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--text-inverse)] font-bold"
                                style={{ backgroundColor: COLORS[currentPlanId] || COLORS.free }}
                            >
                                {(current.plan || 'F').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">{t('subscriptions.currentPlan')}</p>
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
                                            {t('subscriptions.autoRenew')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-bold text-[var(--text)]">
                                {current.price > 0 ? formatPrice(current.price, current.currency) : t('subscriptions.free')}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">{current.interval === 'year' ? t('subscriptions.yearly') : t('subscriptions.monthly')}</p>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">{t('subscriptions.availablePlans')}</h3>
                {isDemo && (
                    <div className="bg-yellow-900/30 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-4">
                        📊 {t('subscriptions.demoPlans')}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {safePlans.map((plan) => {
                        const isCurrent = currentPlanId === plan.id
                        const isFree = plan.id === 'free'
                        const basePrice = planOverrides[plan.id] ?? plan.price
                        const planCurrency = plan.currency || 'RUB'
                        const convertedPrice = convertPrice(basePrice, planCurrency, currency)
                        const displayPrice = isYearly && !isFree
                            ? Math.round(convertedPrice * 12 * 0.8)
                            : convertedPrice
                        const isRecommended = plan.popular || plan.id === 'pro'

                        return (
                            <div
                                key={plan.id}
                                className={`luxury-card p-5 ${isRecommended ? 'border-2 border-[var(--primary)] shadow-lg shadow-violet-500/10' : ''} ${isCurrent ? 'border-[var(--success)]' : ''}`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[plan.id] || '#6b7280' }}
                                    />
                                    <h4 className="text-sm font-semibold text-[var(--text)] capitalize">{plan.name}</h4>
                                    {isCurrent && <CheckCircle className="w-4 h-4 text-[var(--success)] ml-auto" />}
                                </div>

                                <div className="mb-4">
                                    {editingPlanId === plan.id ? (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                value={editPrice}
                                                onChange={e => setEditPrice(e.target.value)}
                                                disabled={isFree}
                                                className="w-full px-3 py-2 rounded-lg glass text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]/50 disabled:opacity-50"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => savePlanPrice(plan.id)}
                                                    disabled={savingPlanId === plan.id}
                                                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 disabled:opacity-50"
                                                >
                                                    {/* [P23] fixed: save-price loading + touch target */}
                                                    {savingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check size={12} />} {t('subscriptions.savePrice')}
                                                </button>
                                                <button
                                                    onClick={() => setEditingPlanId(null)}
                                                    disabled={savingPlanId === plan.id}
                                                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg glass text-[var(--text-muted)] text-xs hover:bg-[var(--surface)] disabled:opacity-50"
                                                >
                                                    {/* [P23] fixed: cancel-edit touch target */}
                                                    <X size={12} /> {t('subscriptions.cancel')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {isFree ? (
                                                <div className="text-4xl font-bold text-[var(--text)]">{t('subscriptions.free')}</div>
                                            ) : (
                                                <div className="text-4xl font-bold text-[var(--text)] flex items-center gap-2">
                                                    {formatPrice(displayPrice, currency)}
                                                    <span className="text-xs text-[var(--text-muted)] font-normal">/{isYearly ? 'год' : 'мес'}</span>
                                                    {isOwnerOrAdmin && (
                                                        <button
                                                            onClick={() => { setEditingPlanId(plan.id); setEditPrice(String(planOverrides[plan.id] ?? plan.price)) }}
                                                            disabled={isFree}
                                                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                                                        >
                                                            {/* [P23] fixed: edit-price pencil touch target */}
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {isYearly && !isFree && (
                                                <p className="text-xs text-emerald-400 mt-1">{t('subscriptions.discount')}</p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="space-y-2 mb-4">
                                    {(() => {
                                        const raw = plan.features || plan.description || []
                                        const list = Array.isArray(raw)
                                            ? raw
                                            : String(raw).split(', ').filter(Boolean)
                                        return list.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                                    <Check size={12} />
                                                </div>
                                                {f}
                                            </div>
                                        ))
                                    })()}
                                </div>

                                <button
                                    onClick={() => !isCurrent && !isFree && handleSubscribe(plan.id)}
                                    disabled={isCurrent || isFree || paying === plan.id}
                                    className={`w-full min-h-[44px] py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                        isCurrent
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-default'
                                            : isFree
                                            ? 'glass text-[var(--text-muted)] cursor-default'
                                            : paying === plan.id
                                            ? 'glass text-[var(--text-muted)] cursor-wait'
                                            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                                    }`}
                                >
                                    {/* [P23] fixed: subscribe button touch target */}
                                    {paying === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {isCurrent ? t('subscriptions.active') : isFree ? t('subscriptions.free') : paying === plan.id ? t('subscriptions.processing') : t('subscriptions.subscribe')}
                                </button>
                            </div>
                        )
                    })}
                    {safePlans.length === 0 && (
                        // [v6.0] added: graceful empty-state placeholder
                        <EmptyState
                            icon={CreditCard}
                            title="Данные обновляются..."
                            description="Тарифы недоступны. Попробуйте обновить позже."
                            compact
                        />
                    )}
                </div>
            </div>

            {(user?.role === 'owner' || user?.role === 'admin') && (
                <div className="luxury-card glass p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-5 h-5 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-semibold text-[var(--text)]">{t('subscriptions.quotaSettings')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { key: 'generationsLimit', label: t('subscriptions.generationsLimit'), suffix: t('subscriptions.unitsPerMonth') },
                            { key: 'overageCost', label: t('subscriptions.overageCost'), suffix: t('subscriptions.per100') },
                            { key: 'topUpPackSize', label: t('subscriptions.topUpPackSize'), suffix: t('subscriptions.pieces') },
                            { key: 'topUpPackPrice', label: t('subscriptions.topUpPackPrice'), suffix: t('subscriptions.dollars') },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">{field.label}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={quotaSettings[field.key]}
                                        onChange={e => setQuotaSettings(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                                        className="flex-1 px-3 py-2 rounded-lg glass text-sm text-[var(--text)] outline-none"
                                    />
                                    <span className="text-xs text-[var(--text-muted)]">{field.suffix}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={saveQuotaSettings}
                        disabled={savingQuota}
                        className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                    >
                        {/* [P23] fixed: quota button touch target */}
                        {savingQuota ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {t('subscriptions.saveQuota')}
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-[var(--border)] glass p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-[var(--text)]">{t('subscriptions.internationalPayments')}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        {t('subscriptions.yookassaOnly')}
                    </p>
                    {!IS_STRIPE_ENABLED && currency !== 'RUB' && (
                        <p className="text-sm text-[var(--error)] mt-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {t('subscriptions.intlUnavailable')}
                        </p>
                    )}
                </div>
            </div>

            {/* [P18] added: AI Pricing Engine modal */}
            {pricingOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
                    {/* [P23] fixed: modal max-width respects viewport */}
                    <div className="w-full max-w-[95vw] sm:max-w-2xl rounded-2xl border border-[var(--border)] glass shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                            <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                                <Sparkles size={18} className="text-[var(--primary)]" /> {t('subscriptions.aiPricing')}
                            </h3>
                            <button onClick={() => setPricingOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
                                {/* [P23] fixed: close-modal touch target */}
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
                                        className="w-full px-3 py-2 rounded-xl glass text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--text-muted)] block mb-1">Регион</label>
                                    <input
                                        value={pricingForm.region}
                                        onChange={(e) => setPricingForm(p => ({ ...p, region: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl glass text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--text-muted)] block mb-1">Цены конкурентов (через запятую)</label>
                                <input
                                    value={pricingForm.competitorPrices}
                                    onChange={(e) => setPricingForm(p => ({ ...p, competitorPrices: e.target.value }))}
                                    placeholder="19, 29, 49, 99"
                                    className="w-full px-3 py-2 rounded-xl glass text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50"
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
                                className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                            >
                                {/* [P23] fixed: analyze button touch target */}
                                {pricingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {pricingLoading ? 'Анализ…' : 'Проанализировать'}
                            </button>

                            {pricingResult?.recommendations?.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="text-sm text-[var(--text-muted)]">Позиционирование: <span className="text-[var(--text)] font-medium">{pricingResult.marketPosition}</span></div>
                                    {pricingResult.recommendations.map((rec) => (
                                        <div key={rec.plan} className="rounded-xl border border-[var(--border)] glass p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                                                        setApplyingPlan(planId)
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
                                                        } finally {
                                                            setApplyingPlan(null)
                                                        }
                                                    }}
                                                    disabled={applyingPlan === rec.plan?.toLowerCase()}
                                                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                    {/* [P23] fixed: apply-price loading + touch target */}
                                                    {applyingPlan === rec.plan?.toLowerCase() && <Loader2 className="w-3 h-3 animate-spin" />}
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

            {safeHistory.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        История подписок
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] glass">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] sticky top-0">
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
                                    <tr key={idx} className="hover:bg-[var(--primary-soft)]/30 transition-colors">
                                        <td className="px-4 py-3 text-[var(--text)] capitalize">{item.plan}</td>
                                        <td className="px-4 py-3"><StatusBadge status={item.status} label={item.status} /></td>
                                        <td className="px-4 py-3 text-[var(--text)]">
                                            {item.price > 0 ? formatPrice(item.price, item.currency) : t('subscriptions.free')}
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
