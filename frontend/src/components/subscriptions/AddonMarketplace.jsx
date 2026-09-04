import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { API_BASE_URL } from '../../config.js'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useModalA11y } from '../../hooks/useModalA11y.js'

const CATEGORIES = {
    all: 'all',
    design: 'design',
    video: 'video',
    analytics: 'analytics',
    integrations: 'integrations',
    agents: 'agents',
    'white-label': 'white-label',
}

const CURRENCIES = [
    { code: 'RUB', flag: '🇷🇺' },
    { code: 'USD', flag: '🇺🇸' },
    { code: 'EUR', flag: '🇪🇺' },
    { code: 'UAH', flag: '🇺🇦' },
    { code: 'KZT', flag: '🇰🇿' },
]

const FX_RATES = { RUB: 1, USD: 0.011, EUR: 0.01, UAH: 0.45, KZT: 5.5 }

function formatPrice(price, currency) {
    return `${Math.round(price)} ${currency}`
}

function convert(price, from, to) {
    if (from === to) return price
    const inRub = price / (FX_RATES[from] || 1)
    return Math.round(inRub * (FX_RATES[to] || 1))
}

function PricingAnalysisModal({ addon, analysis, currency, onClose, onApply }) {
    const { t } = useTranslation()
    // [B4-DOP-2-UI-GATE] ① Esc ② focus-trap
    const dialogRef = useModalA11y(onClose)
    const data = [
        { name: t('addons.currentPrice'), value: addon.price || 0 },
        { name: t('addons.recommendedPrice'), value: analysis?.recommendedPrice || 0 },
        { name: t('addons.competitorPrices'), value: analysis?.competitorPrices?.[0]?.price || 0 },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" className="glass-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{t('addons.aiAnalyze')}: {addon.name}</h3>
                    <button type="button" onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/10 text-[var(--text-muted)]">✕</button>
                </div>

                <div className="glass-card rounded-xl p-4 mb-4 border-l-4 border-[var(--primary)]">
                    <p className="text-2xl font-bold">{formatPrice(analysis?.recommendedPrice || 0, currency)}</p>
                    <p className="text-sm text-[var(--text-muted)]">{t('addons.recommendedPrice')}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">{t('addons.confidence')}: {analysis?.confidence || 0}%</p>
                    <p className="text-sm mt-3">{analysis?.reasoning}</p>
                </div>

                <div className="mb-4">
                    <h4 className="font-semibold mb-2">{t('addons.competitorPrices')}</h4>
                    <div className="flex flex-wrap gap-2">
                        {analysis?.competitorPrices?.map((c, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-sm">{c.price} {c.currency}</span>
                        ))}
                    </div>
                </div>

                <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex gap-2">
                    <button type="button" onClick={() => { onApply(analysis?.recommendedPrice || addon.price); onClose() }} className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90">
                        {t('addons.applyRecommendation')}
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-sm">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AddonMarketplace() {
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const [addons, setAddons] = useState([])
    const [myAddons, setMyAddons] = useState([])
    const [filter, setFilter] = useState('all')
    const [currency, setCurrency] = useState(user?.preferences?.currency || 'RUB')
    const [loading, setLoading] = useState(true)
    const [isEditMode, setIsEditMode] = useState(false)
    const [edits, setEdits] = useState({})
    const [saving, setSaving] = useState({})
    const [analyzing, setAnalyzing] = useState({})
    const [modal, setModal] = useState(null)
    const [purchasing, setPurchasing] = useState(null)
    // [ADDONS-COMPOSITION-LINK] каталог реальных функций для чекбоксов редактора
    const [entitlements, setEntitlements] = useState([])

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    // [ADDONS-MARKETPLACE-RESTORE] редактирование строго owner (admin → без кнопки, API → 403)
    const isOwner = user?.role === 'owner'

    const load = async () => {
        try {
            const [allRes, myRes, entRes] = await Promise.all([
                // owner видит и выключенные аддоны (редактор), остальные — только витрину
                isOwner && token
                    ? fetch(`${API_BASE_URL}/subscriptions/addons/pricing-config`, { headers: { Authorization: `Bearer ${token}` } })
                    : fetch(`${API_BASE_URL}/subscriptions/addons`),
                token ? fetch(`${API_BASE_URL}/subscriptions/my-addons`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ ok: true, json: () => ({ addons: [] }) }),
                isOwner && token
                    ? fetch(`${API_BASE_URL}/subscriptions/addons/entitlements-catalog`, { headers: { Authorization: `Bearer ${token}` } })
                    : Promise.resolve({ ok: true, json: () => ({ entitlements: [] }) }),
            ])
            const allData = await allRes.json()
            const myData = await myRes.json()
            const entData = await entRes.json()
            setEntitlements(entData.entitlements || [])
            const loadedAddons = allData.addons || []
            setAddons(loadedAddons)
            setMyAddons(myData.addons || [])
            const initEdits = {}
            loadedAddons.forEach(a => {
                initEdits[a.id] = {
                    price: a.price,
                    currency: a.currency || 'RUB',
                    discountPercent: a.ownerPriceConfig?.discountPercent || 0,
                    paymentMethods: a.paymentMethods || ['yookassa'],
                    name: a.name,
                    description: a.description || '',
                    includes: Array.isArray(a.includes) ? a.includes.join('\n') : '',
                    features: Array.isArray(a.features) ? a.features : [],
                    isActive: a.isActive !== false,
                }
            })
            setEdits(initEdits)
        } catch (err) {
            console.error('[AddonMarketplace]', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [token])

    const isActive = (id) => myAddons.some(a => a.addonId === id && a.status === 'active' && new Date(a.expiresAt) > new Date())

    // [CLIENT-JOURNEY-QA] реальная оплата аддона через ЮKassa (paymentUrl → редирект).
    // Раньше открывался generic PaymentMethodSelector с фейковым quickpay/tестовым crypto.
    const handlePurchase = async (addon) => {
        if (!token) return toast.error(t('common.login'))
        setPurchasing(addon.id)
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions/addons/${addon.id}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ provider: 'yookassa' }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Payment failed')
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl
                return
            }
            throw new Error(data.error || 'Payment session not created')
        } catch (err) {
            toast.error(err.message)
            setPurchasing(null)
        }
    }

    const handleCancel = async (id) => {
        if (!token) return
        if (!confirm(t('addons.cancelConfirm') || 'Отключить аддон?')) return
        try {
            await fetch(`${API_BASE_URL}/subscriptions/my-addons/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            load()
        } catch (err) {
            toast.error(err.message)
        }
    }

    const savePrice = async (addon) => {
        const edit = edits[addon.id]
        setSaving(prev => ({ ...prev, [addon.id]: true }))
        try {
            const payload = {
                ...edit,
                includes: String(edit.includes || '').split('\n').map(s => s.trim()).filter(Boolean),
                features: Array.isArray(edit.features) ? edit.features : [],
            }
            const res = await fetch(`${API_BASE_URL}/subscriptions/addons/${addon.id}/price`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error('Save failed')
            await load()
            toast.success(t('common.saved') || 'Сохранено')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSaving(prev => ({ ...prev, [addon.id]: false }))
        }
    }

    const resetPrice = async (addon) => {
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions/addons/${addon.id}/reset-price`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Reset failed')
            await load()
        } catch (err) {
            toast.error(err.message)
        }
    }

    const analyzePrice = async (addon) => {
        setAnalyzing(prev => ({ ...prev, [addon.id]: true }))
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions/addons/${addon.id}/analyze-price`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setModal({ addon, analysis: data.analysis })
            await load()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setAnalyzing(prev => ({ ...prev, [addon.id]: false }))
        }
    }

    const displayPrice = (addon) => {
        const base = addon.price || 0
        const discounted = base * (1 - (addon.ownerPriceConfig?.discountPercent || 0) / 100)
        const inSelected = convert(discounted, addon.currency || 'RUB', currency)
        return Math.round(inSelected)
    }

    const oldPrice = (addon) => {
        const inSelected = convert(addon.price || 0, addon.currency || 'RUB', currency)
        return Math.round(inSelected)
    }

    const filtered = filter === 'all' ? addons : addons.filter(a => a.category === filter)

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">{t('common.loading')}</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">🛒 {t('addons.title')}</h2>
                    <p className="text-sm text-[var(--text-muted)]">{t('addons.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="glass-luxury rounded-lg px-3 py-2 text-sm bg-transparent">
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <select value={filter} onChange={e => setFilter(e.target.value)} className="glass-luxury rounded-lg px-3 py-2 text-sm bg-transparent">
                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{t(`addons.${v}`) || v}</option>)}
                    </select>
                    {isOwner && (
                        <button type="button" onClick={() => setIsEditMode(!isEditMode)} className="px-4 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-sm">
                            {isEditMode ? t('common.cancel') : t('addons.editPrices')}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(addon => {
                    const active = isActive(addon.id)
                    const edit = edits[addon.id] || { price: addon.price, currency: addon.currency || 'RUB', discountPercent: 0, paymentMethods: ['yookassa'] }
                    const aiRec = addon.ownerPriceConfig?.aiRecommendedPrice
                    const showAiBadge = aiRec && Math.abs(aiRec - addon.price) / addon.price < 0.1
                    return (
                        <div key={addon.id} className={`glass-card rounded-2xl p-5 flex flex-col hover:bg-white/5 transition-colors ${addon.isActive === false ? 'opacity-60' : ''}`}>
                            {addon.isActive === false && (
                                <span className="self-start mb-2 px-2 py-0.5 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-[10px] font-bold">{t('addons.disabledBadge') || 'Выключен'}</span>
                            )}
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-3xl">{addon.icon}</div>
                                <div className="text-right">
                                    {isEditMode ? (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                min={0}
                                                value={edit.price}
                                                onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, price: Number(e.target.value) } }))}
                                                className="w-24 bg-white/5 rounded-lg px-2 py-1 text-sm text-right"
                                            />
                                            <select value={edit.currency} onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, currency: e.target.value } }))} className="bg-white/5 rounded-lg px-2 py-1 text-xs">
                                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={edit.discountPercent}
                                                onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, discountPercent: Number(e.target.value) } }))}
                                                className="w-16 bg-white/5 rounded-lg px-2 py-1 text-xs text-right"
                                                placeholder="%"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {(addon.ownerPriceConfig?.discountPercent || 0) > 0 && (
                                                <div className="text-sm text-[var(--text-muted)] line-through">{oldPrice(addon)} {currency}</div>
                                            )}
                                            <div className="text-xl font-bold">{displayPrice(addon)} {currency}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{t('addons.perMonth')}</div>
                                            {showAiBadge && (
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-[10px]">🔥 {t('addons.aiRecommended')}</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-1">{addon.name}</h3>
                            <p className="text-sm text-[var(--text-muted)] flex-1 mb-4">{addon.description}</p>
                            {!isEditMode && Array.isArray(addon.includes) && addon.includes.length > 0 && (
                                <ul className="text-xs text-[var(--text-muted)] mb-4 space-y-1">
                                    {addon.includes.map((inc, i) => <li key={i}>• {inc}</li>)}
                                </ul>
                            )}

                            {isEditMode && (
                                <div className="space-y-2 mb-4">
                                    <input
                                        type="text"
                                        value={edit.name}
                                        onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, name: e.target.value } }))}
                                        className="w-full bg-white/5 rounded-lg px-2 py-1 text-sm"
                                        placeholder={t('addons.name') || 'Название'}
                                    />
                                    <textarea
                                        value={edit.description}
                                        onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, description: e.target.value } }))}
                                        className="w-full bg-white/5 rounded-lg px-2 py-1 text-xs"
                                        rows={2}
                                        placeholder={t('addons.description') || 'Описание'}
                                    />
                                    <textarea
                                        value={edit.includes}
                                        onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, includes: e.target.value } }))}
                                        className="w-full bg-white/5 rounded-lg px-2 py-1 text-xs"
                                        rows={3}
                                        placeholder={t('addons.includesPlaceholder') || 'Что входит — по строке на пункт'}
                                    />
                                    <div className="space-y-1 border border-white/10 rounded-lg p-2">
                                        <div className="text-[10px] uppercase text-[var(--text-muted)]">{t('addons.featuresLabel') || 'Реальные функции (разблокировка)'}</div>
                                        {entitlements.map(ent => (
                                            <label key={ent.key} className={`flex items-center gap-2 text-xs cursor-pointer min-h-[32px] ${ent.implemented ? '' : 'opacity-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={!ent.implemented}
                                                    checked={(edit.features || []).includes(ent.key)}
                                                    onChange={e => setEdits(prev => ({
                                                        ...prev,
                                                        [addon.id]: {
                                                            ...edit,
                                                            features: e.target.checked
                                                                ? [...(edit.features || []), ent.key]
                                                                : (edit.features || []).filter(k => k !== ent.key),
                                                        },
                                                    }))}
                                                    className="w-4 h-4"
                                                />
                                                <span>{i18n.language === 'en' ? ent.labelEn : ent.labelRu}{!ent.implemented && ` · ${t('addons.soonBadge') || 'скоро'}`}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer min-h-[44px]">
                                        <input
                                            type="checkbox"
                                            checked={edit.isActive}
                                            onChange={e => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, isActive: e.target.checked } }))}
                                            className="w-4 h-4"
                                        />
                                        {t('addons.enabledLabel') || 'Аддон включён (виден на витрине)'}
                                    </label>
                                </div>
                            )}
                            <div className="text-xs text-[var(--text-muted)] mb-4">
                                {addon.requiresPlan?.length ? `${t('addons.requiresPlan')}: ${addon.requiresPlan.join(', ')}` : t('addons.availableAll')}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {(isEditMode ? edit.paymentMethods : (addon.paymentMethods || ['yookassa'])).map(method => (
                                    <span key={method} className="px-2 py-1 rounded-full bg-white/5 text-[10px] flex items-center gap-1">
                                        {method === 'yookassa' && '🇷🇺'}
                                        {method === 'stripe' && '💳'}
                                        {method === 'paypal' && '🔵'}
                                        {method === 'crypto' && '₿'}
                                        {method}
                                    </span>
                                ))}
                            </div>

                            {isEditMode ? (
                                <div className="flex flex-col gap-2">
                                    <button type="button" onClick={() => savePrice(addon)} disabled={saving[addon.id]} className="btn btn-primary w-full min-h-[44px] text-sm disabled:opacity-50">
                                        {saving[addon.id] ? '...' : t('addons.savePrices')}
                                    </button>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => analyzePrice(addon)} disabled={analyzing[addon.id]} className="flex-1 px-3 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-xs disabled:opacity-50">
                                            {analyzing[addon.id] ? '...' : t('addons.aiAnalyze')}
                                        </button>
                                        <button type="button" onClick={() => resetPrice(addon)} className="flex-1 px-3 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-xs">
                                            {t('addons.resetPrice')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                active ? (
                                    <button type="button" onClick={() => handleCancel(addon.id)} className="btn btn-secondary w-full min-h-[44px]">{t('addons.connected')}</button>
                                ) : (
                                    <button type="button" onClick={() => handlePurchase(addon)} disabled={purchasing === addon.id} className="btn btn-primary w-full min-h-[44px] disabled:opacity-50">
                                        {purchasing === addon.id ? `${t('common.loading')}…` : t('addons.connect')}
                                    </button>
                                )
                            )}
                        </div>
                    )
                })}
            </div>

            {myAddons.length > 0 && !isEditMode && (
                <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-lg font-bold mb-3">{t('addons.myAddons') || 'Мои аддоны'}</h3>
                    <ul className="space-y-2 text-sm">
                        {myAddons.map(a => (
                            <li key={a._id} className="flex items-center justify-between border-b border-[var(--border)]/30 pb-2 last:border-0">
                                <span>{a.addon?.icon} {a.addon?.name || a.addonId}</span>
                                <span className="text-[var(--text-muted)]">{t('addons.until') || 'до'} {new Date(a.expiresAt).toLocaleDateString('ru-RU')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {modal && (
                <PricingAnalysisModal
                    addon={modal.addon}
                    analysis={modal.analysis}
                    currency={currency}
                    onClose={() => setModal(null)}
                    onApply={(price) => setEdits(prev => ({ ...prev, [modal.addon.id]: { ...prev[modal.addon.id], price } }))}
                />
            )}
        </div>
    )
}
