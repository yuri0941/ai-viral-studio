import { useState, useEffect } from 'react'
import { whiteLabelApi } from '../../../../services/api'
import { Palette, Globe, Image, Save, Eye, RefreshCw } from 'lucide-react'

export function WhiteLabelTab({ data }) {
    const [config, setConfig] = useState({
        brandName: '',
        domain: '',
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '#8b5cf6',
        secondaryColor: '#00ff41',
        isActive: true,
    })
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        whiteLabelApi.get().then(res => {
            if (res.data) setConfig(prev => ({ ...prev, ...res.data }))
        }).catch(() => {})
    }, [])

    const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }))

    const handlePreview = async () => {
        try {
            const res = await whiteLabelApi.preview(config)
            setPreview(res.data)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        setError('')
        try {
            await whiteLabelApi.save(config)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text)]">White-Label Agency</h2>
                    <p className="text-sm text-gray-500 mt-1">Тариф Agency ($299/мес) — кастомный бренд, домен, цвета.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text)] text-sm">
                        <Eye className="w-4 h-4" /> Превью
                    </button>
                    <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm disabled:opacity-50">
                        <Save className="w-4 h-4" /> {loading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>

            {saved && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 text-sm">Сохранено</div>}
            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-2xl bg-white/[0.03] border border-[var(--border)] p-5">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Название бренда</label>
                        <input value={config.brandName} onChange={e => handleChange('brandName', e.target.value)} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" placeholder="Agency Name" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Домен (CNAME)</label>
                        <input value={config.domain} onChange={e => handleChange('domain', e.target.value)} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" placeholder="studio.youragency.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 flex items-center gap-2"><Image className="w-3.5 h-3.5" /> URL логотипа</label>
                        <input value={config.logoUrl} onChange={e => handleChange('logoUrl', e.target.value)} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 flex items-center gap-2"><Image className="w-3.5 h-3.5" /> URL favicon</label>
                        <input value={config.faviconUrl} onChange={e => handleChange('faviconUrl', e.target.value)} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500">Primary Color</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={config.primaryColor} onChange={e => handleChange('primaryColor', e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-0" />
                                <input value={config.primaryColor} onChange={e => handleChange('primaryColor', e.target.value)} className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500">Secondary Color</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={config.secondaryColor} onChange={e => handleChange('secondaryColor', e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border-0" />
                                <input value={config.secondaryColor} onChange={e => handleChange('secondaryColor', e.target.value)} className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input id="wl-active" type="checkbox" checked={config.isActive} onChange={e => handleChange('isActive', e.target.checked)} className="w-4 h-4 accent-[#8b5cf6]" />
                        <label htmlFor="wl-active" className="text-sm text-gray-300">Активно</label>
                    </div>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-[var(--border)] p-5">
                    <h3 className="text-sm font-medium text-[var(--text)] mb-4 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Превью</h3>
                    {preview ? (
                        <div className="space-y-4">
                            <div className="rounded-xl p-6 border" style={{ borderColor: preview.primaryColor, background: `${preview.primaryColor}10` }}>
                                <div className="flex items-center gap-3">
                                    {preview.logoUrl ? <img src={preview.logoUrl} alt="logo" className="w-10 h-10 object-contain rounded" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text)] font-bold" style={{ background: preview.primaryColor }}>{(preview.brandName || 'A')[0]}</div>}
                                    <div className="text-lg font-bold text-[var(--text)]">{preview.brandName}</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500">Domain: {preview.domain}</div>
                            <div className="flex gap-2">
                                <div className="w-12 h-12 rounded-lg" style={{ background: preview.primaryColor }} />
                                <div className="w-12 h-12 rounded-lg" style={{ background: preview.secondaryColor }} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">Нажмите «Превью», чтобы увидеть, как выглядит бренд.</div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default WhiteLabelTab
