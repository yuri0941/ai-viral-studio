import { useEffect, useState, useCallback } from 'react'
import { Map, AlertTriangle, CheckCircle, Clock, RefreshCw, GripVertical, ChevronDown, ChevronUp, Plus, Save, Sparkles } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const PHASE_COLORS = {
    planned: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    in_progress: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    testing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    released: 'bg-green-500/20 text-green-300 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const PHASE_LABELS = {
    planned: 'Запланировано',
    in_progress: 'В работе',
    testing: 'Тестирование',
    released: 'Выпущено',
    cancelled: 'Отменено',
}

const PRIORITY_COLORS = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-blue-400',
    low: 'text-slate-400',
}

function PhaseBadge({ phase }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs border ${PHASE_COLORS[phase] || PHASE_COLORS.planned}`}>
            {PHASE_LABELS[phase] || phase}
        </span>
    )
}

function RoadmapCard({ item, onUpdate, onDelete, dragProps }) {
    const [expanded, setExpanded] = useState(false)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState(item)

    const save = async () => {
        await onUpdate(item._id, form)
        setEditing(false)
    }

    return (
        <div
            {...dragProps}
            className="glass-card rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors"
        >
            <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-[var(--text-muted)] mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    {editing ? (
                        <div className="space-y-2">
                            <input
                                className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-[var(--primary)] outline-none"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                            <textarea
                                className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-[var(--primary)] outline-none"
                                rows={2}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                            <div className="flex flex-wrap gap-2">
                                <select
                                    className="bg-white/10 rounded-lg px-2 py-1 text-sm"
                                    value={form.phase}
                                    onChange={(e) => setForm({ ...form, phase: e.target.value })}
                                >
                                    {Object.keys(PHASE_LABELS).map((p) => (
                                        <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                                    ))}
                                </select>
                                <select
                                    className="bg-white/10 rounded-lg px-2 py-1 text-sm"
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                >
                                    <option value="critical">Критично</option>
                                    <option value="high">Высоко</option>
                                    <option value="medium">Средне</option>
                                    <option value="low">Низко</option>
                                </select>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="w-20 bg-white/10 rounded-lg px-2 py-1 text-sm"
                                    value={form.progress}
                                    onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={save}
                                    className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-xs hover:opacity-90 min-h-[44px]"
                                >
                                    Сохранить
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditing(false); setForm(item) }}
                                    className="px-3 py-1 rounded-lg bg-white/10 text-xs hover:bg-white/20 min-h-[44px]"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                                <PhaseBadge phase={item.phase} />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className={PRIORITY_COLORS[item.priority] || 'text-slate-400'}>
                                    {item.priority?.toUpperCase()}
                                </span>
                                <span className="text-[var(--text-muted)]">{item.progress}%</span>
                                {item.eta && (
                                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(item.eta).toLocaleDateString('ru-RU')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="text-xs text-[var(--primary)] hover:underline min-h-[44px]"
                                >
                                    Редактировать
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(item._id)}
                                    className="text-xs text-red-400 hover:underline min-h-[44px]"
                                >
                                    Удалить
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(!expanded)}
                                    className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1 ml-auto min-h-[44px]"
                                >
                                    Риски {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                            </div>
                            {expanded && (
                                <div className="mt-3 p-3 rounded-lg bg-white/5 space-y-2 text-xs">
                                    {item.risks?.length ? (
                                        <div>
                                            <span className="text-red-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Риски:
                                            </span>
                                            <ul className="list-disc list-inside mt-1 text-[var(--text-muted)]">
                                                {item.risks.map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        </div>
                                    ) : (
                                        <span className="text-[var(--text-muted)]">Нет указанных рисков</span>
                                    )}
                                    {item.mitigation?.length ? (
                                        <div>
                                            <span className="text-green-400 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Mitigation:
                                            </span>
                                            <ul className="list-disc list-inside mt-1 text-[var(--text-muted)]">
                                                {item.mitigation.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function OmegaRoadmap() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [draggingId, setDraggingId] = useState(null)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/items`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to load roadmap')
            const json = await res.json()
            setItems(json.data?.items || [])
            setError(null)
        } catch (err) {
            setError(err.message)
            console.error('[OmegaRoadmap]', err.message)
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => { load() }, [load])

    const updateItem = async (id, data) => {
        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/items/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Failed to update')
            await load()
        } catch (err) {
            console.error(err.message)
        }
    }

    const deleteItem = async (id) => {
        if (!confirm('Удалить пункт roadmap?')) return
        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/items/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to delete')
            await load()
        } catch (err) {
            console.error(err.message)
        }
    }

    const analyze = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/items/analyze`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to analyze')
            const json = await res.json()
            setAnalysis(json.data?.warnings || [])
        } catch (err) {
            console.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const recalculate = async () => {
        setLoading(true)
        try {
            await fetch(`${API_BASE_URL}/roadmap/items/recalculate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            await load()
        } catch (err) {
            console.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const createItem = async () => {
        const title = prompt('Название новой задачи:')
        if (!title) return
        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title, month: 1, priority: 'medium' }),
            })
            if (!res.ok) throw new Error('Failed to create')
            await load()
        } catch (err) {
            console.error(err.message)
        }
    }

    const grouped = {}
    for (let i = 1; i <= 6; i++) grouped[i] = []
    items.forEach((item) => {
        const m = Math.min(Math.max(item.month || 1, 1), 6)
        grouped[m].push(item)
    })

    const handleDragStart = (e, id) => {
        setDraggingId(id)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e, month) => {
        e.preventDefault()
        if (!draggingId) return
        await updateItem(draggingId, { month })
        setDraggingId(null)
    }

    const monthTitle = (m) => {
        const titles = {
            1: 'Месяц 1: Стабилизация и первые клиенты',
            2: 'Месяц 2: iOS и AI-видео',
            3: 'Месяц 3: Маркетплейс и API',
            4: 'Месяц 4: AI-аватар и голос',
            5: 'Месяц 5: Blockchain/NFT',
            6: 'Месяц 6: Enterprise и White-label',
        }
        return titles[m] || `Месяц ${m}`
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Map className="w-6 h-6 text-[var(--primary)]" />
                        6-месячный Roadmap
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Планы OMEGA с рисками и mitigation</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={createItem}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm hover:opacity-90 min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" /> Добавить
                    </button>
                    <button
                        type="button"
                        onClick={recalculate}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm hover:bg-white/5 disabled:opacity-50 min-h-[44px]"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Пересчитать ETA
                    </button>
                    <button
                        type="button"
                        onClick={analyze}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm hover:bg-white/5 disabled:opacity-50 min-h-[44px]"
                    >
                        <Sparkles className="w-4 h-4" /> OMEGA, проанализируй риски
                    </button>
                </div>
            </div>

            {analysis && (
                <div className="glass-card rounded-2xl p-4 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                        Результат анализа рисков
                    </h3>
                    {analysis.length ? (
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                            {analysis.map((w, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    {w}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-green-400 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Рисков не обнаружено
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(grouped).map(([month, list]) => (
                    <div
                        key={month}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, Number(month))}
                        className="glass-card rounded-2xl p-4 min-h-[200px] flex flex-col"
                    >
                        <h3 className="font-bold text-sm mb-3 pb-2 border-b border-white/10">{monthTitle(Number(month))}</h3>
                        <div className="flex-1">
                            {list.length ? (
                                list.map((item) => (
                                    <div
                                        key={item._id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item._id)}
                                    >
                                        <RoadmapCard
                                            item={item}
                                            onUpdate={updateItem}
                                            onDelete={deleteItem}
                                            dragProps={{}}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] text-center py-6">Перетащите задачу сюда</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
