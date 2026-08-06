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

            <div className="relative max-w-md mx-auto space-y-3">
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); onChange(e.target.value) }}
                    placeholder="Начните печатать, например: коф..."
                    className="w-full px-5 py-4 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#8B5CF6]/50"
                />
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
                <button
                    type="button"
                    onClick={autoDetect}
                    disabled={detecting || !query.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 hover:bg-white/10 hover:border-[#8B5CF6]/30 transition-all disabled:opacity-50"
                >
                    <Wand2 className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
                    {detecting ? 'OMEGA думает...' : 'OMEGA, определи мою нишу по названию'}
                </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {NICHE_SUGGESTIONS.slice(0, 10).map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => select(n)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                            value === n ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-[#8B5CF6]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default StepNiche
