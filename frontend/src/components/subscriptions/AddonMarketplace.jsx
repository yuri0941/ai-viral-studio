import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { API_BASE_URL } from '../../config.js'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

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

function convert(price, from, to) {
    if (from === to) return price
    const inRub = price / (FX_RATES[from] || 1)
    return Math.round(inRub * (FX_RATES[to] || 1))
}

// [ADDONS-EDITOR-REDESIGN] iOS-тумблер (role=switch) вместо чекбоксов-простыни
function IosToggle({ checked, onChange, disabled, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={!!checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex w-9 h-5 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${checked ? 'bg-[var(--primary)]' : 'bg-white/15'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-4' : ''}`} />
        </button>
    )
}

function buildInitEdit(a) {
    return {
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
    const [savedEdits, setSavedEdits] = useState({})
    const [saving, setSaving] = useState({})
    const [analyzing, setAnalyzing] = useState({})
    const [analysis, setAnalysis] = useState({})
    const [purchasing, setPurchasing] = useState(null)
    // [ADDONS-COMPOSITION-LINK] каталог реальных функций для тумблеров редактора
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
            loadedAddons.forEach(a => { initEdits[a.id] = buildInitEdit(a) })
            setEdits(initEdits)
            setSavedEdits(JSON.parse(JSON.stringify(initEdits)))
        } catch (err) {
            console.error('[AddonMarketplace]', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [token])

    const isActive = (id) => myAddons.some(a => a.addonId === id && a.status === 'active' && new Date(a.expiresAt) > new Date())

    const isDirty = (id) => JSON.stringify(edits[id]) !== JSON.stringify(savedEdits[id])

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

    // [ADDONS-EDITOR-REDESIGN] AI-панель цены inline в карточке (без модалки, без reload — не затирает несохранённое)
    const analyzePrice = async (addon) => {
        setAnalyzing(prev => ({ ...prev, [addon.id]: true }))
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions/addons/${addon.id}/analyze-price`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setAnalysis(prev => ({ ...prev, [addon.id]: data.analysis }))
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
                    <h2 className="text-2xl font-bold">{isOwner ? t('addons.manageAddons') : `🛒 ${t('addons.title')}`}</h2>
                    {!isOwner && <p className="text-sm text-[var(--text-muted)]">{t('addons.subtitle')}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select aria-label={t('addons.currency')} value={currency} onChange={e => setCurrency(e.target.value)} className="glass-luxury rounded-lg px-3 py-2 text-sm bg-transparent">
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <select aria-label={t('addons.all')} value={filter} onChange={e => setFilter(e.target.value)} className="glass-luxury rounded-lg px-3 py-2 text-sm bg-transparent">
                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{t(`addons.${v}`) || v}</option>)}
                    </select>
                    {isOwner && (
                        <button type="button" onClick={() => setIsEditMode(!isEditMode)} className="px-4 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-sm">
                            {isEditMode ? t('common.cancel') : t('addons.editPrices')}
                        </button>
                    )}
                </div>
            </div>

            {filtered.length === 0 && (
                <div className="glass-card rounded-2xl p-8 text-center text-sm text-[var(--text-muted)]">{t('addons.emptyState')}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(addon => {
                    const active = isActive(addon.id)
                    const edit = edits[addon.id] || { price: addon.price, currency: addon.currency || 'RUB', discountPercent: 0, paymentMethods: ['yookassa'] }
                    const dirty = isEditMode && isDirty(addon.id)
                    const ai = analysis[addon.id]
                    const aiRec = addon.ownerPriceConfig?.aiRecommendedPrice
                    const showAiBadge = aiRec && addon.price && Math.abs(aiRec - addon.price) / addon.price < 0.1
                    const marketAvg = ai?.competitorPrices?.length
                        ? Math.round(ai.competitorPrices.reduce((s, c) => s + (Number(c.price) || 0), 0) / ai.competitorPrices.length)
                        : 0
                    const implementedEnts = entitlements.filter(e => e.implemented)
                    const soonEnts = entitlements.filter(e => !e.implemented)
                    const setEdit = (patch) => setEdits(prev => ({ ...prev, [addon.id]: { ...edit, ...patch } }))
                    const toggleFeature = (key, on) => setEdit({
                        features: on ? [...(edit.features || []), key] : (edit.features || []).filter(k => k !== key),
                    })
                    return (
                        <div key={addon.id} className={`glass-card rounded-2xl p-5 flex flex-col hover:bg-white/5 transition-colors motion-reduce:transition-none ${addon.isActive === false ? 'opacity-60' : ''}`}>
                            {addon.isActive === false && (
                                <span className="self-start mb-2 px-2 py-0.5 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-[10px] font-bold">{t('addons.disabledBadge') || 'Выключен'}</span>
                            )}
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-3xl">{addon.icon}</div>
                                {!isEditMode && (
                                    <div className="text-right">
                                        {(addon.ownerPriceConfig?.discountPercent || 0) > 0 && (
                                            <div className="text-sm text-[var(--text-muted)] line-through">{oldPrice(addon)} {currency}</div>
                                        )}
                                        <div className="text-xl font-bold">{displayPrice(addon)} {currency}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{t('addons.perMonth')}</div>
                                        {showAiBadge && (
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-[10px]">🔥 {t('addons.aiRecommended')}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-bold mb-1 truncate" title={addon.name}>{addon.name}</h3>
                            <p className="text-sm text-[var(--text-muted)] flex-1 mb-4 line-clamp-3" title={addon.description}>{addon.description}</p>
                            {!isEditMode && Array.isArray(addon.includes) && addon.includes.length > 0 && (
                                <ul className="text-xs text-[var(--text-muted)] mb-4 space-y-1">
                                    {addon.includes.map((inc, i) => <li key={i}>• {inc}</li>)}
                                </ul>
                            )}

                            {isEditMode && (
                                <div className="space-y-3 mb-4">
                                    {/* [ADDONS-EDITOR-REDESIGN] цена + валюта + скидка одной строкой с ярлыками */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <label className="block">
                                            <span className="text-[10px] uppercase text-[var(--text-muted)]">{t('addons.priceLabel')}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={edit.price}
                                                onChange={e => setEdit({ price: Number(e.target.value) })}
                                                className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-sm text-right"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] uppercase text-[var(--text-muted)]">{t('addons.currency')}</span>
                                            <select value={edit.currency} onChange={e => setEdit({ currency: e.target.value })} className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-sm">
                                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] uppercase text-[var(--text-muted)]">{t('addons.discountShort')}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={edit.discountPercent}
                                                onChange={e => setEdit({ discountPercent: Number(e.target.value) })}
                                                className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-sm text-right"
                                            />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        value={edit.name}
                                        onChange={e => setEdit({ name: e.target.value })}
                                        className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-sm"
                                        placeholder={t('addons.name') || 'Название'}
                                    />
                                    <textarea
                                        value={edit.description}
                                        onChange={e => setEdit({ description: e.target.value })}
                                        className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-xs"
                                        rows={2}
                                        placeholder={t('addons.description') || 'Описание'}
                                    />
                                    <textarea
                                        value={edit.includes}
                                        onChange={e => setEdit({ includes: e.target.value })}
                                        className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-xs"
                                        rows={2}
                                        placeholder={t('addons.includesPlaceholder') || 'Что входит — по строке на пункт'}
                                    />
                                    {/* [ADDONS-EDITOR-REDESIGN] состав аддона: компактные строки с iOS-тумблерами; «скоро» свёрнуто и не продаётся */}
                                    <div className="border border-white/10 rounded-lg p-2 space-y-1">
                                        <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">{t('addons.featuresLabel') || 'Реальные функции (разблокировка)'}</div>
                                        {implementedEnts.map(ent => (
                                            <div key={ent.key} className="flex items-center justify-between gap-2 min-h-[32px]">
                                                <span className="text-xs truncate" title={i18n.language === 'en' ? ent.labelEn : ent.labelRu}>{i18n.language === 'en' ? ent.labelEn : ent.labelRu}</span>
                                                <IosToggle
                                                    label={i18n.language === 'en' ? ent.labelEn : ent.labelRu}
                                                    checked={(edit.features || []).includes(ent.key)}
                                                    onChange={on => toggleFeature(ent.key, on)}
                                                />
                                            </div>
                                        ))}
                                        {soonEnts.length > 0 && (
                                            <details className="pt-1">
                                                <summary className="text-[11px] text-[var(--text-muted)] cursor-pointer select-none min-h-[32px] flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">{t('addons.soonBadge') || 'скоро'}</span>
                                                    <span>{soonEnts.length}</span>
                                                </summary>
                                                <div className="space-y-1 pt-1">
                                                    {soonEnts.map(ent => (
                                                        <div key={ent.key} className="flex items-center justify-between gap-2 min-h-[32px] opacity-50">
                                                            <span className="text-xs truncate" title={i18n.language === 'en' ? ent.labelEn : ent.labelRu}>{i18n.language === 'en' ? ent.labelEn : ent.labelRu}</span>
                                                            <IosToggle
                                                                label={`${i18n.language === 'en' ? ent.labelEn : ent.labelRu} (${t('addons.soonBadge') || 'скоро'})`}
                                                                checked={false}
                                                                disabled
                                                                onChange={() => {}}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 min-h-[32px]">
                                        <span className="text-xs text-[var(--text-muted)]">{t('addons.enabledLabel') || 'Аддон включён (виден на витрине)'}</span>
                                        <IosToggle
                                            label={t('addons.enabledLabel') || 'Аддон включён'}
                                            checked={!!edit.isActive}
                                            onChange={on => setEdit({ isActive: on })}
                                        />
                                    </div>

                                    {/* [ADDONS-EDITOR-REDESIGN] AI-панель цены: себестоимость / рынок / рекомендация + «Применить» (только в поле, не сохраняет) */}
                                    {ai ? (
                                        <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3 space-y-2">
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-white/5 rounded-lg py-2 px-1">
                                                    <div className="text-sm font-bold truncate" title={`${addon.basePrice ?? addon.price} ${edit.currency}`}>{addon.basePrice ?? addon.price} {edit.currency}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)] truncate" title={t('addons.costLabel')}>{t('addons.costLabel')}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-lg py-2 px-1">
                                                    <div className="text-sm font-bold truncate" title={`${marketAvg} ${edit.currency}`}>{marketAvg} {edit.currency}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)] truncate" title={t('addons.marketAvg')}>{t('addons.marketAvg')}</div>
                                                </div>
                                                <div className="bg-[var(--primary)]/15 rounded-lg py-2 px-1 border border-[var(--primary)]/40">
                                                    <div className="text-sm font-bold text-[var(--primary)] truncate" title={`${ai.recommendedPrice} ${edit.currency}`}>{ai.recommendedPrice} {edit.currency}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)] truncate" title={t('addons.recommendedPrice')}>{t('addons.recommendedPrice')}</div>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)]">{t('addons.confidence')}: {ai.confidence || 0}% · {ai.reasoning}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEdit({ price: Number(ai.recommendedPrice) || edit.price })}
                                                    className="flex-1 px-3 py-2 min-h-[44px] rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90"
                                                >
                                                    {t('addons.apply')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAnalysis(prev => { const n = { ...prev }; delete n[addon.id]; return n })}
                                                    className="px-3 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-xs"
                                                >
                                                    {t('common.close')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => analyzePrice(addon)} disabled={analyzing[addon.id]} className="w-full px-3 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-xs disabled:opacity-50">
                                            {analyzing[addon.id] ? '...' : `🤖 ${t('addons.aiAnalyze')}`}
                                        </button>
                                    )}
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
                                /* [ADDONS-EDITOR-REDESIGN] sticky-сейв: disabled до первого изменения, точка «несохранено» */
                                <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-auto px-5 py-3 rounded-b-2xl border-t border-white/10 bg-[rgba(10,10,15,0.9)] backdrop-blur flex items-center gap-2">
                                    <button type="button" onClick={() => savePrice(addon)} disabled={!dirty || saving[addon.id]} className="btn btn-primary flex-1 min-h-[44px] text-sm disabled:opacity-50">
                                        {saving[addon.id] ? '...' : t('addons.save')}
                                    </button>
                                    <button type="button" onClick={() => resetPrice(addon)} className="px-3 py-2 min-h-[44px] rounded-xl glass-card hover:bg-white/5 text-xs">
                                        {t('addons.resetPrice')}
                                    </button>
                                    {dirty && (
                                        <span className="flex items-center gap-1 text-[10px] text-amber-400" title={t('addons.unsavedChanges')}>
                                            <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
                                            <span className="sr-only">{t('addons.unsavedChanges')}</span>
                                        </span>
                                    )}
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
        </div>
    )
}
