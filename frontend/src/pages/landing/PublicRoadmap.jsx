import { useEffect, useState } from 'react'
import { roadmapApi } from '../../services/api.js'

const COLUMNS = [
    { key: 'planned', label: 'Запланировано', color: 'border-gray-500/30' },
    { key: 'in_progress', label: 'В разработке', color: 'border-blue-500/30' },
    { key: 'testing', label: 'Тестирование', color: 'border-yellow-500/30' },
    { key: 'launched', label: 'Запущено', color: 'border-[#00ff41]/30' },
]

const STATUS_COLORS = {
    planned: 'bg-gray-500/20 text-gray-300',
    in_progress: 'bg-blue-500/20 text-blue-300',
    testing: 'bg-yellow-500/20 text-yellow-300',
    launched: 'bg-[#00ff41]/20 text-[#00ff41]',
}

function PublicRoadmap() {
    const [features, setFeatures] = useState([])
    const [loading, setLoading] = useState(true)
    const [voted, setVoted] = useState(new Set())
    const [error, setError] = useState('')

    useEffect(() => {
        roadmapApi.list()
            .then(res => {
                setFeatures(res.data?.features || [])
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const handleVote = async (featureId) => {
        if (voted.has(featureId)) return
        try {
            const res = await roadmapApi.vote(featureId)
            if (res.success) {
                setFeatures(prev => prev.map(f => f.featureId === featureId ? { ...f, votes: res.data.votes } : f))
                setVoted(prev => new Set([...prev, featureId]))
                localStorage.setItem(`roadmap_vote_${featureId}`, '1')
            }
        } catch (err) {
            setError(err.message || 'Вы уже голосовали')
        }
    }

    useEffect(() => {
        const initial = new Set()
        features.forEach(f => {
            if (localStorage.getItem(`roadmap_vote_${f.featureId}`)) initial.add(f.featureId)
        })
        setVoted(initial)
    }, [features.length])

    const columnsFeatures = COLUMNS.map(col => ({
        ...col,
        items: features.filter(f => f.status === col.key).sort((a, b) => b.votes - a.votes),
    }))

    return (
        <div className="min-h-screen bg-[#0a0a0f] py-24 px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-black mb-4">
                        Публичный <span className="gradient-text">Roadmap</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Голосуй за фичи, которые нужны именно тебе. Топ-5 по голосам попадает в следующий спринт.
                    </p>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-10 h-10 border-2 border-[#00ff41] border-t-transparent rounded-full" />
                    </div>
                )}

                {error && !loading && (
                    <p className="text-center text-red-400 mb-8">{error}</p>
                )}

                {!loading && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {columnsFeatures.map(col => (
                            <div key={col.key} className="flex flex-col gap-4">
                                <div className={`p-4 rounded-2xl glass border ${col.color} sticky top-24`}>
                                    <h2 className="font-bold text-lg">{col.label}</h2>
                                    <p className="text-sm text-gray-500">{col.items.length} фич</p>
                                </div>
                                {col.items.map(feature => (
                                    <div
                                        key={feature.featureId}
                                        className="glass-card p-5 rounded-2xl border border-white/5 hover:border-white/15 transition-all"
                                    >
                                        <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium mb-3 ${STATUS_COLORS[feature.status]}`}>
                                            {COLUMNS.find(c => c.key === feature.status)?.label}
                                        </div>
                                        <h3 className="font-bold mb-4">{feature.featureTitle}</h3>
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handleVote(feature.featureId)}
                                                disabled={voted.has(feature.featureId)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                    voted.has(feature.featureId)
                                                        ? 'bg-[#00ff41]/20 text-[#00ff41] cursor-default'
                                                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                                {feature.votes}
                                            </button>
                                            {voted.has(feature.featureId) && (
                                                <span className="text-xs text-[#00ff41]">Голос засчитан</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PublicRoadmap
