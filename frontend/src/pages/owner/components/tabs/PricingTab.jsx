import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, TrendingUp, History, Save, Loader2, Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react'
import { ownerApi, planConfigApi, testimonialsApi } from '../../../../services/api'
import toast from 'react-hot-toast'

// [P1.6-PREP] редактируемый состав тарифа (PlanConfig)
const QUOTA_FIELDS = ['generationsPerDay', 'youtubeUploadsPerDay', 'youtubeChannels', 'mediaQueueMB', 'scheduledPostsMax', 'aiTagsPerDay']
const FEATURE_FIELDS = ['publishAt', 'playlists', 'brandVoice', 'abTesting', 'analytics', 'whiteLabel']

const WHAT_LABELS = {
    'tariff.free': 'Free',
    'tariff.pro': 'Pro',
    'tariff.agency': 'Agency',
    'ad.channel.cpm': 'CPM канала',
    'ad.channel.cpc': 'CPC канала',
    'ad.channel.cpa': 'CPA канала',
    'ad.app.banner': 'Баннер в приложении',
}

export function PricingTab() {
    const { t } = useTranslation()
    const [plans, setPlans] = useState([])
    const [adPricing, setAdPricing] = useState({ cpm: 0, cpc: 0, cpa: 0, fixedMonth: 0 })
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)
    const [analysis, setAnalysis] = useState(null)
    const [selectedWhat, setSelectedWhat] = useState('')
    const [newPrice, setNewPrice] = useState('')
    const [saving, setSaving] = useState(false)

    // [P1.6-PREP] состав тарифа (квоты/фичи) + отзывы лендинга
    const [editPlanId, setEditPlanId] = useState(null)
    const [quotaDraft, setQuotaDraft] = useState({})
    const [featureDraft, setFeatureDraft] = useState({})
    const [savingPlan, setSavingPlan] = useState(false)
    const [testimonials, setTestimonials] = useState([])
    const [testimonialDraft, setTestimonialDraft] = useState({ name: '', role: '', text: '' })
    const [testimonialBusy, setTestimonialBusy] = useState(false)

    const startEditPlan = (plan) => {
        setEditPlanId(plan.plan)
        setQuotaDraft({ ...QUOTA_FIELDS.reduce((acc, f) => ({ ...acc, [f]: plan.quotas?.[f] ?? 0 }), {}) })
        setFeatureDraft({ ...FEATURE_FIELDS.reduce((acc, f) => ({ ...acc, [f]: !!plan.features?.[f] }), {}) })
    }

    const savePlan = async (planId) => {
        setSavingPlan(true)
        try {
            const quotas = Object.fromEntries(QUOTA_FIELDS.map(f => [f, Number(quotaDraft[f]) || 0]))
            await planConfigApi.update(planId, { quotas, features: featureDraft })
            toast.success(t('pricing.saved'))
            setEditPlanId(null)
            await load()
        } catch (err) {
            console.error('[PricingTab] save plan failed:', err)
            toast.error(t('pricing.saveError'))
        } finally {
            setSavingPlan(false)
        }
    }

    const loadTestimonials = async () => {
        try {
            const res = await testimonialsApi.listAll()
            setTestimonials(Array.isArray(res?.testimonials) ? res.testimonials : [])
        } catch (err) {
            console.error('[PricingTab] testimonials load failed:', err)
        }
    }

    const addTestimonial = async () => {
        if (!testimonialDraft.name.trim() || !testimonialDraft.text.trim()) return
        setTestimonialBusy(true)
        try {
            await testimonialsApi.create({ ...testimonialDraft, visible: true })
            setTestimonialDraft({ name: '', role: '', text: '' })
            toast.success(t('pricing.testimonials.added'))
            await loadTestimonials()
        } catch (err) {
            console.error('[PricingTab] testimonial add failed:', err)
            toast.error(t('pricing.testimonials.error'))
        } finally {
            setTestimonialBusy(false)
        }
    }

    const toggleTestimonial = async (item) => {
        try {
            await testimonialsApi.update(item._id, { visible: !item.visible })
            await loadTestimonials()
        } catch (err) {
            toast.error(t('pricing.testimonials.error'))
        }
    }

    const deleteTestimonial = async (item) => {
        if (!window.confirm(`${t('pricing.testimonials.delete')}: ${item.name}?`)) return
        try {
            await testimonialsApi.remove(item._id)
            toast.success(t('pricing.testimonials.deleted'))
            await loadTestimonials()
        } catch (err) {
            toast.error(t('pricing.testimonials.error'))
        }
    }

    useEffect(() => { loadTestimonials() }, [])

    const load = async () => {
        setLoading(true)
        try {
            const [pricingRes, historyRes] = await Promise.all([
                ownerApi.pricing(),
                ownerApi.pricingHistory(),
            ])
            setPlans(pricingRes?.data?.plans || pricingRes?.plans || [])
            setAdPricing(pricingRes?.data?.adPricing || pricingRes?.adPricing || {})
            setHistory(historyRes?.data || [])
        } catch (err) {
            console.error('[PricingTab] load failed:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const runAnalysis = async (what) => {
        setSelectedWhat(what)
        setAnalysis(null)
        try {
            const res = await ownerApi.pricingAnalysis(what)
            setAnalysis(res?.data || res)
        } catch (err) {
            console.error('[PricingTab] analysis failed:', err)
        }
    }

    const applyPrice = async () => {
        if (!selectedWhat || !newPrice) return
        setSaving(true)
        try {
            await ownerApi.changePrice({ what: selectedWhat, newPrice: Number(newPrice) })
            setNewPrice('')
            setAnalysis(null)
            await load()
        } catch (err) {
            console.error('[PricingTab] change failed:', err)
        } finally {
            setSaving(false)
        }
    }

    const getCurrentPrice = (what) => {
        const [type, target, field] = what.split('.')
        if (type === 'tariff') return plans.find(p => p.plan === target)?.price || 0
        if (type === 'ad' && target === 'channel') return adPricing[field] || 0
        return 0
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Banknote size={20} className="text-emerald-400" />
                <h2 className="text-xl font-bold text-[var(--text)]">{t('pricing.title')}</h2>
            </div>

            {/* Plans grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <div key={plan.plan} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-[var(--text)] capitalize">{plan.plan}</h3>
                            <span className="text-lg font-bold text-emerald-400">{plan.price}₽</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] space-y-1">
                            <div>{t('pricing.generationsPerDay')}: {plan.quotas?.generationsPerDay ?? '—'}</div>
                            <div>{t('pricing.youtubeUploads')}: {plan.quotas?.youtubeUploadsPerDay ?? '—'}</div>
                            <div>{t('pricing.mediaQueue')}: {plan.quotas?.mediaQueueMB ?? '—'} MB</div>
                        </div>
                        {/* [P1.6-PREP] редактирование состава тарифа */}
                        {editPlanId === plan.plan ? (
                            <div className="mt-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {QUOTA_FIELDS.map(f => (
                                        <label key={f} className="text-xs text-[var(--text-muted)] break-words">
                                            {t(`pricing.quota.${f}`)}
                                            <input
                                                type="number"
                                                min="0"
                                                value={quotaDraft[f] ?? 0}
                                                onChange={e => setQuotaDraft(d => ({ ...d, [f]: e.target.value }))}
                                                className="mt-1 w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)]"
                                            />
                                        </label>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {FEATURE_FIELDS.map(f => (
                                        <label key={f} className="flex items-center gap-2 text-xs text-[var(--text-muted)] min-h-[40px]">
                                            <input
                                                type="checkbox"
                                                checked={!!featureDraft[f]}
                                                onChange={e => setFeatureDraft(d => ({ ...d, [f]: e.target.checked }))}
                                                className="w-4 h-4"
                                            />
                                            {t(`pricing.feature.${f}`)}
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => savePlan(plan.plan)}
                                        disabled={savingPlan}
                                        className="flex-1 min-h-[40px] py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {savingPlan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        {t('pricing.savePlan')}
                                    </button>
                                    <button
                                        onClick={() => setEditPlanId(null)}
                                        className="min-h-[40px] px-3 py-2 rounded-lg bg-white/5 text-sm text-[var(--text-muted)] hover:bg-white/10 transition"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => startEditPlan(plan)}
                                className="mt-3 w-full min-h-[40px] py-2 rounded-lg bg-white/5 text-sm text-[var(--text)] hover:bg-white/10 transition flex items-center justify-center gap-2"
                            >
                                <Pencil size={14} />
                                {t('pricing.editPlan')}
                            </button>
                        )}
                        <button
                            onClick={() => runAnalysis(`tariff.${plan.plan}`)}
                            className="mt-3 w-full py-2 rounded-lg bg-white/5 text-sm text-[var(--text)] hover:bg-white/10 transition"
                        >
                            {t('pricing.analyze')}
                        </button>
                    </div>
                ))}
            </div>

            {/* Ad pricing */}
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <h3 className="font-bold text-[var(--text)] mb-3">{t('pricing.adPricing')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['cpm', 'cpc', 'cpa', 'fixedMonth'].map(key => (
                        <div key={key} className="p-3 rounded-xl bg-white/5">
                            <div className="text-xs text-[var(--text-muted)] uppercase">{key}</div>
                            <div className="text-lg font-bold text-[var(--text)]">{adPricing[key] || 0}₽</div>
                            <button
                                onClick={() => runAnalysis(`ad.channel.${key}`)}
                                className="mt-2 text-xs text-emerald-400 hover:underline"
                            >
                                {t('pricing.analyze')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Analysis + change */}
            {analysis && (
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-emerald-400" />
                        <h3 className="font-bold text-[var(--text)]">{t('pricing.analysisFor')} {WHAT_LABELS[selectedWhat] || selectedWhat}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-[var(--text-muted)]">{t('pricing.currentPrice')}:</span> <b>{analysis.currentPrice}₽</b></div>
                        <div><span className="text-[var(--text-muted)]">{t('pricing.cost')}:</span> <b>{analysis.totalCost}₽</b></div>
                        <div><span className="text-[var(--text-muted)]">{t('pricing.margin')}:</span> <b>{analysis.marginNow}%</b></div>
                        <div><span className="text-[var(--text-muted)]">{t('pricing.sales30d')}:</span> <b>{analysis.sales30d}</b></div>
                    </div>
                    <div className="mt-3 text-sm text-[var(--text-muted)]">
                        {t('pricing.recommended')}: {analysis.recommendation?.min}–{analysis.recommendation?.max}₽ ({t('pricing.optimal')}: {analysis.recommendation?.optimal}₽)
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <input
                            type="number"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            placeholder={t('pricing.newPrice')}
                            className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)]"
                        />
                        <button
                            onClick={applyPrice}
                            disabled={saving || !newPrice}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {t('pricing.apply')}
                        </button>
                    </div>
                </div>
            )}

            {/* History */}
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                    <History size={18} className="text-gray-400" />
                    <h3 className="font-bold text-[var(--text)]">{t('pricing.history')}</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.length === 0 && <div className="text-sm text-[var(--text-muted)]">{t('pricing.noHistory')}</div>}
                    {history.map(item => (
                        <div key={item._id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                            <div>
                                <span className="text-[var(--text)]">{WHAT_LABELS[item.what] || item.what}</span>
                                <span className="text-xs text-[var(--text-muted)] ml-2">({item.source})</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[var(--text-muted)] line-through mr-2">{item.oldPrice}₽</span>
                                <span className="text-emerald-400 font-bold">{item.newPrice}₽</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* [P1.6-PREP] Отзывы лендинга — owner CRUD */}
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                    <Plus size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-[var(--text)]">{t('pricing.testimonials.title')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    <input
                        value={testimonialDraft.name}
                        onChange={e => setTestimonialDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder={t('pricing.testimonials.name')}
                        className="px-3 py-2 min-h-[40px] bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)]"
                    />
                    <input
                        value={testimonialDraft.role}
                        onChange={e => setTestimonialDraft(d => ({ ...d, role: e.target.value }))}
                        placeholder={t('pricing.testimonials.role')}
                        className="px-3 py-2 min-h-[40px] bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)]"
                    />
                    <input
                        value={testimonialDraft.text}
                        onChange={e => setTestimonialDraft(d => ({ ...d, text: e.target.value }))}
                        placeholder={t('pricing.testimonials.text')}
                        className="px-3 py-2 min-h-[40px] bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)]"
                    />
                </div>
                <button
                    onClick={addTestimonial}
                    disabled={testimonialBusy || !testimonialDraft.name.trim() || !testimonialDraft.text.trim()}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {testimonialBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {t('pricing.testimonials.add')}
                </button>
                <div className="space-y-2 max-h-64 overflow-y-auto mt-3">
                    {testimonials.length === 0 && <div className="text-sm text-[var(--text-muted)]">{t('pricing.testimonials.empty')}</div>}
                    {testimonials.map(item => (
                        <div key={item._id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 text-sm">
                            <div className="min-w-0">
                                <span className="text-[var(--text)] break-words">{item.name}</span>
                                {item.role && <span className="text-xs text-[var(--text-muted)] ml-2 break-words">{item.role}</span>}
                                <div className="text-xs text-[var(--text-muted)] break-words line-clamp-2">{item.text}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {!item.visible && <span className="text-xs text-[var(--text-muted)] mr-1">{t('pricing.testimonials.hiddenBadge')}</span>}
                                <button
                                    onClick={() => toggleTestimonial(item)}
                                    title={item.visible ? t('pricing.testimonials.hide') : t('pricing.testimonials.show')}
                                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-white/10 text-[var(--text-muted)]"
                                >
                                    {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button
                                    onClick={() => deleteTestimonial(item)}
                                    title={t('pricing.testimonials.delete')}
                                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-white/10 text-red-400"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
