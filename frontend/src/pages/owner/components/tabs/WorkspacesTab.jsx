import { useState, useEffect } from 'react'
import { workspaceApi } from '../../../../services/api'
import { Briefcase, Plus, Trash2, Star, Check, X } from 'lucide-react'

export function WorkspacesTab({ data }) {
    const [workspaces, setWorkspaces] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [form, setForm] = useState({ name: '', niche: '', description: '' })
    const [editing, setEditing] = useState(null)

    const load = async () => {
        try {
            setLoading(true)
            const res = await workspaceApi.list()
            setWorkspaces(res.data || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleCreate = async () => {
        if (!form.name.trim()) return
        try {
            await workspaceApi.create(form)
            setForm({ name: '', niche: '', description: '' })
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleSetDefault = async (id) => {
        try {
            await workspaceApi.setDefault(id)
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Удалить проект?')) return
        try {
            await workspaceApi.delete(id)
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleUpdate = async (id) => {
        try {
            await workspaceApi.update(id, editing)
            setEditing(null)
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text)]">Multi-Project Workspaces</h2>
                    <p className="text-sm text-gray-500 mt-1">Один аккаунт — несколько брендов/клиентов. У каждого проекта свой контекст OMEGA.</p>
                </div>
            </div>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-sm">{error}</div>}

            <div className="rounded-2xl bg-white/[0.03] border border-[var(--border)] p-5">
                <h3 className="text-sm font-medium text-[var(--text)] mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Новый проект</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название проекта" className="bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" />
                    <input value={form.niche} onChange={e => setForm(p => ({ ...p, niche: e.target.value }))} placeholder="Ниша" className="bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" />
                    <button onClick={handleCreate} className="px-4 py-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Создать</button>
                </div>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание (опционально)" className="mt-3 w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && <div className="text-sm text-gray-500">Загрузка...</div>}
                {workspaces.map(ws => (
                    <div key={ws._id} className={`rounded-2xl bg-white/[0.03] border p-5 ${ws.isDefault ? 'border-[#8b5cf6]/50' : 'border-[var(--border)]'}`}>
                        {editing?._id === ws._id ? (
                            <div className="space-y-3">
                                <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm" />
                                <input value={editing.niche} onChange={e => setEditing(p => ({ ...p, niche: e.target.value }))} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm" />
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdate(ws._id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Сохранить</button>
                                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs flex items-center gap-1"><X className="w-3 h-3" /> Отмена</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-[#8b5cf6]/10"><Briefcase className="w-4 h-4 text-[#8b5cf6]" /></div>
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text)]">{ws.name}</div>
                                            {ws.isDefault && <span className="text-[10px] text-[#8b5cf6]">Default</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {!ws.isDefault && (
                                            <button onClick={() => handleSetDefault(ws._id)} title="Сделать default" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                                                <Star className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button onClick={() => setEditing(ws)} title="Редактировать" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">✎</button>
                                        <button onClick={() => handleDelete(ws._id)} title="Удалить" className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 mb-2">{ws.niche || 'Ниша не указана'}</div>
                                <div className="text-xs text-gray-600 line-clamp-2">{ws.description || 'Нет описания'}</div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default WorkspacesTab
