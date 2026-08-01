import { useState, useEffect } from 'react'
import { Copy, Sparkles, LayoutTemplate, Calendar, Check, Loader2, Search } from 'lucide-react'
import { omegaApi } from '../../../../services/api'

const CATEGORIES = {
    hooks: 'Хуки',
    aida: 'AIDA',
    pas: 'PAS',
    email: 'Email',
    shorts: 'Shorts',
}

export function TemplatesTab() {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [variables, setVariables] = useState({})
    const [generating, setGenerating] = useState(false)
    const [result, setResult] = useState(null)
    const [copied, setCopied] = useState(false)
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [error, setError] = useState('')

    useEffect(() => {
        omegaApi.templates().then(res => {
            setTemplates(res?.data || [])
        }).catch(err => {
            setError(err.message || 'Не удалось загрузить шаблоны')
        }).finally(() => setLoading(false))
    }, [])

    const selectTemplate = (t) => {
        setSelected(t)
        const initial = {}
        t.variables.forEach(v => initial[v] = '')
        setVariables(initial)
        setResult(null)
        setCopied(false)
    }

    const generate = async () => {
        if (!selected) return
        setGenerating(true)
        setError('')
        try {
            const res = await omegaApi.generateTemplate(selected.id, variables, true)
            setResult(res?.data || null)
        } catch (err) {
            setError(err.message || 'Ошибка генерации')
        } finally {
            setGenerating(false)
        }
    }

    const copy = () => {
        const text = result?.aiText || result?.text || ''
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    const schedule = () => {
        const text = result?.aiText || result?.text || ''
        localStorage.setItem('draft_scheduler_post', JSON.stringify({ title: selected?.name, description: text, platforms: ['instagram'] }))
        window.location.href = '/owner?tab=scheduler'
    }

    const filtered = templates.filter(t => {
        const matchesCategory = activeCategory === 'all' || t.category === activeCategory
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
        return matchesCategory && matchesSearch
    })

    if (loading) return <div className="p-8 text-center text-gray-500 text-sm"><Loader2 className="animate-spin mx-auto mb-2" /> Загрузка шаблонов...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-white">50+ AI-шаблонов</h2>
                    <p className="text-sm text-gray-500 mt-1">Готовые структуры постов, email, Shorts и хуков</p>
                </div>
                <div className="text-xs text-gray-500">Всего: {templates.length} шаблонов</div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCategory === 'all' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                    Все
                </button>
                {Object.entries(CATEGORIES).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveCategory(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCategory === key ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        {label}
                    </button>
                ))}
                <div className="relative ml-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск шаблонов..."
                        className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.map(t => (
                        <button
                            key={t.id}
                            onClick={() => selectTemplate(t)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                                selected?.id === t.id
                                    ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">{CATEGORIES[t.category] || t.category}</span>
                                <LayoutTemplate size={14} className="text-gray-500" />
                            </div>
                            <div className="text-sm font-medium text-white">{t.name}</div>
                            <div className="text-xs text-gray-500 mt-1">Переменные: {t.variables.join(', ')}</div>
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-2 space-y-4">
                    {selected ? (
                        <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-[#8B5CF6] uppercase tracking-wider mb-1">{CATEGORIES[selected.category] || selected.category}</div>
                                    <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selected.variables.map(v => (
                                    <div key={v}>
                                        <label className="text-xs text-gray-500 capitalize">{v}</label>
                                        <input
                                            value={variables[v] || ''}
                                            onChange={e => setVariables({ ...variables, [v]: e.target.value })}
                                            placeholder={v}
                                            className="w-full mt-1 px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={generate}
                                disabled={generating || selected.variables.some(v => !variables[v])}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors disabled:opacity-50"
                            >
                                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {generating ? 'Генерация...' : 'Сгенерировать через AI'}
                            </button>

                            {result && (
                                <div className="space-y-3">
                                    <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/10 text-sm text-gray-300 whitespace-pre-line min-h-[120px]">
                                        {result.aiText || result.text}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={copy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white transition-colors">
                                            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            {copied ? 'Скопировано' : 'Копировать'}
                                        </button>
                                        <button onClick={schedule} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs transition-colors">
                                            <Calendar size={14} /> В планировщик
                                        </button>
                                    </div>
                                    {result.aiText && (
                                        <div className="text-[10px] text-gray-500">AI-расширение через {result.provider || 'AI'}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-sm">
                            <LayoutTemplate size={40} className="mb-3 opacity-30" />
                            Выберите шаблон слева
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TemplatesTab
