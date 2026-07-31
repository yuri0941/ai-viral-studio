import { useEffect, useState, useMemo } from 'react'
import { Database, Search, Layers, Trash2, ChevronRight, MessageSquare } from 'lucide-react'
import { useOmegaMemory } from '../../../../hooks/useOmegaMemory'
import { omegaApi } from '../../../../services/api.js'

const LEVEL_META = {
    short_term: { label: 'Short-term', color: 'blue', description: 'Текущий диалог' },
    working: { label: 'Working', color: 'purple', description: 'Активные задачи' },
    long_term: { label: 'Long-term', color: 'emerald', description: 'Важные факты' },
    semantic: { label: 'Semantic', color: 'orange', description: 'Знания о предметной области' },
    procedural: { label: 'Procedural', color: 'yellow', description: 'Инструкции и шаблоны' },
    episodic: { label: 'Episodic', color: 'pink', description: 'События и кейсы' },
    owner_profile: { label: 'Owner Profile', color: 'emerald', description: 'Профиль владельца' },
    emotional: { label: 'Emotional', color: 'red', description: 'Эмоциональная память' },
}

const LEVELS = Object.keys(LEVEL_META)

export function OmegaMemoryTab() {
    const memory = useOmegaMemory()
    const [activeLevel, setActiveLevel] = useState('short_term')
    const [query, setQuery] = useState('')
    const [newEntry, setNewEntry] = useState('')
    const [apiLoading, setApiLoading] = useState(true)
    const [apiEmpty, setApiEmpty] = useState(false)

    useEffect(() => {
        let cancelled = false
        setApiLoading(true)
        omegaApi.getMemory('', 1000)
            .then(payload => {
                if (cancelled) return
                const entries = Array.isArray(payload) ? payload : payload?.entries || payload?.data || []
                setApiEmpty(entries.length === 0)
                if (entries.length > 0) {
                    const grouped = Object.fromEntries(
                        Object.keys(memory.memory.levels || {}).map(level => [level, []])
                    )
                    entries.forEach(entry => {
                        if (!entry.level || !grouped[entry.level]) return
                        grouped[entry.level].push({
                            id: entry.id || memory.memory.generateId(),
                            level: entry.level,
                            content: entry.content,
                            tags: entry.tags || [],
                            weight: entry.weight ?? 1,
                            createdAt: entry.createdAt || new Date().toISOString(),
                            accessCount: 0,
                            lastAccessed: new Date().toISOString(),
                            expiresAt: entry.expiresAt || null,
                        })
                    })
                    memory.memory.levels = grouped
                    memory.memory.persist()
                    memory.refresh()
                }
            })
            .catch(err => {
                console.error('[OmegaMemoryTab] getMemory error:', err)
                setApiEmpty(true)
            })
            .finally(() => setApiLoading(false))
        return () => { cancelled = true }
    }, [memory])

    const summary = memory.summary
    const entries = useMemo(() => {
        const list = memory.getLevel(activeLevel)
        if (!query) return list
        const lower = query.toLowerCase()
        return list.filter(e =>
            JSON.stringify(e.content).toLowerCase().includes(lower) ||
            e.tags?.some(t => t.toLowerCase().includes(lower))
        )
    }, [memory, activeLevel, query])

    const totalEntries = Object.values(summary).reduce((a, s) => a + s.count, 0)

    const addEntry = () => {
        if (!newEntry.trim()) return
        memory.store(activeLevel, {
            content: newEntry.trim(),
            tags: ['manual', activeLevel],
            weight: 1,
        })
        setNewEntry('')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Database size={20} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">OMEGA Memory</h2>
                </div>
                <div className="text-xs text-gray-500">Всего записей: <span className="text-white">{totalEntries}</span></div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                {LEVELS.map(level => {
                    const meta = LEVEL_META[level]
                    const count = summary[level]?.count || 0
                    return (
                        <button
                            key={level}
                            onClick={() => setActiveLevel(level)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                                activeLevel === level
                                    ? 'bg-purple-500/10 border-purple-500/30'
                                    : 'bg-[#0f0f1a] border-white/5 hover:border-white/15'
                            }`}
                        >
                            <Layers size={14} className={`text-${meta.color}-400 mb-2`} />
                            <div className="text-xs text-white truncate">{meta.label}</div>
                            <div className="text-[10px] text-gray-500">{count} записей</div>
                        </button>
                    )
                })}
            </div>

            {/* Active level */}
            <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-sm font-semibold text-white">{LEVEL_META[activeLevel].label}</div>
                        <div className="text-[10px] text-gray-500">{LEVEL_META[activeLevel].description}</div>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Поиск..."
                            className="bg-white/5 border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                        />
                    </div>
                </div>

                {/* Add entry */}
                <div className="flex items-center gap-2 mb-4">
                    <input
                        value={newEntry}
                        onChange={e => setNewEntry(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addEntry()}
                        placeholder="Добавить запись в этот уровень..."
                        className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                    />
                    <button
                        onClick={addEntry}
                        className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                    >
                        Добавить
                    </button>
                </div>

                {/* Timeline */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {entries.length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-8 space-y-3">
                            <p>История диалогов появится здесь</p>
                            <button
                                onClick={() => {
                                    const text = window.prompt('Напишите сообщение OMEGA:')
                                    if (text?.trim()) {
                                        memory.store('short_term', { content: text.trim(), tags: ['manual', 'short_term'], weight: 1 })
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors"
                            >
                                <MessageSquare size={14} /> Написать OMEGA
                            </button>
                        </div>
                    )}
                    {entries.slice().reverse().map(entry => (
                        <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <ChevronRight size={14} className="text-gray-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-white break-words">{typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content)}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    {entry.tags?.map(tag => (
                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{tag}</span>
                                    ))}
                                    <span className="text-[10px] text-gray-500">{new Date(entry.createdAt).toLocaleString('ru-RU')}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => memory.forget(activeLevel, entry.id)}
                                className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default OmegaMemoryTab
