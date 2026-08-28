import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../../../config.js'
import { Shield, Check, X, Loader2, RefreshCw, FileCode, AlertCircle } from 'lucide-react'

// [P19] added: OmegaCoder Sandbox approval panel

export function SandboxPanel() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(null)
    const [original, setOriginal] = useState('')
    const [actionLoading, setActionLoading] = useState(null)

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    async function fetchQueue() {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/coder/queue?status=pending`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') setItems(Array.isArray(json.data) ? json.data : [])
        } catch (err) {
            console.error('[SandboxPanel]', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchOriginal(filePath) {
        try {
            const res = await fetch(`${API_BASE_URL}/omega/coder/file?path=${encodeURIComponent(filePath)}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            setOriginal(json.status === 'success' ? json.data : '')
        } catch {
            setOriginal('')
        }
    }

    useEffect(() => {
        fetchQueue()
    }, [])

    useEffect(() => {
        if (selected) fetchOriginal(selected.filePath)
    }, [selected])

    async function handleApprove(patchId) {
        setActionLoading(patchId)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/coder/approve/${patchId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') {
                setItems(prev => prev.filter(i => i.patchId !== patchId))
                if (selected?.patchId === patchId) setSelected(null)
            }
        } catch (err) {
            console.error('[SandboxPanel:approve]', err)
        } finally {
            setActionLoading(null)
        }
    }

    async function handleReject(patchId) {
        setActionLoading(patchId)
        try {
            const res = await fetch(`${API_BASE_URL}/omega/coder/reject/${patchId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') {
                setItems(prev => prev.filter(i => i.patchId !== patchId))
                if (selected?.patchId === patchId) setSelected(null)
            }
        } catch (err) {
            console.error('[SandboxPanel:reject]', err)
        } finally {
            setActionLoading(null)
        }
    }

    const diffLines = () => {
        const originalLines = original.split('\n')
        const patchLines = (selected?.patch || '').split('\n')
        const max = Math.max(originalLines.length, patchLines.length)
        const out = []
        for (let i = 0; i < max; i++) {
            const oldLine = originalLines[i] ?? ''
            const newLine = patchLines[i] ?? ''
            const changed = oldLine !== newLine
            out.push({ oldLine, newLine, changed, lineNum: i + 1 })
        }
        return out
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                        <Shield className="w-6 h-6 text-[var(--primary)]" /> Sandbox Approval
                    </h2>
                    <p className="text-[var(--text-muted)] mt-1">Утверждение автоматических патчей OMEGA Coder</p>
                </div>
                <button type="button" onClick={fetchQueue} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Обновить
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-3">
                    {items.length === 0 && !loading && (
                        <div className="luxury-card p-6 text-center text-[var(--text-muted)]">
                            <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Нет патчей на рассмотрении</p>
                        </div>
                    )}
                    {items.map(item => (
                        <button type="button"
                            key={item.patchId}
                            onClick={() => setSelected(item)}
                            className={`w-full text-left luxury-card p-4 transition-all ${selected?.patchId === item.patchId ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]/20' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-[200px]">{item.filePath}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">pending</span>
                            </div>
                            <p className="text-sm text-[var(--text)] line-clamp-2">{item.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); handleApprove(item.patchId) }}
                                    disabled={actionLoading === item.patchId}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 disabled:opacity-50"
                                >
                                    {actionLoading === item.patchId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Принять
                                </button>
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); handleReject(item.patchId) }}
                                    disabled={actionLoading === item.patchId}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-50"
                                >
                                    <X size={12} /> Отклонить
                                </button>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-2 luxury-card p-4 min-h-[400px]">
                    {!selected ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                            <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">Выберите патч, чтобы увидеть diff</p>
                        </div>
                    ) : (
                        <div className="space-y-3 h-full flex flex-col">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text)]">{selected.description}</h3>
                                    <p className="text-xs text-[var(--text-muted)] font-mono">{selected.filePath}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => handleApprove(selected.patchId)} disabled={actionLoading === selected.patchId} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 disabled:opacity-50">
                                        {actionLoading === selected.patchId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Принять
                                    </button>
                                    <button type="button" onClick={() => handleReject(selected.patchId)} disabled={actionLoading === selected.patchId} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-50">
                                        <X size={12} /> Отклонить
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-xs font-mono">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-muted)]">
                                        <tr>
                                            <th className="px-2 py-1 w-10">#</th>
                                            <th className="px-2 py-1 w-1/2">Текущий</th>
                                            <th className="px-2 py-1 w-1/2">Патч</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diffLines().map((line) => (
                                            <tr key={line.lineNum} className={line.changed ? 'bg-yellow-500/5' : ''}>
                                                <td className="px-2 py-0.5 text-[var(--text-muted)] border-r border-[var(--border)]">{line.lineNum}</td>
                                                <td className={`px-2 py-0.5 border-r border-[var(--border)] whitespace-pre ${line.changed ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{line.oldLine}</td>
                                                <td className={`px-2 py-0.5 whitespace-pre ${line.changed ? 'text-emerald-400' : 'text-[var(--text)]'}`}>{line.newLine}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SandboxPanel
