import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Code2, CheckCircle, XCircle, RefreshCw, Loader2, Copy, Check } from 'lucide-react'

const FEATURES = ['Charts', 'Auth', 'Export', 'Mobile', 'PWA']
const TECH_OPTIONS = ['React', 'Vite', 'Tailwind', 'Node.js', 'Express', 'MongoDB', 'Recharts', 'Framer Motion']
const TYPES = ['Frontend', 'Backend', 'Fullstack']
const DESIGNS = ['Glassmorphism', 'Minimal']

export default function OmegaDevStudio() {
    const { user } = useAuth()
    const [name, setName] = useState('')
    const [type, setType] = useState('Fullstack')
    const [tech, setTech] = useState(['React', 'Vite', 'Tailwind'])
    const [features, setFeatures] = useState([])
    const [design, setDesign] = useState('Glassmorphism')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [activeTab, setActiveTab] = useState('frontend')
    const [modules, setModules] = useState([])
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)

    const token = localStorage.getItem('token') || ''

    useEffect(() => {
        loadModules()
    }, [])

    const loadModules = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/omega/dev-studio/modules`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') setModules(data.data || [])
        } catch (err) {
            console.warn('[OmegaDevStudio] load modules failed:', err.message)
        }
    }

    const toggleTech = (t) => {
        setTech(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
    }

    const toggleFeature = (f) => {
        setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
    }

    const generate = async () => {
        if (!name.trim()) return
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/omega/dev-studio/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    spec: { name: name.trim(), type, tech, features, design }
                })
            })
            const data = await res.json()
            if (data.status !== 'success') throw new Error(data.message || 'Generate failed')
            setResult(data.data)
            setActiveTab('frontend')
            await loadModules()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const action = async (id, actionType) => {
        try {
            const res = await fetch(`${API_BASE_URL}/omega/dev-studio/${id}/${actionType}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status === 'success') await loadModules()
        } catch (err) {
            console.error('[OmegaDevStudio] action failed:', err.message)
        }
    }

    const regenerate = () => generate()

    return (
        <div className="w-full space-y-6">
            <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Code2 className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">OMEGA DevStudio</h2>
                        <p className="text-xs text-[var(--text-muted)]">OMEGA пишет production-ready код по спецификации</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)]">Название модуля</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-violet-500/50"
                            placeholder="Например: ViralHookEditor"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)]">Тип</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-violet-500/50"
                        >
                            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)]">Технологии</label>
                        <div className="flex flex-wrap gap-2">
                            {TECH_OPTIONS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => toggleTech(t)}
                                    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                                        tech.includes(t)
                                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-muted)]">Дизайн</label>
                        <select
                            value={design}
                            onChange={(e) => setDesign(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-violet-500/50"
                        >
                            {DESIGNS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    <label className="text-xs text-[var(--text-muted)]">Фичи</label>
                    <div className="flex flex-wrap gap-2">
                        {FEATURES.map(f => (
                            <label key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={features.includes(f)}
                                    onChange={() => toggleFeature(f)}
                                    className="accent-violet-500"
                                />
                                <span className="text-xs text-gray-300">{f}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button
                    onClick={generate}
                    disabled={loading || !name.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Code2 size={16} />}
                    Сгенерировать с OMEGA
                </button>
                {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </div>

            {result && (
                <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {['frontend', 'backend', 'tests'].map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                                    activeTab === t
                                        ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="relative rounded-xl bg-[#0a0a1f] border border-white/10 p-4 overflow-auto max-h-[500px]">
                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(result[activeTab] || '')
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                            }}
                            type="button"
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white opacity-70 hover:opacity-100 transition-opacity"
                            aria-label="Copy"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap">{result[activeTab] || '// empty'}</pre>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => action(result.moduleId, 'approve')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/20">
                            <CheckCircle size={14} /> Одобрить
                        </button>
                        <button onClick={() => setResult(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs hover:bg-red-500/20">
                            <XCircle size={14} /> Отклонить
                        </button>
                        <button onClick={regenerate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-white/10">
                            <RefreshCw size={14} /> Перегенерировать
                        </button>
                    </div>
                </div>
            )}

            <div className="glass-card glow-border rounded-2xl p-4 md:p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Созданные модули</h3>
                {modules.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Пока нет созданных модулей.</p>
                ) : (
                    <div className="space-y-2">
                        {modules.map(m => (
                            <div key={m._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <div>
                                    <div className="text-sm font-medium text-white">{m.name}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{m.type} • {new Date(m.createdAt).toLocaleDateString('ru-RU')}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                        m.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300' :
                                        m.status === 'deployed' ? 'bg-blue-500/10 text-blue-300' :
                                        'bg-yellow-500/10 text-yellow-300'
                                    }`}>
                                        {m.status}
                                    </span>
                                    {m.status === 'draft' && (
                                        <button onClick={() => action(m._id, 'approve')} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs hover:bg-emerald-500/20">✅</button>
                                    )}
                                    {m.status === 'approved' && (
                                        <button onClick={() => action(m._id, 'deploy')} className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-xs hover:bg-blue-500/20">🚀</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
