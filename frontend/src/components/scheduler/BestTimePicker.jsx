import { useState } from 'react'
import { Clock, Loader2, Bot, ChevronDown, Globe } from 'lucide-react'
import { omegaApi } from '../../services/api'

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'telegram', name: 'Telegram' },
    { id: 'twitter', name: 'Twitter/X' },
    { id: 'vk', name: 'VK' },
]

const TIMEZONES = ['UTC', 'Europe/Moscow', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'Asia/Shanghai']

export function BestTimePicker({ onSelect, defaultPlatform = 'instagram' }) {
    const [platform, setPlatform] = useState(defaultPlatform)
    const [timezone, setTimezone] = useState('Europe/Moscow')
    const [niche, setNiche] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [open, setOpen] = useState(false)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await omegaApi.bestTime({ platform, audienceTimezone: timezone, niche })
            const data = res?.data || {}
            setResult(data)
            onSelect?.(data.bestTime)
        } catch (err) {
            setError(err.message || 'Ошибка')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:underline"
            >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                AI время
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-72 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Clock size={14} className="text-[#8B5CF6]" /> Лучшее время
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Платформа</label>
                            <select
                                value={platform}
                                onChange={e => setPlatform(e.target.value)}
                                className="w-full px-2 py-1.5 bg-[#0a0a0f] border border-white/10 rounded-lg text-xs text-white outline-none"
                            >
                                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Часовой пояс</label>
                            <select
                                value={timezone}
                                onChange={e => setTimezone(e.target.value)}
                                className="w-full px-2 py-1.5 bg-[#0a0a0f] border border-white/10 rounded-lg text-xs text-white outline-none"
                            >
                                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Ниша (опционально)</label>
                        <input
                            value={niche}
                            onChange={e => setNiche(e.target.value)}
                            placeholder="Например: бизнес"
                            className="w-full px-2 py-1.5 bg-[#0a0a0f] border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 outline-none"
                        />
                    </div>

                    <button
                        onClick={load}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 text-xs transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                        {loading ? 'Анализ...' : 'Рассчитать'}
                    </button>

                    {error && <div className="text-xs text-red-400">{error}</div>}

                    {result && (
                        <div className="p-3 rounded-lg bg-[#0a0a0f] border border-white/10 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-white font-medium">
                                <Clock size={14} className="text-emerald-400" />
                                {result.bestTime}
                            </div>
                            <div className="text-[10px] text-gray-400">{result.reason}</div>
                            {result.alternativeTimes?.length > 0 && (
                                <div className="text-[10px] text-gray-500">
                                    Альтернативы: {result.alternativeTimes.join(', ')}
                                </div>
                            )}
                            <button
                                onClick={() => onSelect?.(result.bestTime)}
                                className="w-full mt-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30"
                            >
                                Подставить время
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default BestTimePicker
