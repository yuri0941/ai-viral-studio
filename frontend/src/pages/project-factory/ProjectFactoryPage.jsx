import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api.js'
import {
    Factory, Sparkles, Eye, Check, Download, Rocket, Wrench,
    ChevronDown, ChevronUp, Smartphone, Terminal, Gauge, MousePointer,
    FormInput, History, Loader2
} from 'lucide-react'
import JSZip from 'jszip'

const PROJECT_TYPES = [
    { id: 'landing', label: 'Landing Page' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bot', label: 'Telegram Bot' },
    { id: 'api', label: 'API Service' },
]

const NICHES = [
    'кофейня', 'бьюти', 'IT', 'одежда', 'еда', 'недвижимость', 'фитнес'
]

const STYLES = [
    'modern', 'minimal', 'brutalist', 'glassmorphism', 'corporate'
]

const QUALITY_NAMES = {
    mobile_responsive: 'mobile',
    no_console_errors: 'console',
    lighthouse_perf: 'lighthouse',
    all_buttons_clickable: 'buttons',
    forms_have_submit: 'forms',
}

export default function ProjectFactoryPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()

    if (!['owner', 'admin'].includes(user?.role)) {
        navigate('/dashboard', { replace: true })
        return null
    }

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        type: 'landing',
        name: '',
        description: '',
        niche: NICHES[0],
        style: 'modern',
    })
    const [variants, setVariants] = useState([])
    const [selectedVariant, setSelectedVariant] = useState(null)
    const [quality, setQuality] = useState(null)
    const [deployResult, setDeployResult] = useState(null)
    const [history, setHistory] = useState([])
    const [expandedCode, setExpandedCode] = useState({})
    const [error, setError] = useState('')

    useEffect(() => {
        const saved = localStorage.getItem('project_factory_history')
        if (saved) {
            try { setHistory(JSON.parse(saved)) } catch {}
        }
    }, [])

    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

    const generateVariants = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/project-factory/generate', {
                method: 'POST',
                body: JSON.stringify(form),
            })
            setVariants(data.variants || [])
            setStep(2)
            const entry = { date: new Date().toISOString(), name: form.name, type: form.type, status: 'generated' }
            const next = [entry, ...history]
            setHistory(next)
            localStorage.setItem('project_factory_history', JSON.stringify(next))
        } catch (err) {
            setError(err.message || t('projectFactory.error', 'Ошибка генерации'))
        } finally {
            setLoading(false)
        }
    }

    const selectVariant = async (variant) => {
        setSelectedVariant(variant)
        setDeployResult(null)
        setQuality(null)
        setStep(3)
        try {
            const checks = await request('/project-factory/quality-check', {
                method: 'POST',
                body: JSON.stringify({ project: variant }),
            })
            setQuality(checks)
        } catch (err) {
            console.warn('quality check failed', err)
        }
    }

    const runAutoImprove = async () => {
        if (!selectedVariant) return
        setLoading(true)
        try {
            const filePath = Object.keys(selectedVariant.files || {})[0] || 'src/App.jsx'
            const code = Object.values(selectedVariant.files || {})[0] || ''
            const result = await request('/project-factory/auto-improve', {
                method: 'POST',
                body: JSON.stringify({ filePath, code }),
            })
            if (result.improved && result.fixes?.[0]?.fixedCode) {
                const updated = { ...selectedVariant, files: { ...selectedVariant.files, [filePath]: result.fixes[0].fixedCode } }
                setSelectedVariant(updated)
                const recheck = await request('/project-factory/quality-check', {
                    method: 'POST',
                    body: JSON.stringify({ project: updated }),
                })
                setQuality(recheck)
            }
        } catch (err) {
            console.warn('auto improve failed', err)
        } finally {
            setLoading(false)
        }
    }

    const deploy = async () => {
        if (!selectedVariant) return
        setLoading(true)
        try {
            const result = await request('/project-factory/deploy', {
                method: 'POST',
                body: JSON.stringify({ variant: selectedVariant, platform: 'render' }),
            })
            setDeployResult(result)
            const next = history.map((h, idx) => idx === 0 ? { ...h, status: 'deployed', url: result.url } : h)
            setHistory(next)
            localStorage.setItem('project_factory_history', JSON.stringify(next))
        } catch (err) {
            setError(err.message || t('projectFactory.deployError', 'Ошибка деплоя'))
        } finally {
            setLoading(false)
        }
    }

    const downloadZip = async () => {
        if (!selectedVariant?.files) return
        const zip = new JSZip()
        Object.entries(selectedVariant.files).forEach(([path, content]) => {
            zip.file(path, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
        })
        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedVariant.name || 'project'}.zip`
        a.click()
        URL.revokeObjectURL(url)
    }

    const toggleCode = (id) => setExpandedCode(prev => ({ ...prev, [id]: !prev[id] }))

    const QualityIcon = ({ name }) => {
        switch (name) {
            case 'mobile_responsive': return <Smartphone className="w-4 h-4" />
            case 'no_console_errors': return <Terminal className="w-4 h-4" />
            case 'lighthouse_perf': return <Gauge className="w-4 h-4" />
            case 'all_buttons_clickable': return <MousePointer className="w-4 h-4" />
            case 'forms_have_submit': return <FormInput className="w-4 h-4" />
            default: return <Check className="w-4 h-4" />
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[var(--text)] p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                        <Factory className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text)]">{t('projectFactory.title', '🏭 Project Factory')}</h1>
                        <p className="text-sm text-[var(--text-muted)]">{t('projectFactory.subtitle', 'OMEGA создаёт проекты для владельца')}</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="glass-luxury rounded-2xl p-6 space-y-4 max-w-3xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{t('projectFactory.type', 'Тип проекта')}</label>
                                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]">
                                    {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{t('projectFactory.name', 'Название')}</label>
                                <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="CoffeeHype Landing" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{t('projectFactory.niche', 'Ниша')}</label>
                                <select value={form.niche} onChange={e => updateForm('niche', e.target.value)} className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]">
                                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{t('projectFactory.style', 'Стиль')}</label>
                                <select value={form.style} onChange={e => updateForm('style', e.target.value)} className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]">
                                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{t('projectFactory.description', 'Описание')}</label>
                                <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={4} placeholder={t('projectFactory.descriptionPlaceholder', 'Опишите цель проекта...')} className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]" />
                            </div>
                        </div>
                        <button
                            onClick={generateVariants}
                            disabled={loading || !form.name || !form.description}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {t('projectFactory.generate', 'Сгенерировать 3 варианта')}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--text)]">{t('projectFactory.variants', 'Варианты')}</h2>
                            <button onClick={() => setStep(1)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← {t('common.back', 'Назад')}</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {variants.map((variant, idx) => (
                                <div key={idx} className="glass-luxury rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[var(--text)]">{variant.name || `${t('projectFactory.variant', 'Вариант')} ${idx + 1}`}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30">v{idx + 1}</span>
                                    </div>
                                    <iframe
                                        title={`preview-${idx}`}
                                        srcDoc={variant.previewHtml || '<div style="color:#fff;padding:20px">No preview</div>'}
                                        className="w-full h-[300px] rounded-xl border border-[var(--border)] bg-white"
                                        sandbox="allow-scripts"
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {(variant.techStack || []).map(tech => (
                                            <span key={tech} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">{tech}</span>
                                        ))}
                                    </div>
                                    <button onClick={() => toggleCode(idx)} className="flex items-center gap-2 text-xs text-[var(--primary)] hover:underline">
                                        {expandedCode[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        <Eye className="w-3 h-3" />
                                        {t('projectFactory.showCode', 'Показать код')}
                                    </button>
                                    {expandedCode[idx] && (
                                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 overflow-auto max-h-40 text-[10px] text-[var(--text-muted)]">
                                            <pre>{JSON.stringify(variant.files, null, 2)}</pre>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => selectVariant(variant)}
                                        className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20"
                                    >
                                        <Check className="w-4 h-4" />
                                        {t('projectFactory.select', 'Выбрать этот')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && selectedVariant && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--text)]">{selectedVariant.name}</h2>
                            <button onClick={() => setStep(2)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← {t('common.back', 'Назад')}</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 glass-luxury rounded-2xl p-4">
                                <iframe
                                    title="selected-preview"
                                    srcDoc={selectedVariant.previewHtml || '<div style="color:#fff;padding:20px">No preview</div>'}
                                    className="w-full h-[400px] rounded-xl border border-[var(--border)] bg-white"
                                    sandbox="allow-scripts"
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="glass-luxury rounded-2xl p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-[var(--text)]">{t('projectFactory.quality', 'Quality Gates')}</h3>
                                    {quality ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--text-muted)]">{t('projectFactory.score', 'Оценка')}</span>
                                                <span className={`text-sm font-bold ${quality.passed ? 'text-emerald-400' : 'text-red-400'}`}>{quality.score}%</span>
                                            </div>
                                            <div className="space-y-2">
                                                {quality.checks?.map(check => (
                                                    <div key={check.name} className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                                            <QualityIcon name={check.name} />
                                                            {t(`projectFactory.${QUALITY_NAMES[check.name] || check.name}`, check.name)}
                                                        </div>
                                                        {check.pass ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px]">×</span>}
                                                    </div>
                                                ))}
                                            </div>
                                            {!quality.passed && (
                                                <button
                                                    onClick={runAutoImprove}
                                                    disabled={loading}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 text-sm font-medium hover:bg-[var(--primary)]/20 disabled:opacity-50"
                                                >
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                                                    {t('projectFactory.fix', 'OMEGA, исправь')}
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 className="w-4 h-4 animate-spin" /> {t('projectFactory.checking', 'Проверка...')}</div>
                                    )}
                                </div>
                                <div className="glass-luxury rounded-2xl p-4 space-y-3">
                                    <button
                                        onClick={deploy}
                                        disabled={loading || (quality && !quality.passed)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                        {t('projectFactory.deploy', '🚀 Деплоить')}
                                    </button>
                                    <button
                                        onClick={downloadZip}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--surface)]/80"
                                    >
                                        <Download className="w-4 h-4" />
                                        {t('projectFactory.downloadZip', '📥 Скачать ZIP')}
                                    </button>
                                    {deployResult?.url && (
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                                            <p className="font-medium mb-1">{t('projectFactory.deployed', 'Задеплоено')}:</p>
                                            <a href={deployResult.url} target="_blank" rel="noreferrer" className="underline break-all">{deployResult.url}</a>
                                            <p className="mt-2 text-[var(--text-muted)]">{deployResult.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="glass-luxury rounded-2xl p-4">
                    <button onClick={() => setExpandedCode(prev => ({ ...prev, history: !prev.history }))} className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                        <History className="w-4 h-4" />
                        {t('projectFactory.history', 'Мои проекты')}
                        {expandedCode.history ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedCode.history && (
                        <div className="mt-3 space-y-2">
                            {history.length === 0 && <p className="text-xs text-[var(--text-muted)]">{t('projectFactory.noHistory', 'История пуста')}</p>}
                            {history.map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
                                    <div>
                                        <p className="font-medium text-[var(--text)]">{h.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{h.type} • {new Date(h.date).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${h.status === 'deployed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>{h.status}</span>
                                        {h.url && <a href={h.url} target="_blank" rel="noreferrer" className="block text-xs text-[var(--primary)] underline mt-1">{h.url}</a>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
