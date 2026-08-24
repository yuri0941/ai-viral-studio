import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Award, Wand2, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { omegaApi, scheduledPostsApi } from '../../services/api'
import { API_BASE_URL } from '../../config.js'
import toast from 'react-hot-toast'
import StepNiche from './StepNiche'
import StepSocials from './StepSocials'
import StepStyle from './StepStyle'
import StepConnect from './StepConnect'
import StepFirstPost from './StepFirstPost'

const STORAGE_KEY = 'omega_onboarding_progress'
const DATA_KEY = 'omega_onboarding_data'
const COMPLETED_KEY = 'omega_onboarding_completed'

// [v6.5.5] 5 actionable steps with AI auto-fill and backend sync
const STEP_TITLES = [
    'Ваша ниша',
    'Соцсети',
    'Стиль',
    'Подключение',
    'Первый пост',
]

function Confetti() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const particles = []
        const colors = ['#8B5CF6', '#00ff41', '#3b82f6', '#f59e0b', '#ef4444']
        for (let i = 0; i < 120; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 4 + 2,
                size: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
            })
        }

        let frame
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach(p => {
                p.x += p.vx
                p.y += p.vy
                p.rotation += p.rotationSpeed
                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate((p.rotation * Math.PI) / 180)
                ctx.fillStyle = p.color
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
                ctx.restore()
            })
            frame = requestAnimationFrame(animate)
        }
        frame = requestAnimationFrame(animate)

        const timeout = setTimeout(() => cancelAnimationFrame(frame), 4000)
        return () => {
            clearTimeout(timeout)
            cancelAnimationFrame(frame)
        }
    }, [])

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
}

function OnboardingWizard() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [step, setStep] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? Math.min(Math.max(0, parseInt(saved, 10)), STEP_TITLES.length - 1) : 0
    })
    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(DATA_KEY)
        return saved ? JSON.parse(saved) : { niche: '', socials: [], style: '', connected: [] }
    })
    const [showConfetti, setShowConfetti] = useState(false)
    const [finished, setFinished] = useState(false)
    const [aiFillOpen, setAiFillOpen] = useState(false)
    const [aiFillQuery, setAiFillQuery] = useState('')
    const [aiFillLoading, setAiFillLoading] = useState(false)

    // Sync progress to localStorage and backend
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(step))
        localStorage.setItem(DATA_KEY, JSON.stringify(data))
        const syncBackend = async () => {
            try {
                // [CLIENT-JOURNEY-QA] без Authorization сервер отвечал 401/404 — онбординг не сохранялся
                const token = localStorage.getItem('token')
                await fetch(`${API_BASE_URL}/users/me/onboarding`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ step, data, completed: false }),
                })
            } catch (err) {
                console.warn('[OnboardingWizard] backend sync failed:', err)
            }
        }
        const timer = setTimeout(syncBackend, 500)
        return () => clearTimeout(timer)
    }, [step, data])

    const next = () => {
        if (step < STEP_TITLES.length - 1) setStep(s => s + 1)
    }

    const prev = () => {
        if (step > 0) setStep(s => s - 1)
    }

    const update = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }))
    }

    const autoFillWithAI = async () => {
        if (!aiFillQuery.trim()) return
        setAiFillLoading(true)
        try {
            const res = await omegaApi.chat(
                `Пользователь описывает свой бизнес так: "${aiFillQuery.trim()}". Определи: нишу (niche), подходящие соцсети из [instagram, youtube, telegram, vk] (socials), стиль общения из [professional, friendly, ironic] (style). Ответь строго JSON: { "niche": "...", "socials": [...], "style": "..." }.`,
                [],
                'ru',
                user?.role || 'guest',
                user?._id || null
            )
            const text = res?.response || res?.data?.response || ''
            const match = text.match(/\{[\s\S]*\}/)
            const parsed = match ? JSON.parse(match[0]) : null
            if (parsed) {
                const nextData = {
                    niche: parsed.niche || data.niche || '',
                    socials: Array.isArray(parsed.socials) ? parsed.socials : data.socials || [],
                    style: parsed.style || data.style || '',
                    connected: Array.isArray(parsed.socials) ? parsed.socials.filter(s => ['telegram', 'vk', 'instagram', 'youtube'].includes(s)) : data.connected || [],
                }
                setData(nextData)
                setStep(3)
                setAiFillOpen(false)
            }
        } catch (err) {
            console.error('[OnboardingWizard] AI fill failed:', err)
            toast.error('OMEGA не смогла распознать описание. Попробуйте заполнить вручную.', { duration: 4000, icon: '❌' })
        } finally {
            setAiFillLoading(false)
        }
    }

    const createFirstPost = async () => {
        try {
            const res = await omegaApi.chat(
                `Создай первый пост для ниши "${data.niche || 'бизнес'}" в стиле "${data.style || 'friendly'}". Платформы: ${(data.socials || []).join(', ') || 'instagram'}. Ответь строго JSON: { "title": "...", "content": "...", "hashtags": "..." }.`,
                [],
                'ru',
                user?.role || 'guest',
                user?._id || null
            )
            const text = res?.response || res?.data?.response || ''
            const match = text.match(/\{[\s\S]*\}/)
            const parsed = match ? JSON.parse(match[0]) : null
            if (parsed?.content) {
                const scheduledAt = new Date(Date.now() + 60 * 60 * 1000) // +1 hour
                await scheduledPostsApi.create({
                    title: parsed.title || `Первый пост — ${data.niche || 'бизнес'}`,
                    content: parsed.content,
                    hashtags: parsed.hashtags || '',
                    platforms: data.socials?.length ? data.socials : ['instagram'],
                    scheduledAt: scheduledAt.toISOString(),
                    status: 'scheduled',
                })
                return true
            }
        } catch (err) {
            console.error('[OnboardingWizard] createFirstPost failed:', err)
        }
        return false
    }

    const complete = async () => {
        localStorage.setItem(COMPLETED_KEY, 'true')
        localStorage.setItem('omega_bonus_generations', '50')
        localStorage.setItem('omega_first_post_badge', 'true')
        await createFirstPost()
        try {
            // [CLIENT-JOURNEY-QA] без Authorization сервер отвечал 401/404 — онбординг не сохранялся
            const token = localStorage.getItem('token')
            await fetch(`${API_BASE_URL}/users/me/onboarding`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ step, data, completed: true }),
            })
        } catch (err) {
            console.warn('[OnboardingWizard] final onboarding sync failed:', err)
        }
        setShowConfetti(true)
        setFinished(true)
        setTimeout(() => navigate('/dashboard'), 3000)
    }

    const progress = ((step + 1) / STEP_TITLES.length) * 100

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
            {showConfetti && <Confetti />}

            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[var(--card)]/90 backdrop-blur-xl rounded-2xl border border-[var(--border)] shadow-2xl p-5 sm:p-8 text-white mx-auto">
                <div className="mb-8">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#00ff41] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Шаг {step + 1} из {STEP_TITLES.length}</span>
                        <span>{STEP_TITLES[step]}</span>
                    </div>
                </div>

                {finished ? (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#00ff41] flex items-center justify-center mx-auto">
                            <Award className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white">🎉 Готово! Ваш первый пост создан.</h2>
                        <p className="text-gray-400 text-lg">Вы получили бейдж <span className="text-[#8B5CF6] font-bold">First Post!</span> и <span className="text-[#00ff41] font-bold">+50 бонусных генераций</span>.</p>
                        <p className="text-sm text-gray-500">Перенаправляем в дашборд...</p>
                    </div>
                ) : (
                    <>
                        <div className="min-h-[360px] flex items-center justify-center">
                            {step === 0 && <StepNiche value={data.niche} onChange={v => update('niche', v)} />}
                            {step === 1 && <StepSocials value={data.socials} onChange={v => update('socials', v)} />}
                            {step === 2 && <StepStyle value={data.style} onChange={v => update('style', v)} />}
                            {step === 3 && <StepConnect value={data.connected} onChange={v => update('connected', v)} onSkip={next} />}
                            {step === 4 && <StepFirstPost niche={data.niche || 'ваша ниша'} style={data.style} onComplete={complete} />}
                        </div>

                        {!aiFillOpen && (
                            <div className="flex justify-between mt-10">
                                <button
                                    type="button"
                                    onClick={prev}
                                    disabled={step === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={16} /> Назад
                                </button>
                                {step < STEP_TITLES.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={next}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-sm transition-colors"
                                    >
                                        Далее <ChevronRight size={16} />
                                    </button>
                                ) : null}
                            </div>
                        )}

                        {!aiFillOpen && step < 3 && (
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => setAiFillOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-[#8B5CF6]/30 transition-colors"
                                >
                                    <Wand2 className="w-4 h-4" /> Я не знаю что выбрать — OMEGA подберёт за 10 сек
                                </button>
                            </div>
                        )}

                        {aiFillOpen && (
                            <div className="mt-8 max-w-lg mx-auto p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Sparkles className="w-4 h-4 text-[#8B5CF6]" /> OMEGA задаст 3 вопроса и заполнит всё сама
                                </div>
                                <input
                                    type="text"
                                    value={aiFillQuery}
                                    onChange={e => setAiFillQuery(e.target.value)}
                                    placeholder="Опишите свой бизнес одним предложением..."
                                    className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#8B5CF6]/50"
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAiFillOpen(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                                    >
                                        Закрыть
                                    </button>
                                    <button
                                        type="button"
                                        onClick={autoFillWithAI}
                                        disabled={aiFillLoading || !aiFillQuery.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-sm transition-colors disabled:opacity-50"
                                    >
                                        {aiFillLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                        {aiFillLoading ? 'Думаю...' : 'Подобрать'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default OnboardingWizard
