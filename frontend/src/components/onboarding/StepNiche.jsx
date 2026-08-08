import { useState, useEffect } from 'react'
import { Search, Sparkles, Wand2 } from 'lucide-react'
import { omegaApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const NICHE_SUGGESTIONS = [
    'Кофейня', 'Бьюти-салон', 'IT-стартап', 'Автосервис', 'Одежда', 'Еда/ресторан',
    'Фитнес', 'Недвижимость', 'Образование', 'Путешествия', 'Медицина', 'Финансы',
    'Дизайн интерьера', 'Фотография', 'Event-агентство', 'Консалтинг', 'E-commerce',
    'Личный бренд', 'Подкаст', 'Строительство', 'Юридические услуги', 'Маркетинг',
    'Handmade', 'Детские товары', 'Продукты питания', 'Алкоголь', 'Книги',
]

function StepNiche({ value, onChange }) {
    const { user } = useAuth()
    const [query, setQuery] = useState(value || '')
    const [suggestions, setSuggestions] = useState([])
    const [detecting, setDetecting] = useState(false)

    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([])
            return
        }
        const lower = query.toLowerCase()
        const matches = NICHE_SUGGESTIONS.filter(n => n.toLowerCase().includes(lower)).slice(0, 6)
        setSuggestions(matches)
    }, [query])

    const select = (niche) => {
        setQuery(niche)
        setSuggestions([])
        onChange(niche)
    }

    const autoDetect = async () => {
        const name = query.trim()
        if (!name) return
        setDetecting(true)
        try {
            const res = await omegaApi.chat(
                `Определи нишу бизнеса по названию "${name}". Ответь одной короткой фразой (1-3 слова), только ниша, без пояснений.`,
                [],
                'ru',
                user?.role || 'guest',
                user?._id || null
            )
            const detected = (res?.response || res?.data?.response || name)
                .replace(/^["']|["']$/g, '')
                .split('\n')[0]
                .trim()
            if (detected) {
                setQuery(detected)
                onChange(detected)
                setSuggestions([])
            }
        } catch (err) {
            console.error('[StepNiche] autoDetect failed:', err)
        } finally {
            setDetecting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-[#8B5CF6]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Какая у вас ниша?</h2>
                <p className="text-gray-400">OMEGA подстроится под вашу аудиторию и тренды</p>
            </div>

            <div className="relative max-w-md mx-auto">
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); onChange(e.target.value) }}
                    onKeyDown={e => e.key === 'Enter' && autoDetect()}
                    placeholder="Например: книги, бьюти, IT, кофейня..."
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-4 pr-14 py-3.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all text-sm sm:text-base"
                />
                <button
                    type="button"
                    onClick={autoDetect}
                    disabled={detecting || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition disabled:opacity-50"
                >
                    {detecting ? '...' : 'OK'}
                </button>
                {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden z-10">
                        {suggestions.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => select(s)}
                                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2"
                            >
                                <Sparkles size={14} className="text-[#8B5CF6]" /> {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {NICHE_SUGGESTIONS.slice(0, 10).map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => select(n)}
                        className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] ${
                            value === n ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 hover:border-emerald-500/40 text-slate-300'
                        }`}
                    >
                        <div className="font-medium text-sm sm:text-base">{n}</div>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default StepNiche
