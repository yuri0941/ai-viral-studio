import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Database, Search, Trash2, Download, ChevronDown, ChevronUp, Brain, Layers } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

function Progress({ value, color }) {
    return (
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full transition-all rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
        </div>
    )
}

function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleString('ru-RU')
}

export default function OmegaMemoryExplorer() {
    const { t } = useTranslation()
    const LAYERS = useMemo(() => [
        { id: 'short_term', label: t('memoryExplorer.layers.short_term'), color: '#8B5CF6', icon: Brain },
        { id: 'working', label: t('memoryExplorer.layers.working'), color: '#06B6D4', icon: Layers },
        { id: 'long_term', label: t('memoryExplorer.layers.long_term'), color: '#10b981', icon: Database },
        { id: 'semantic', label: t('memoryExplorer.layers.semantic'), color: '#F59E0B', icon: Brain },
        { id: 'procedural', label: t('memoryExplorer.layers.procedural'), color: '#EC4899', icon: Layers },
        { id: 'episodic', label: t('memoryExplorer.layers.episodic'), color: '#6366f1', icon: Database },
        { id: 'owner_profile', label: t('memoryExplorer.layers.owner_profile'), color: '#14b8a6', icon: Brain },
        { id: 'emotional', label: t('memoryExplorer.layers.emotional'), color: '#F97316', icon: Layers },
        // [v9.9.19.14] 4 новых слоя (8 существующих сохранены без изменений)
        { id: 'prospective', label: t('memoryExplorer.layers.prospective'), color: '#A78BFA', icon: Brain },
        { id: 'metacognitive', label: t('memoryExplorer.layers.metacognitive'), color: '#22D3EE', icon: Layers },
        { id: 'social', label: t('memoryExplorer.layers.social'), color: '#34D399', icon: Database },
        { id: 'instrumental', label: t('memoryExplorer.layers.instrumental'), color: '#FBBF24', icon: Layers },
    ], [t])
    const [layers, setLayers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [openLayer, setOpenLayer] = useState(null)
    const [search, setSearch] = useState('')
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const load = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/memory/layers`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to load memory')
            const json = await res.json()
            setLayers(json.data?.layers || [])
            setError(null)
        } catch (err) {
            setError(err.message)
            console.error('[OmegaMemoryExplorer]', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const clearLayer = async (layerId) => {
        if (!confirm(t('memoryExplorer.clearConfirm'))) return
        try {
            const res = await fetch(`${API_BASE_URL}/omega/memory/layers/${layerId}/clear`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to clear')
            await load()
        } catch (err) {
            console.error(err.message)
        }
    }

    const exportLayer = (layer) => {
        const data = layer.entries.map(e => JSON.stringify(e)).join('\n')
        const blob = new Blob([data], { type: 'application/jsonl' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `omega-memory-${layer.id}-${new Date().toISOString().slice(0, 10)}.jsonl`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filtered = useMemo(() => {
        if (!search.trim()) return layers
        const q = search.toLowerCase()
        return layers.map(layer => ({
            ...layer,
            entries: (layer.entries || []).filter(e =>
                JSON.stringify(e.content || '').toLowerCase().includes(q) ||
                (e.tags || []).some(t => t.toLowerCase().includes(q))
            ),
        }))
    }, [layers, search])

    const totalRecords = layers.reduce((sum, l) => sum + (l.count || 0), 0)

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Database className="w-6 h-6 text-[var(--primary)]" />
                        {t('memoryExplorer.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{t('memoryExplorer.subtitle', { count: totalRecords })}</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('memoryExplorer.searchPlaceholder')}
                        className="pl-9 pr-4 py-2 rounded-xl glass-card bg-transparent text-sm w-full md:w-64"
                    />
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {LAYERS.map(layerDef => {
                    const data = filtered.find(l => l.id === layerDef.id) || { count: 0, entries: [], fill: 0 }
                    const Icon = layerDef.icon
                    const isOpen = openLayer === layerDef.id
                    return (
                        <div key={layerDef.id} className="glass-card rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${layerDef.color}20` }}>
                                        <Icon className="w-4 h-4" style={{ color: layerDef.color }} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">{layerDef.label}</h3>
                                        <p className="text-xs text-[var(--text-muted)]">{t('memoryExplorer.records', { count: data.count || 0 })}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpenLayer(isOpen ? null : layerDef.id)}
                                    className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/5 text-[var(--text-muted)]"
                                >
                                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>
                            <Progress value={(data.fill || 0) * 100} color={layerDef.color} />

                            {isOpen && (
                                <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => exportLayer({ ...data, id: layerDef.id, entries: data.entries })}
                                            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-white/5 hover:bg-white/10 text-xs"
                                        >
                                            <Download className="w-3.5 h-3.5" /> {t('memoryExplorer.export')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => clearLayer(layerDef.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> {t('memoryExplorer.clear')}
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto omega-chat-scroll pr-1">
                                        {(data.entries || []).slice(0, 10).map((entry, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-white/5 text-xs space-y-1">
                                                <p className="text-[var(--text-muted)] line-clamp-3">
                                                    {typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content).slice(0, 200)}
                                                </p>
                                                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                                    <span>{entry.weight ? `weight: ${entry.weight}` : ''}</span>
                                                    <span>{formatDate(entry.createdAt)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {!data.entries?.length && (
                                            <p className="text-xs text-[var(--text-muted)] text-center py-4">{t('memoryExplorer.noRecords')}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
