import { useState, useEffect } from 'react'
import { Copy, Sparkles, LayoutTemplate, Calendar, Check, Loader2, Search, TrendingUp, Archive, Flame } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { omegaApi, selfImprovementApi } from '../../../../services/api'

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
    const [showProvenOnly, setShowProvenOnly] = useState(false)
    const [stats, setStats] = useState(null)
    const [error, setError] = useState('')
    const [smartOpen, setSmartOpen] = useState(false)
    const [smartGoal, setSmartGoal] = useState('')
    const [smartFormat, setSmartFormat] = useState('')
    const [smartLoading, setSmartLoading] = useState(false)
    const [smartResult, setSmartResult] = useState(null)
    const [expandedWhy, setExpandedWhy] = useState(null)

    useEffect(() => {
        Promise.all([
            omegaApi.templates(),
            selfImprovementApi.templateStats().catch(() => null),
        ]).then(([templatesRes, statsRes]) => {
            const loaded = templatesRes?.data || []
            // Merge badge/status from evolution stats if available
            const byId = statsRes?.data?.byId || {}
            setTemplates(loaded.map(t => ({
                ...t,
                badge: byId[t.id]?.badge || t.badge,
                metrics: byId[t.id]?.metrics || t.metrics,
            })))
            setStats(statsRes?.data || null)
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
        const matchesProven = !showProvenOnly || t.metrics?.status === 'proven'
        return matchesCategory && matchesSearch && matchesProven
    })

    const runSmartSelection = async () => {
        if (!smartGoal || !smartFormat) return
        setSmartLoading(true)
        setSmartResult(null)
        setExpandedWhy(null)
        try {
            const prompt = `Я выбираю шаблон для контента. Цель: ${smartGoal}. Формат: ${smartFormat}. Вот список шаблонов (id, name, category, metrics): ${JSON.stringify(
                templates.slice(0, 50).map(t => ({ id: t.id, name: t.name, category: t.category, metrics: t.metrics }))
            )}. Предложи ТОП-3 лучших шаблона с id и кратким обоснованием (почему этот, какой ожидаемый CTR/эффект). Ответь строго JSON: { "recommendations": [{ "id", "name", "reason", "expectedEffect" }] }`
            const res = await omegaApi.chat(prompt, [], 'ru')
            const text = res?.data?.response || ''
            try {
                const match = text.match(/\{[\s\S]*\}/)
                const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
                if (parsed?.recommendations?.length) {
                    setSmartResult(parsed.recommendations.slice(0, 3))
                } else {
                    setSmartResult([])
                }
            } catch (e) {
                console.warn('[TemplatesTab] smart parse failed')
                setSmartResult([])
            }
        } catch (err) {
            setError(err.message || 'Ошибка умного выбора')
        } finally {
            setSmartLoading(false)
        }
    }

    const applySmartRecommendation = (id) => {
        const t = templates.find(x => x.id === id)
        if (t) selectTemplate(t)
    }

    if (loading) return <div className="p-8 text-center text-gray-500 text-sm"><Loader2 className="animate-spin mx-auto mb-2" /> Загрузка шаблонов...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-white">50+ AI-шаблонов</h2>
                    <p className="text-sm text-gray-500 mt-1">Готовые структуры постов, email, Shorts и хуков</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSmartOpen(!smartOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            smartOpen ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                    >
                        <Sparkles size={14} /> Умный выбор
                    </button>
                    <div className="text-xs text-gray-500">Всего: {templates.length} шаблонов</div>
                </div>
            </div>

            {smartOpen && (
                <div className="rounded-2xl bg-[#0f0f1a] border border-[#8B5CF6]/20 p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles size={16} className="text-[#8B5CF6]" /> Умный подбор шаблона</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                        <select
                            value={smartGoal}
                            onChange={e => setSmartGoal(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[#0a0a0f] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]/30"
                        >
                            <option value="" className="bg-[#0a0a0f]">Цель контента</option>
                            <option value="продажи" className="bg-[#0a0a0f]">Продажи</option>
                            <option value="узнаваемость" className="bg-[#0a0a0f]">Узнаваемость</option>
                            <option value="подписчики" className="bg-[#0a0a0f]">Подписчики</option>
                            <option value="engagement" className="bg-[#0a0a0f]">Engagement</option>
                        </select>
                        <select
                            value={smartFormat}
                            onChange={e => setSmartFormat(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[#0a0a0f] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]/30"
                        >
                            <option value="" className="bg-[#0a0a0f]">Формат</option>
                            <option value="Reels" className="bg-[#0a0a0f]">Reels</option>
                            <option value="Stories" className="bg-[#0a0a0f]">Stories</option>
                            <option value="Карусель" className="bg-[#0a0a0f]">Карусель</option>
                            <option value="Пост" className="bg-[#0a0a0f]">Пост</option>
                        </select>
                    </div>
                    <button
                        onClick={runSmartSelection}
                        disabled={smartLoading || !smartGoal || !smartFormat}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-sm font-medium disabled:opacity-50"
                    >
                        {smartLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {smartLoading ? 'Анализируем...' : 'Подобрать ТОП-3'}
                    </button>

                    {smartResult && smartResult.length === 0 && (
                        <p className="text-sm text-gray-500">Не удалось подобрать. Попробуйте изменить цель или формат.</p>
                    )}

                    {smartResult && smartResult.length > 0 && (
                        <div className="space-y-3">
                            {smartResult.map((rec, idx) => {
                                const t = templates.find(x => x.id === rec.id)
                                return (
                                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-sm font-medium text-white">{rec.name || t?.name || rec.id}</div>
                                            <button
                                                onClick={() => applySmartRecommendation(rec.id)}
                                                className="text-xs px-2 py-1 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30"
                                            >
                                                Использовать
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-2">{rec.reason}</p>
                                        <button
                                            onClick={() => setExpandedWhy(expandedWhy === idx ? null : idx)}
                                            className="text-xs text-[#8B5CF6] hover:text-[#a78bfa]"
                                        >
                                            {expandedWhy === idx ? 'Скрыть' : 'Почему этот?'}
                                        </button>
                                        {expandedWhy === idx && (
                                            <div className="mt-2 p-2 rounded-lg bg-[#0a0a0f] text-xs text-gray-300">
                                                {rec.expectedEffect || rec.reason}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

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

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                        <div className="text-xs text-gray-500">Всего</div>
                        <div className="text-lg font-semibold text-white">{stats.total}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                        <div className="text-xs text-emerald-400 flex items-center gap-1"><Flame size={10} /> Proven</div>
                        <div className="text-lg font-semibold text-white">{stats.proven}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                        <div className="text-xs text-yellow-400">New</div>
                        <div className="text-lg font-semibold text-white">{stats.new}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                        <div className="text-xs text-gray-400 flex items-center gap-1"><Archive size={10} /> Archived</div>
                        <div className="text-lg font-semibold text-white">{stats.archived}</div>
                    </div>
                </div>
            )}

            {stats && Object.keys(stats.byCategory || {}).length > 0 && (
                <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-purple-400" /> Эффективность по категориям
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.entries(stats.byCategory).map(([name, data]) => ({ name, avgCtr: data.avgCtr, proven: data.proven }))}>
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                                <YAxis stroke="#6b7280" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Bar dataKey="avgCtr" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowProvenOnly(!showProvenOnly)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showProvenOnly ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                    {showProvenOnly ? '✓ Только proven' : 'Показать только proven'}
                </button>
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
                                <div className="flex items-center gap-1.5">
                                    {t.metrics?.status === 'proven' && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                                            <Flame size={10} /> 🔥 Proven
                                        </span>
                                    )}
                                    {t.metrics?.status === 'archived' && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-500/10 text-gray-400 text-[10px] font-medium">
                                            <Archive size={10} /> 📦 Archived
                                        </span>
                                    )}
                                    {(!t.metrics?.status || t.metrics?.status === 'new') && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-medium">
                                            🆕 New
                                        </span>
                                    )}
                                    <LayoutTemplate size={14} className="text-gray-500" />
                                </div>
                            </div>
                            <div className="text-sm font-medium text-white">{t.name}</div>
                            <div className="text-xs text-gray-500 mt-1">Переменные: {t.variables.join(', ')}</div>
                            {typeof t.metrics?.ctr === 'number' && (
                                <div className="text-[10px] text-gray-500 mt-1">CTR: {t.metrics.ctr}% · Samples: {t.metrics.samples || 0}</div>
                            )}
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
