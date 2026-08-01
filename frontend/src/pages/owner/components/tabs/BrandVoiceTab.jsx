import { useState, useEffect } from 'react'
import { Mic, Loader2, Sparkles, Save, ToggleLeft, ToggleRight, FileText, Palette, Smile, Type, Megaphone } from 'lucide-react'
import { omegaApi } from '../../../../services/api'

const SAMPLES = [
    'Привет! Сегодня разберём 3 ошибки, которые убивают вирусность в начале ролика.',
    '🔥 Спойлер: 90% контент-креаторов делают это неправильно. Смотри до конца.',
    'Срочно! Новый алгоритм Instagram 2026 — что работает прямо сейчас.',
    'Друзья, я потратил $5000 на тесты таргета. Вот что реально окупается.',
    'Миф: вирусность — это удача. Факт: вирусность — это структура.',
]

export function BrandVoiceTab() {
    const [texts, setTexts] = useState(['', '', ''])
    const [niche, setNiche] = useState('')
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState(null)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        omegaApi.getBrandVoice().then(res => {
            if (res?.data) setProfile(res.data)
        }).catch(() => {})
    }, [])

    const addField = () => setTexts(prev => [...prev, ''])
    const removeField = (i) => setTexts(prev => prev.filter((_, idx) => idx !== i))
    const setText = (i, value) => setTexts(prev => prev.map((t, idx) => idx === i ? value : t))

    const fillSamples = () => setTexts(SAMPLES.slice(0, 5))

    const analyze = async () => {
        const valid = texts.filter(Boolean)
        if (valid.length < 3) {
            setError('Вставьте минимум 3 текста постов')
            return
        }
        setLoading(true)
        setError('')
        try {
            const res = await omegaApi.analyzeBrandVoice(valid, niche)
            setProfile(res?.data || null)
            setSaved(false)
        } catch (err) {
            setError(err.message || 'Ошибка анализа')
        } finally {
            setLoading(false)
        }
    }

    const toggleEnabled = async () => {
        if (!profile) return
        const next = !profile.enabled
        try {
            const res = await omegaApi.toggleBrandVoice(next)
            setProfile(res?.data || { ...profile, enabled: next })
        } catch (err) {
            setError(err.message || 'Ошибка переключения')
        }
    }

    const cards = profile ? [
        { icon: Mic, label: 'Тон', value: profile.tone },
        { icon: Palette, label: 'Словарь', value: Array.isArray(profile.keywords) ? profile.keywords.join(', ') : profile.keywords },
        { icon: Type, label: 'Длина предложений', value: profile.sentenceLength },
        { icon: Smile, label: 'Стиль эмодзи', value: profile.emojiStyle },
        { icon: Megaphone, label: 'CTA-паттерн', value: profile.description?.slice(0, 120) || '—' },
    ] : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Brand Voice v2</h2>
                    <p className="text-sm text-gray-500 mt-1">AI проанализирует тон, словарь и паттерны ваших постов</p>
                </div>
                <button onClick={fillSamples} className="text-xs text-gray-400 hover:text-white underline">
                    Заполнить примерами
                </button>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

            <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Ниша (опционально)</label>
                    <input
                        value={niche}
                        onChange={e => setNiche(e.target.value)}
                        placeholder="Например: бизнес, фитнес, EdTech"
                        className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#8B5CF6]/30"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-xs text-gray-500">Вставьте 3-10 текстов постов, Stories, Reels или email</label>
                    {texts.map((t, i) => (
                        <div key={i} className="flex gap-2">
                            <textarea
                                value={t}
                                onChange={e => setText(i, e.target.value)}
                                rows={2}
                                placeholder={`Текст ${i + 1}`}
                                className="flex-1 px-4 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30 resize-none"
                            />
                            {texts.length > 3 && (
                                <button onClick={() => removeField(i)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                            )}
                        </div>
                    ))}
                    <button onClick={addField} className="text-xs text-[#8B5CF6] hover:underline">+ Добавить текст</button>
                </div>

                <button
                    onClick={analyze}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loading ? 'Анализ...' : 'Анализировать стиль'}
                </button>
            </div>

            {profile && (
                <div className="bg-[#1a1a24] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Результат анализа</h3>
                        <button
                            onClick={toggleEnabled}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                profile.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                            }`}
                        >
                            {profile.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            {profile.enabled ? 'Используется в OMEGA Chat' : 'Отключено в OMEGA Chat'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cards.map((card, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <card.icon size={14} className="text-[#8B5CF6]" />
                                    <span className="text-xs text-gray-500">{card.label}</span>
                                </div>
                                <div className="text-sm text-white font-medium">{card.value || '—'}</div>
                            </div>
                        ))}
                    </div>

                    {Array.isArray(profile.examples) && profile.examples.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1"><FileText size={12} /> Примеры для анализа</div>
                            <div className="space-y-2">
                                {profile.examples.slice(0, 3).map((ex, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-[#0a0a0f] text-xs text-gray-400 line-clamp-2">{ex}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {saved && <div className="text-xs text-emerald-400">Сохранено в профиль</div>}
                </div>
            )}
        </div>
    )
}

export default BrandVoiceTab
