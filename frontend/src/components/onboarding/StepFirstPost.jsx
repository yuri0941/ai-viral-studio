import { useState } from 'react'
import { Sparkles, ChevronLeft, ChevronRight, Copy, Check, Loader2 } from 'lucide-react'
import { omegaApi } from '../../services/api'

const MOCK_POSTS = [
    {
        id: 1,
        hook: '«3 ошибки, которые убивают охваты в [нише]»',
        body: 'Разбор на примере реального кейса + чек-лист в конце.',
        cta: 'Сохраните, чтобы не потерять',
    },
    {
        id: 2,
        hook: '«Почему 90% [ниши] не монетизируют TikTok»',
        body: 'И как исправить это за 1 вечер без бюджета.',
        cta: 'Напишите "ДА" в комментариях — вышлю шаблон',
    },
    {
        id: 3,
        hook: '«Миф дня: viral = удача»',
        body: 'Разбираем формулу вирусности на вашем примере.',
        cta: 'Подпишитесь, чтобы не пропустить разбор',
    },
]

function StepFirstPost({ niche, style, onComplete }) {
    const [posts, setPosts] = useState(MOCK_POSTS)
    const [active, setActive] = useState(0)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(null)

    const generate = async () => {
        setLoading(true)
        try {
            const res = await omegaApi.chat(
                `Сгенерируй 3 варианта поста для ниши "${niche}" в стиле "${style}". Каждый вариант: hook (цепляющий заголовок), body (2-3 предложения), cta (призыв). Ответь строго JSON: { "posts": [{ "hook", "body", "cta" }] }`,
                [],
                'ru'
            )
            const text = res?.data?.response || ''
            try {
                const match = text.match(/\{[\s\S]*\}/)
                const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
                if (parsed?.posts?.length) setPosts(parsed.posts)
            } catch (e) {
                console.warn('[StepFirstPost] AI parse failed, using fallback')
            }
        } finally {
            setLoading(false)
        }
    }

    const copy = (idx) => {
        const p = posts[idx]
        navigator.clipboard.writeText(`${p.hook}\n\n${p.body}\n\n${p.cta}`)
        setCopied(idx)
        setTimeout(() => setCopied(null), 1500)
    }

    // [VALUE-2026-08-04] added: schedule + edit actions
    const schedule = (idx) => {
        const p = posts[idx]
        const text = `${p.hook}\n\n${p.body}\n\n${p.cta}`
        localStorage.setItem('draft_post', JSON.stringify({ title: p.hook, description: text, platforms: ['instagram'] }))
        window.location.href = '/scheduler'
    }

    const edit = (idx) => {
        const p = posts[idx]
        const text = `${p.hook}\n\n${p.body}\n\n${p.cta}`
        window.location.href = `/scheduler?prefill=${encodeURIComponent(text)}`
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Ваш первый пост</h2>
                <p className="text-gray-400">OMEGA подготовила 3 варианта. Выберите лучший.</p>
            </div>

            <div className="flex justify-center gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setActive(Math.max(0, active - 1))}
                    disabled={active === 0}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="self-center text-sm text-gray-400">{active + 1} / {posts.length}</span>
                <button
                    type="button"
                    onClick={() => setActive(Math.min(posts.length - 1, active + 1))}
                    disabled={active === posts.length - 1}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="max-w-xl mx-auto bg-[#1a1a24] border border-white/10 rounded-2xl p-6 min-h-[220px] flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="text-lg font-bold text-white">{posts[active].hook}</div>
                    <p className="text-gray-300 text-sm leading-relaxed">{posts[active].body}</p>
                    <div className="text-[#8B5CF6] text-sm font-medium">{posts[active].cta}</div>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                    <button
                        type="button"
                        onClick={() => copy(active)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white"
                    >
                        {copied === active ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copied === active ? 'Скопировано' : 'Копировать'}
                    </button>
                    {/* [VALUE-2026-08-04] added: schedule and edit actions */}
                    <button
                        type="button"
                        onClick={() => schedule(active)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm"
                    >
                        Запланировать
                    </button>
                    <button
                        type="button"
                        onClick={() => edit(active)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white"
                    >
                        Отредактировать
                    </button>
                    <button
                        type="button"
                        onClick={generate}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 text-sm disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Перегенерировать
                    </button>
                </div>
            </div>

            <div className="text-center">
                <button
                    type="button"
                    onClick={onComplete}
                    className="px-8 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-medium transition-colors"
                >
                    Завершить онбординг
                </button>
            </div>
        </div>
    )
}

export default StepFirstPost
