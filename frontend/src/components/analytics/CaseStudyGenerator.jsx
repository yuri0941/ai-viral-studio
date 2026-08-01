import { useEffect, useState } from 'react'
import { FileText, Sparkles, Check, X, Edit3, Trash2, Loader2, AlertCircle, Download } from 'lucide-react'
import { API_BASE_URL } from '../../../config.js'

export function CaseStudyGenerator() {
    const [candidates, setCandidates] = useState([])
    const [caseStudies, setCaseStudies] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadCandidates()
    }, [])

    const loadCandidates = async () => {
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/case-studies/candidates`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') setCandidates(json.data || [])
        } catch (err) {
            console.warn('[CaseStudyGenerator] candidates load failed:', err.message)
        }
    }

    const generate = async (userId) => {
        setLoading(true)
        setError(null)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/case-studies/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })
            const json = await res.json()
            if (json.status === 'success') {
                setCaseStudies(prev => [json.data, ...prev])
            } else {
                setError(json.message || 'Ошибка генерации')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const approve = (id) => {
        setCaseStudies(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c))
    }

    const remove = (id) => {
        setCaseStudies(prev => prev.filter(c => c.id !== id))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText size={18} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">Кейсы клиентов</h2>
                </div>
                <button
                    onClick={() => generate(candidates[0]?.user._id)}
                    disabled={loading || candidates.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Сгенерировать кейс
                </button>
            </div>

            {candidates.length === 0 && !loading && (
                <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 text-center">
                    <AlertCircle size={32} className="mx-auto mb-3 text-gray-500" />
                    <h3 className="text-sm font-medium text-white mb-1">Кейсы появятся автоматически</h3>
                    <p className="text-xs text-gray-500">Когда клиент покажет рост метрик {'>'}20% за 30 дней.</p>
                </div>
            )}

            {candidates.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="text-xs text-gray-500 mb-2">Кандидаты на кейс:</div>
                    <div className="flex flex-wrap gap-2">
                        {candidates.map(c => (
                            <button
                                key={String(c.user._id)}
                                onClick={() => generate(c.user._id)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#8B5CF6]/10 text-xs text-gray-300 hover:text-white transition-colors"
                            >
                                {c.user.name || c.user.email} — рост {c.growth.score.toFixed(0)}%
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="grid gap-4">
                {caseStudies.map(study => (
                    <div key={study.id} className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {study.coverUrl && (
                                <img src={study.coverUrl} alt="cover" className="w-full sm:w-48 h-28 object-cover rounded-xl bg-[#1a1a24]" />
                            )}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">{study.client?.name || 'Клиент'}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${study.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                        {study.status === 'approved' ? 'Одобрен' : 'Черновик'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                    Рост публикаций: {study.growth?.postGrowth?.toFixed(1)}% · Рост выручки: {study.growth?.revenueGrowth?.toFixed(1)}%
                                </div>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{study.content}</p>
                                <div className="flex items-center gap-2 mt-4">
                                    {study.status !== 'approved' && (
                                        <button onClick={() => approve(study.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs transition-colors">
                                            <Check size={14} /> Одобрить
                                        </button>
                                    )}
                                    <button onClick={() => alert('Редактирование в разработке')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors">
                                        <Edit3 size={14} /> Редактировать
                                    </button>
                                    <button onClick={() => remove(study.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors">
                                        <Trash2 size={14} /> Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default CaseStudyGenerator
