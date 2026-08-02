import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Award, Sparkles } from 'lucide-react'
import StepNiche from './StepNiche'
import StepSocials from './StepSocials'
import StepStyle from './StepStyle'
import StepConnect from './StepConnect'
import StepFirstPost from './StepFirstPost'

const STORAGE_KEY = 'omega_onboarding_progress'
const COMPLETED_KEY = 'omega_onboarding_completed'

const STEP_TITLES = [
    'Добро пожаловать',
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

function WelcomeSlide({ title, desc, icon }) {
    return (
        <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/20 flex items-center justify-center mx-auto">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-gray-400 max-w-xs mx-auto">{desc}</p>
        </div>
    )
}

function OnboardingWizard() {
    const navigate = useNavigate()
    const [step, setStep] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? Math.min(Math.max(0, parseInt(saved, 10)), STEP_TITLES.length - 1) : 0
    })
    const [data, setData] = useState(() => {
        const saved = localStorage.getItem('omega_onboarding_data')
        return saved ? JSON.parse(saved) : { niche: '', socials: [], style: '', connected: [] }
    })
    const [showConfetti, setShowConfetti] = useState(false)
    const [finished, setFinished] = useState(false)

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(step))
    }, [step])

    useEffect(() => {
        localStorage.setItem('omega_onboarding_data', JSON.stringify(data))
    }, [data])

    const next = () => {
        if (step < STEP_TITLES.length - 1) setStep(s => s + 1)
    }

    const prev = () => {
        if (step > 0) setStep(s => s - 1)
    }

    const complete = () => {
        localStorage.setItem(COMPLETED_KEY, 'true')
        localStorage.setItem('omega_bonus_generations', '50')
        setShowConfetti(true)
        setFinished(true)
        setTimeout(() => navigate('/dashboard'), 3000)
    }

    const progress = ((step + 1) / STEP_TITLES.length) * 100

    const update = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6">
            {showConfetti && <Confetti />}

            <div className="w-full max-w-4xl">
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
                        <h2 className="text-3xl font-black text-white">First Step unlocked!</h2>
                        <p className="text-gray-400 text-lg">Вы получили бейдж <span className="text-[#8B5CF6] font-bold">First Step</span> и <span className="text-[#00ff41] font-bold">+50 бонусных генераций</span>.</p>
                        <p className="text-sm text-gray-500">Перенаправляем в дашборд...</p>
                    </div>
                ) : (
                    <>
                        <div className="min-h-[360px] flex items-center justify-center">
                            {step === 0 && (
                                <div className="space-y-8 w-full">
                                    <WelcomeSlide
                                        title="Создавай"
                                        desc="AI генерирует посты, хуки, скрипты и описания за секунды."
                                        icon={<Sparkles className="w-8 h-8 text-[#8B5CF6]" />}
                                    />
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <WelcomeSlide
                                            title="Анализируй"
                                            desc="Отслеживай тренды, конкурентов и лучшее время публикаций."
                                            icon={<svg className="w-8 h-8 text-[#00ff41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>}
                                        />
                                        <WelcomeSlide
                                            title="Публикуй"
                                            desc="Один клик — и контент в 8+ соцсетей по расписанию."
                                            icon={<svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                        />
                                    </div>
                                </div>
                            )}
                            {step === 1 && <StepNiche value={data.niche} onChange={v => update('niche', v)} />}
                            {step === 2 && <StepSocials value={data.socials} onChange={v => update('socials', v)} />}
                            {step === 3 && <StepStyle value={data.style} onChange={v => update('style', v)} />}
                            {step === 4 && <StepConnect value={data.connected} onChange={v => update('connected', v)} onSkip={next} />}
                            {step === 5 && <StepFirstPost niche={data.niche || 'ваша ниша'} style={data.style} onComplete={complete} />}
                        </div>

                        <div className="flex justify-between mt-10">
                            <button
                                type="button"
                                onClick={prev}
                                disabled={step === 0}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={16} /> Назад
                            </button>
                            {step < STEP_TITLES.length - 1 && (
                                <button
                                    type="button"
                                    onClick={next}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-sm transition-colors"
                                >
                                    Далее <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default OnboardingWizard
