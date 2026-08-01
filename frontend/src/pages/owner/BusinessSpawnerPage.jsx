import { useState } from 'react'
import { Rocket, Send, Loader2, CheckCircle, AlertCircle, Download, Globe, FileText, Briefcase, Clock } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { API_URL } from '../../config.js'

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers,
        },
        ...options,
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
    }
    return res.json()
}

const NICHES = [
    'Кофейня',
    'SMM-агентство',
    'Онлайн-образование',
    'Фитнес-коучинг',
    'Дизайн интерьеров',
    'E-commerce',
    'Консалтинг для бизнеса',
]

export function BusinessSpawnerPage() {
    const [niche, setNiche] = useState(NICHES[0])
    const [budgetFrom, setBudgetFrom] = useState('10000')
    const [budgetTo, setBudgetTo] = useState('50000')
    const [audience, setAudience] = useState('')
    const [city, setCity] = useState('')
    const [loading, setLoading] = useState(false)
    [result, setResult] = useState(null)
    [error, setError] = useState(null)
    [downloading, setDownloading] = useState(false)

    const runSpawn = async () => {
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const data = await api('/business-spawner/spawn', {
                method: 'POST',
                body: JSON.stringify({
                    niche,
                    budgetFrom: Number(budgetFrom) || 0,
                    budgetTo: Number(budgetTo) || 0,
                    audience,
                    city,
                    skipBoardroom: false,
                }),
            })
            setResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const downloadZip = async () => {
        if (!result) return
        setDownloading(true)
        try {
            const zip = new JSZip()
            zip.file('landing.html', result.landing?.html || '<html><body><h1>Landing</h1></body></html>')
            zip.file('brandbook.json', JSON.stringify(result.brandbook || {}, null, 2))
            zip.file('content-plan.json', JSON.stringify(result.contentPlan || [], null, 2))
            zip.file('payments.json', JSON.stringify(result.payments || {}, null, 2))
            zip.file('research.md', result.research || '')
            zip.file('instructions.md', result.instructions || '')
            const blob = await zip.generateAsync({ type: 'blob' })
            saveAs(blob, `omega-business-${(result.brandbook?.name || 'startup').replace(/\s+/g, '-')}.zip`)
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Rocket className="text-purple-400" size={28} />
                    Рождение бизнеса за 48 часов
                </h1>
                <p className="text-sm text-gray-400 mt-1">OMEGA создаст стартап: исследование, бренд, лендинг, тарифы и контент-план.</p>
            </div>

            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Ниша</label>
                        <select
                            value={niche}
                            onChange={e => setNiche(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/30"
                        >
                            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Целевая аудитория</label>
                        <input
                            value={audience}
                            onChange={e => setAudience(e.target.value)}
                            placeholder="Например: владельцы малого бизнеса 25-45"
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Бюджет от (₽)</label>
                        <input
                            type="number"
                            value={budgetFrom}
                            onChange={e => setBudgetFrom(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/30"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Бюджет до (₽)</label>
                        <input
                            type="number"
                            value={budgetTo}
                            onChange={e => setBudgetTo(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/30"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm text-gray-400 mb-1.5 block">Город / регион</label>
                        <input
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="Москва или online"
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                        />
                    </div>
                </div>
                <button
                    onClick={runSpawn}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {loading ? 'OMEGA работает...' : 'Запустить создание бизнеса'}
                </button>
            </div>

            {error && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {result?.status === 'rejected' && (
                <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-400 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    Совет директоров не одобрил идею: {result.recommendation}
                </div>
            )}

            {result?.status === 'ok' && (
                <div className="space-y-6">
                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Briefcase size={18} className="text-purple-400" /> {result.brandbook?.name}
                                </h2>
                                <p className="text-sm text-gray-400">{result.brandbook?.tagline}</p>
                            </div>
                            <button
                                onClick={downloadZip}
                                disabled={downloading}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                                <Download size={16} />
                                {downloading ? 'Архивирование...' : 'Скачать ZIP'}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(result.brandbook?.colors || []).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300">
                                    <span className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                                    {c}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-300">{result.brandbook?.tone}</p>
                    </div>

                    <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-purple-400" /> Прогресс
                        </h2>
                        <div className="space-y-3">
                            {result.steps?.map(step => (
                                <div key={step.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-3">
                                        {step.status === 'done' ? <CheckCircle size={16} className="text-emerald-400" /> : <Clock size={16} className="text-gray-500" />}
                                        <div>
                                            <div className="text-sm text-white">{step.title}</div>
                                            <div className="text-[10px] text-gray-500">ETA: {step.eta}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400">{step.result || step.status}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {result.landing?.html && (
                        <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                                <Globe size={18} className="text-purple-400" /> Лендинг
                            </h2>
                            <p className="text-sm text-gray-400 mb-3">Готовый HTML-файл включён в ZIP-архив.</p>
                            <a
                                href={`data:text/html;charset=utf-8,${encodeURIComponent(result.landing.html)}`}
                                download="landing.html"
                                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                            >
                                <FileText size={14} /> Предпросмотр landing.html
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default BusinessSpawnerPage
