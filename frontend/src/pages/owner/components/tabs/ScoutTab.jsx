import { useState, useEffect } from 'react'
import { Flame, RefreshCw, Loader2, Calendar, ThumbsUp, ThumbsDown, Sparkles, TrendingUp } from 'lucide-react'
import { omegaApi } from '../../../../services/api'
import { useAuth } from '../../../../context/AuthContext'

export function ScoutTab() {
    const { user } = useAuth()
    const timezone = user?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const [niche, setNiche] = useState('')
    const [loading, setLoading] = useState(false)
    const [trends, setTrends] = useState([])
    const [source, setSource] = useState('')
    const [cached, setCached] = useState(false)
    const [error, setError] = useState('')

    const load = async (force = false) => {
        setLoading(true)
        setError('')
        try {
            const res = await omegaApi.scoutTrends(niche, force)
            const data = res?.data || {}
            setTrends(data.trends || [])
            setSource(data.source || '')
            setCached(!!data.cached)
        } catch (err) {
            setError(err.message || 'Ошибка загрузки трендов')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const createPost = (idea, topic) => {
        const draft = {
            title: topic,
            description: idea,
            platforms: ['instagram'],
        }
        localStorage.setItem('draft_scheduler_post', JSON.stringify(draft))
        window.location.href = '/owner?tab=scheduler'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2"><TrendingUp className="text-[#8B5CF6]" /> OMEGA Scout</h2>
                    <p className="text-sm text-gray-500 mt-1">Актуальные тренды и идеи постов на основе внешних источников</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        value={niche}
                        onChange={e => setNiche(e.target.value)}
                        placeholder="Ниша (опционально)"
                        className="px-3 py-2 bg-[#1a1a24] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30"
                    />
                    <button
                        onClick={() => load(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors disabled:opacity-50 text-sm"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Обновить
                    </button>
                </div>
            </div>

            {cached && <div className="text-xs text-gray-500">Данные из кэша (обновляются раз в 6 часов)</div>}
            {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {trends.map((trend, i) => (
                    <div key={i} className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <Flame size={16} className="text-orange-400" />
                                </div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">{trend.platform}</div>
                            </div>
                            <div className="text-[10px] text-gray-600">{new Date(trend.date).toLocaleDateString(undefined, { timeZone: timezone, dateStyle: 'medium' })}</div>
                        </div>

                        <h3 className="text-base font-semibold text-white">{trend.topic}</h3>

                        <div className="space-y-2">
                            {trend.ideas.map((idea, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-sm text-gray-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={12} className="text-[#8B5CF6]" />
                                        <span className="text-[10px] text-gray-500 uppercase">Идея {idx + 1}</span>
                                    </div>
                                    {idea}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            {trend.ideas.map((idea, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => createPost(idea, trend.topic)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs transition-colors"
                                >
                                    <Calendar size={12} /> Идея {idx + 1}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <button className="flex items-center gap-1 hover:text-emerald-400"><ThumbsUp size={12} /> Больше</button>
                            <button className="flex items-center gap-1 hover:text-red-400"><ThumbsDown size={12} /> Меньше</button>
                            <span className="ml-auto">{trend.source || source}</span>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && trends.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-12">Нажмите «Обновить», чтобы загрузить тренды</div>
            )}
        </div>
    )
}

export default ScoutTab
