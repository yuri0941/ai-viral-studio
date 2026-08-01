import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Rocket, OctagonAlert, Plus, Loader2, TrendingUp, Minus, Activity,
    Calendar, ArrowRight, X
} from 'lucide-react'
import { fleetApi, workspaceApi } from '../../../../services/api.js'

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white"><X className="w-5 h-5" /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

export function FleetTab() {
    const navigate = useNavigate()
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [form, setForm] = useState({ name: '', niche: '', color: '#00ff41' })

    useEffect(() => {
        loadFleet()
    }, [])

    const loadFleet = async () => {
        setLoading(true)
        try {
            const res = await fleetApi.summary()
            setProjects(res.data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const emergencyStop = async () => {
        if (!confirm('Остановить все AI-операции для всего Fleet?')) return
        try {
            await fleetApi.emergencyStop()
            alert('Emergency Stop активирован')
        } catch (err) {
            alert(err.message)
        }
    }

    const createProject = async (e) => {
        e.preventDefault()
        try {
            await workspaceApi.create({
                name: form.name,
                niche: form.niche,
                settings: { color: form.color },
            })
            setCreateOpen(false)
            setForm({ name: '', niche: '', color: '#00ff41' })
            loadFleet()
        } catch (err) {
            alert(err.message)
        }
    }

    const statusBadge = (status) => {
        if (status === 'growing') return { icon: TrendingUp, text: 'Растёт', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
        if (status === 'declining') return { icon: Minus, text: 'Падает', color: 'text-red-400', bg: 'bg-red-500/10' }
        return { icon: Activity, text: 'Стабильно', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Rocket className="w-6 h-6 text-[#00ff41]" />
                    Fleet / Проекты
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00d936] rounded-xl text-black font-medium text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Создать проект
                    </button>
                    <button
                        onClick={emergencyStop}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium text-sm transition-colors"
                    >
                        <OctagonAlert className="w-4 h-4" /> STOP FLEET
                    </button>
                </div>
            </div>

            {loading && projects.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#00ff41] animate-spin" />
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl p-8 text-center">
                    <Rocket className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-white font-medium">Пока нет проектов</p>
                    <p className="text-sm text-gray-400 mt-1">Создайте первый проект для управления Fleet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(p => {
                        const badge = statusBadge(p.status)
                        const Icon = badge.icon
                        return (
                            <button
                                key={p.id}
                                onClick={() => navigate(`/owner?project=${p.id}`)}
                                className="text-left bg-[#0f0f1a] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all hover:scale-[1.01]"
                                style={{ borderLeftWidth: '4px', borderLeftColor: p.color || '#00ff41' }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${badge.bg} ${badge.color}`}>
                                        <Icon className="w-3 h-3" /> {badge.text}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mb-1">{p.niche || 'Ниша не указана'}</p>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="p-3 bg-black/30 rounded-xl">
                                        <p className="text-xs text-gray-400">MRR</p>
                                        <p className="text-lg font-bold text-[#00ff41]">${p.mrr?.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-black/30 rounded-xl">
                                        <p className="text-xs text-gray-400">Активность</p>
                                        <p className="text-lg font-bold text-white">{p.activity}%</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.lastPost}</span>
                                    <span className="flex items-center gap-1 text-[#00ff41]">Открыть <ArrowRight className="w-3 h-3" /></span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {createOpen && (
                <Modal title="Новый проект" onClose={() => setCreateOpen(false)}>
                    <form onSubmit={createProject} className="space-y-4">
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Название проекта"
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                            required
                        />
                        <input
                            type="text"
                            value={form.niche}
                            onChange={(e) => setForm({ ...form, niche: e.target.value })}
                            placeholder="Ниша"
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                        />
                        <div>
                            <label className="text-sm text-gray-400">Цвет проекта</label>
                            <input
                                type="color"
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                                className="w-full h-10 mt-1 rounded-xl bg-transparent"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00d936] rounded-xl text-black font-medium text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Создать
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    )
}

export default FleetTab
