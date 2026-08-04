import { useState, useEffect } from 'react'
import { demoApi, launchApi } from '../../services/api.js'

// [VALUE-2026-08-04] removed NICHES dropdown; using free-text niche input instead
const DEMO_STORAGE_KEY = 'omega_demo_count'
const DEMO_LIMIT = 3

function scrollToWaitlist() {
    const el = document.getElementById('waitlist')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function ViralDemo() {
    const [niche, setNiche] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [hooks, setHooks] = useState(null)
    const [error, setError] = useState('')
    const [demoCount, setDemoCount] = useState(0)
    const [requiresEmail, setRequiresEmail] = useState(false)
    const [waitlistCount, setWaitlistCount] = useState(0)

    useEffect(() => {
        const count = parseInt(localStorage.getItem(DEMO_STORAGE_KEY) || '0', 10)
        setDemoCount(count)
        setRequiresEmail(count >= DEMO_LIMIT)

        launchApi.waitlistCount()
            .then(res => setWaitlistCount(res.data?.count || 0))
            .catch(() => setWaitlistCount(0))
    }, [])

    const handleGenerate = async (e) => {
        e.preventDefault()
        if (!niche) return
        if (requiresEmail && !email) return

        setLoading(true)
        setError('')

        try {
            const res = await demoApi.generate(niche, requiresEmail ? email : undefined)
            setHooks(res.data?.hooks || res.data)

            const nextCount = demoCount + 1
            setDemoCount(nextCount)
            localStorage.setItem(DEMO_STORAGE_KEY, String(nextCount))
            if (nextCount >= DEMO_LIMIT) {
                setRequiresEmail(true)
            }
        } catch (err) {
            setError(err.message || 'Не удалось сгенерировать хуки. Попробуйте позже.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section id="viral-demo" className="py-24 relative">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/20 text-[#00ff41] text-sm font-medium mb-6">
                        Бесплатно • 10 секунд • Без регистрации
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        Попробуй <span className="gradient-text">OMEGA</span> бесплатно
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Сгенерируй 3 вирусных хука для своей ниши прямо сейчас. Уже в очереди {waitlistCount} человек.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleGenerate} className="glass-card p-6 rounded-2xl border border-white/10">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* [VALUE-2026-08-04] added: free-text niche input with specified placeholder */}
                            <input
                                type="text"
                                required
                                value={niche}
                                onChange={e => setNiche(e.target.value)}
                                placeholder="кофейня, бьюти, IT..."
                                className="flex-1 px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/50"
                            />
                            <button
                                type="submit"
                                disabled={loading || !niche}
                                className="btn btn-primary px-8 py-4 whitespace-nowrap disabled:opacity-50"
                            >
                                {loading ? 'Генерируем...' : 'Сгенерировать 3 хука'}
                            </button>
                        </div>

                        {requiresEmail && (
                            <div className="mt-4">
                                <input
                                    type="email"
                                    required
                                    placeholder="Введите email, чтобы продолжить (лимит 3 демо исчерпан)"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]/50"
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Демо-лимит: {demoCount} / {DEMO_LIMIT}. Введите email, чтобы сгенерировать ещё или встаньте в очередь.
                                </p>
                            </div>
                        )}

                        {!requiresEmail && (
                            <p className="mt-3 text-xs text-gray-500 text-center">
                                Осталось демо: {Math.max(0, DEMO_LIMIT - demoCount)} / {DEMO_LIMIT}
                            </p>
                        )}

                        {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
                    </form>
                </div>

                {hooks && (
                    <div className="mt-12 grid md:grid-cols-3 gap-6">
                        {hooks.map((hook, idx) => (
                            <div key={hook.id || idx} className="glass-card p-6 rounded-2xl border border-white/10 hover:border-[#00ff41]/30 transition-all">
                                <div className="text-xs font-bold text-[#00ff41] mb-3 uppercase tracking-wider">Вариант {idx + 1}</div>
                                <h3 className="text-xl font-bold mb-3">{hook.title}</h3>
                                <p className="text-gray-300 text-lg font-medium mb-4 leading-relaxed">{hook.hook}</p>
                                <div className="border-t border-white/10 pt-4">
                                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">15-секундный скрипт</div>
                                    <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans leading-relaxed">{hook.script15s}</pre>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hooks && (
                    <div className="mt-12 text-center">
                        <div className="glass-card inline-block p-6 rounded-2xl border border-[#00ff41]/10">
                            <p className="text-gray-400 mb-4">Хочешь полную версию? Встань в очередь →</p>
                            <button
                                type="button"
                                onClick={scrollToWaitlist}
                                className="btn btn-primary px-8 py-3"
                            >
                                Забрать доступ раньше всех
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

export default ViralDemo
