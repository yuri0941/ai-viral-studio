import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Send, Wand2, Target, Globe, DollarSign, Users, FileText, MousePointer,
    Loader2, CheckCircle, AlertCircle, BarChart3
} from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const PLATFORMS = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'google', label: 'Google Ads' },
]

const GOALS = [
    { id: 'awareness', label: 'Awareness' },
    { id: 'traffic', label: 'Traffic' },
    { id: 'conversion', label: 'Conversion' },
]

const BUDGET_TYPES = [
    { id: 'daily', label: 'Daily' },
    { id: 'total', label: 'Total' },
]

export function CreateAdTab() {
    const { t } = useTranslation()
    const [form, setForm] = useState({
        name: '',
        platform: 'instagram',
        goal: 'conversion',
        budgetType: 'daily',
        budget: '',
        audience: '',
        creativeText: '',
        cta: '',
        competitorUrl: '',
        variantCount: 3,
    })
    const [loading, setLoading] = useState({})
    const [variants, setVariants] = useState(null)
    const [competitor, setCompetitor] = useState(null)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState(null)

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    }

    const request = async (endpoint, body, key) => {
        setLoading(prev => ({ ...prev, [key]: true }))
        setError(null)
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            const contentType = res.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(t('error.server'))
            }
            const json = await res.json()
            if (json.status === 'error') throw new Error(json.message || t('error.server'))
            return json.data
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }))
        }
    }

    const generateVariants = async () => {
        const data = await request('/ads/generate-variants', {
            product: form.name,
            audience: form.audience,
            platform: form.platform,
            count: form.variantCount,
        }, 'variants')
        setVariants(data?.reply || data?.response || data?.text || JSON.stringify(data, null, 2))
    }

    const analyzeCompetitor = async () => {
        if (!form.competitorUrl.trim()) return
        const data = await request('/ads/analyze-competitor', {
            url: form.competitorUrl,
            niche: form.audience,
        }, 'competitor')
        setCompetitor(data?.reply || data?.response || data?.text || JSON.stringify(data, null, 2))
    }

    const submitCampaign = async (e) => {
        e.preventDefault()
        await request('/ads/create', {
            name: form.name,
            client: form.audience || 'New client',
            budget: Number(form.budget) || 0,
            platform: form.platform,
            goal: form.goal,
            audience: form.audience,
            creativeText: form.creativeText,
            cta: form.cta,
            budgetType: form.budgetType,
        }, 'submit')
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
    }

    const isLoading = Object.values(loading).some(Boolean)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <form onSubmit={submitCampaign} className="glass-luxury glass-luxury-hover rounded-2xl p-4 md:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[var(--primary)]" />
                    {t('advertiser.createCampaign')}
                </h3>

                <div className="space-y-2">
                    <label className="text-xs text-[var(--text-muted)]">{t('ad.campaignName')}</label>
                    <input
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
                        placeholder={t('ad.campaignName')}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" /> {t('ad.platform')}
                        </label>
                        <select
                            value={form.platform}
                            onChange={(e) => update('platform', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm"
                        >
                            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" /> {t('ad.goal')}
                        </label>
                        <select
                            value={form.goal}
                            onChange={(e) => update('goal', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm"
                        >
                            {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" /> {t('ad.budget')}
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={form.budgetType}
                                onChange={(e) => update('budgetType', e.target.value)}
                                className="px-2 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-xs"
                            >
                                {BUDGET_TYPES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                            </select>
                            <input
                                type="number"
                                value={form.budget}
                                onChange={(e) => update('budget', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {t('ad.audience')}
                        </label>
                        <input
                            value={form.audience}
                            onChange={(e) => update('audience', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm"
                            placeholder={t('ad.audiencePlaceholder')}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {t('ad.creativeText')}
                    </label>
                    <textarea
                        value={form.creativeText}
                        onChange={(e) => update('creativeText', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm resize-none focus:outline-none focus:border-[var(--primary)]"
                        placeholder={t('ad.creativeTextPlaceholder')}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <MousePointer className="w-3.5 h-3.5" /> CTA
                    </label>
                    <input
                        value={form.cta}
                        onChange={(e) => update('cta', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm"
                        placeholder={t('ad.ctaPlaceholder')}
                    />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    <button
                        type="button"
                        onClick={generateVariants}
                        disabled={isLoading || !form.name}
                        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/10 disabled:opacity-50"
                    >
                        {loading.variants ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {t('ad.generateVariants')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !form.name || !form.budget}
                        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg disabled:opacity-50"
                    >
                        {loading.submit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {t('ad.submitForApproval')}
                    </button>
                </div>

                {submitted && (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <CheckCircle className="w-4 h-4" /> {t('ad.submitted')}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 text-sm text-rose-400">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
            </form>

            <div className="space-y-4">
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-4 md:p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <Globe className="w-5 h-5 text-[var(--primary)]" />
                        {t('ad.analyzeCompetitor')}
                    </h3>
                    <div className="flex gap-2">
                        <input
                            value={form.competitorUrl}
                            onChange={(e) => update('competitorUrl', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm"
                            placeholder="https://..."
                        />
                        <button
                            type="button"
                            onClick={analyzeCompetitor}
                            disabled={loading.competitor || !form.competitorUrl}
                            className="px-4 py-2 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/10 disabled:opacity-50"
                        >
                            {loading.competitor ? <Loader2 className="w-4 h-4 animate-spin" /> : t('ad.analyze')}
                        </button>
                    </div>
                    {competitor && (
                        <div className="bg-black/20 rounded-xl p-3 text-sm text-[var(--text)] whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {competitor}
                        </div>
                    )}
                </div>

                <div className="glass-luxury glass-luxury-hover rounded-2xl p-4 md:p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-[var(--primary)]" />
                        {t('ad.generatedVariants')}
                    </h3>
                    {variants ? (
                        <div className="bg-black/20 rounded-xl p-3 text-sm text-[var(--text)] whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {variants}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--text-muted)]">{t('ad.variantsHint')}</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CreateAdTab
