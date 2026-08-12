import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { Twitter, Youtube, Send, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/auth/AuthModal'
import { ClientChatWidget } from '../components/chat/ClientChatWidget'
import { PWAInstallButton } from '../components/pwa/PWAInstallButton'
import { ownerLegalInfoApi } from '../services/api.js'
import { API_URL } from '../config.js'
import { PLANS, getPrice } from '../config/plans.js'
import WaitlistSection from './landing/WaitlistSection'
import toast from 'react-hot-toast'
import ViralDemo from './landing/ViralDemo'
import BetaCounter from '../components/landing/BetaCounter'
import { OmegaCompetitorRadar } from '../components/omega/OmegaCompetitorRadar.jsx'
// [P16-FINAL] added: launch pill replacing beta counter
function LaunchPill() {
    return (
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-[var(--text)] border border-[var(--primary)]/20">
            <span className="text-base">🚀</span>
            Запущено в 2026
        </span>
    )
}

function Confetti() {
    const [pieces, setPieces] = useState([])
    useEffect(() => {
        const colors = ['var(--primary)', 'var(--accent)', 'var(--accent-warm)', 'var(--success)']
        const generated = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 1.5}s`,
            duration: `${1.5 + Math.random() * 1.5}s`,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: `${6 + Math.random() * 6}px`,
            rotation: Math.random() * 360
        }))
        setPieces(generated)
        const t = setTimeout(() => setPieces([]), 4000)
        return () => clearTimeout(t)
    }, [])
    if (!pieces.length) return null
    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {pieces.map(p => (
                <span
                    key={p.id}
                    className="absolute top-0 rounded-sm animate-confetti-fall"
                    style={{
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        transform: `rotate(${p.rotation}deg)`
                    }}
                />
            ))}
        </div>
    )
}

function LandingPage() {
    const { t } = useTranslation()
    const { isAuthenticated, user } = useAuth()
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authModalMode, setAuthModalMode] = useState('login')
    const [scrolled, setScrolled] = useState(false)
    const [activeFeature, setActiveFeature] = useState(0)
    const [legalInfo, setLegalInfo] = useState(null)
    const [chatWidgetOpen, setChatWidgetOpen] = useState(false)
    const [billingCycle, setBillingCycle] = useState('monthly')
    const navigate = useNavigate()

    useEffect(() => {
        ownerLegalInfoApi.public().then(res => setLegalInfo(res.legalInfo || {})).catch(() => setLegalInfo({}))
    }, [])

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Auto-rotate features
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveFeature(prev => (prev + 1) % features.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    const features = [
        {
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
            ),
            title: 'AI Генерация',
            desc: 'Скрипты, хуки, описания и теги за секунды. Нейросеть обучена на топовом контенте.'
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
            ),
            title: 'Анализ Трендов',
            desc: 'YouTube, TikTok, Instagram — узнавай что вирусится прямо сейчас в твоей нише.'
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            ),
            title: 'Автопостинг',
            desc: 'Планируй и публикуй в 8+ соцсетей автоматически. Один клик — контент везде.'
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
            ),
            title: 'Аналитика',
            desc: 'Отслеживай рост, CTR, лучший контент и время публикаций в реальном времени.'
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                </svg>
            ),
            title: 'Конкуренты',
            desc: 'Анализируй топовые видео конкурентов и копируй их успешные стратегии.'
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            ),
            title: 'Мгновенно',
            desc: 'Генерация за 60 секунд, публикация в 1 клик. Экономь часы работы каждый день.'
        }
    ]

    const plans = Object.values(PLANS)

    const formatPrice = (price) => new Intl.NumberFormat('ru-RU').format(price)

    const handleSubscribe = async (planId) => {
        if (!isAuthenticated || !user) {
            setAuthModalMode('register')
            setAuthModalOpen(true)
            return
        }
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/yookassa/pay/subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planId, userId: user._id || user.id })
            })
            const data = await res.json()
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl
            } else {
                toast.error(data.error || 'Не удалось создать платёж')
            }
        } catch (err) {
            console.error('[LandingPage:subscribe]', err)
            toast.error('Ошибка при создании платежа')
        }
    }

    const steps = [
        {
            num: '01',
            title: 'Выбери нишу',
            desc: 'AI проанализирует топовые видео и актуальные тренды в твоей нише за секунды.'
        },
        {
            num: '02',
            title: 'Сгенерируй контент',
            desc: 'Получи скрипт, хуки, описание, теги и даже сценарий для видео.'
        },
        {
            num: '03',
            title: 'Публикуй везде',
            desc: 'Один клик — и твой контент в 8+ соцсетях по расписанию.'
        }
    ]

    return (
        <div className="landing-page bg-[var(--bg)] min-h-screen">
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[var(--bg)]/90 backdrop-blur-xl border-b border-[var(--border)]' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--success)] to-[#2563eb] flex items-center justify-center">
                                <svg className="w-6 h-6 text-[var(--text-inverse)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold gradient-text">AI Viral Studio</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-300">Фичи</a>
                            <a href="#how-it-works" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-300">Как работает</a>
                            <a href="#pricing" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-300">Тарифы</a>
                            <Link to="/roadmap" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-300">Roadmap</Link>
                            <Link to="/download" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-300">Скачать</Link>
                            <LaunchPill />
                            <PWAInstallButton />
                            <button
                                onClick={() => { setAuthModalMode('login'); setAuthModalOpen(true) }}
                                className="btn btn-secondary text-sm px-6 py-2.5"
                            >
                                Вход
                            </button>
                            <button
                                onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true) }}
                                className="btn btn-primary text-sm px-6 py-2.5"
                            >
                                Регистрация
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                {/* [P16-FINAL] added: editorial radial background + subtle noise */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at 30% 20%, var(--surface) 0%, var(--bg) 50%, var(--bg-secondary) 100%)'
                }} />
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
                }} />

                {/* [P16-FINAL] added: floating orbs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--primary)] blur-3xl opacity-10 animate-float" />
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-[var(--accent)] blur-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-2/3 w-48 h-48 rounded-full bg-[var(--accent-warm)] blur-3xl opacity-10 animate-float" style={{ animationDelay: '4s' }} />

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass mb-10 border-[var(--primary)]/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] animate-pulse" />
                        <span className="text-sm text-[var(--text)] font-medium">{t('landing.heroBadge')}</span>
                    </div>

                    {/* Main heading */}
                    <h1 className="text-5xl md:text-7xl font-serif font-bold mb-8 leading-[0.95] tracking-tight">
                        Создавай <span className="italic gradient-text">вирусный</span><br />
                        контент за 60 секунд
                    </h1>

                    <div className="flex justify-center mb-8">
                        <BetaCounter />
                    </div>

                    <p className="text-lg font-light text-[var(--text-muted)] mb-12 max-w-xl mx-auto leading-relaxed">
                        AI генерирует скрипты, анализирует тренды и публикует
                        в соцсети — всё автоматически. Сосредоточься на творчестве.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 mb-20">
                        <button
                            onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true) }}
                            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            🚀 {t('landing.start') || 'Начать'}
                        </button>
                        <button
                            onClick={() => { setAuthModalMode('login'); setAuthModalOpen(true) }}
                            className="px-8 py-3.5 rounded-xl bg-transparent border border-[var(--border)] text-[var(--text-muted)] font-medium text-sm hover:text-[var(--text)] hover:border-[var(--text-muted)] hover:bg-[var(--card)]/50 transition-all"
                        >
                            {t('landing.login') || 'Войти'}
                        </button>
                    </div>

                    {/* [v9.9.19.12] honest highlights instead of fake stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16">
                        {[
                            t('landing.highlightAI'),
                            t('landing.highlightTrends'),
                            t('landing.highlightSchedule'),
                            t('landing.highlightBeta')
                        ].map((label, i) => (
                            <div key={i} className="text-center glass-card px-4 py-5 rounded-2xl border border-[var(--border)]">
                                <div className="text-sm text-[var(--text-muted)]">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </section>

            {/* Viral Demo Section */}
            <ViralDemo />

            {/* Features Section */}
            <section id="features" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <h2 className="section-title">Всё для вирусного контента</h2>
                    <p className="section-subtitle">От идеи до публикации — в одной платформе</p>

                    {/* [P16-FINAL] added: bento grid with spotlight hover */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-[180px]">
                        {features.map((feature, i) => {
                            const isLarge = i === 0
                            const isMedium = i === 1 || i === 2
                            return (
                                <div
                                    key={i}
                                    onMouseEnter={() => setActiveFeature(i)}
                                    className={`spotlight glass-card p-6 md:p-8 group cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-[var(--primary)]/30 ${
                                        isLarge ? 'md:col-span-2 md:row-span-2 flex flex-col justify-end' : ''
                                    } ${isMedium ? 'md:col-span-1' : ''}`}
                                >
                                    <div className={`rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-4 group-hover:bg-[var(--primary)]/20 transition-colors ${isLarge ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className={`font-semibold mb-2 ${isLarge ? 'text-2xl' : 'text-lg'}`}>{feature.title}</h3>
                                    <p className={`text-[var(--text-muted)] leading-relaxed ${isLarge ? 'text-base max-w-sm' : 'text-sm'}`}>{feature.desc}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="py-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--success)]/[0.02] to-transparent" />
                <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
                    <h2 className="section-title">Как это работает</h2>
                    <p className="section-subtitle">3 шага до вирусного контента</p>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connecting line */}
                        <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[var(--success)]/30 to-transparent" />

                        {steps.map((item, i) => (
                            <div key={i} className="text-center relative">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--success)]/20 to-[#2563eb]/20 border border-[var(--success)]/20 flex items-center justify-center mx-auto mb-6 relative z-10">
                                    <span className="text-2xl font-black text-[var(--success)]">{item.num}</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                <p className="text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <h2 className="section-title">Тарифы</h2>
                    <p className="section-subtitle">Начни бесплатно, масштабируй когда готов</p>

                    {/* [MONETIZE-2026-08-04] added: monthly/yearly toggle */}
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex items-center gap-3 p-1 rounded-full glass border border-[var(--border)]">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-5 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            >
                                Месяц
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-5 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            >
                                Год <span className="text-xs opacity-80">-20%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {plans.map((plan, i) => {
                            const isPopular = plan.id === 'creator'
                            const basePrice = getPrice(plan.id, 'RUB')
                            const isYearly = billingCycle === 'yearly'
                            const displayPrice = plan.id === 'free' ? 0 : isYearly ? Math.round(basePrice * 12 * 0.8) : basePrice
                            const periodLabel = plan.id === 'free' ? '' : isYearly ? '₽/год' : '₽/мес'
                            return (
                                <div key={i} className={`relative glass rounded-2xl p-8 ${isPopular ? 'border-[var(--success)]/40 scale-105 shadow-[0_0_40px_rgba(0,255,65,0.1)]' : ''}`}>
                                    {isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--success)] to-[#00cc33] text-[var(--text-inverse)] text-xs font-bold px-4 py-1.5 rounded-full">
                                            Популярный
                                        </div>
                                    )}
                                    <h3 className="text-lg font-semibold mb-2 text-[var(--text)]">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-4xl font-black">{formatPrice(displayPrice)}</span>
                                        <span className="text-[var(--text-muted)]">{periodLabel}</span>
                                    </div>
                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, j) => (
                                            <li key={j} className="flex items-start gap-3 text-sm text-[var(--text)]">
                                                <svg className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => plan.id === 'free'
                                            ? (isAuthenticated ? navigate('/dashboard') : (() => { setAuthModalMode('register'); setAuthModalOpen(true) })())
                                            : handleSubscribe(plan.id)
                                        }
                                        className={`w-full btn ${isPopular ? 'btn-primary' : 'btn-secondary'} py-3`}
                                    >
                                        {plan.id === 'free' ? 'Начать бесплатно' : 'Оформить'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Competitor Radar Section */}
            <section id="why-us" className="py-24 relative">
                <div className="max-w-5xl mx-auto px-6 lg:px-8">
                    <OmegaCompetitorRadar />
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative">
                <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                    <div className="glass rounded-3xl p-12 md:p-16 border-[var(--success)]/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--success)]/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2563eb]/5 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-black mb-6">{t('landing.ctaTitle')}</h2>
                            <p className="text-[var(--text-muted)] text-lg mb-10 max-w-xl mx-auto">
                                {t('landing.ctaSubtitle')}
                            </p>
                            <button
                                onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true) }}
                                className="btn btn-primary text-lg px-10 py-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Начать бесплатно
                            </button>
                            <p className="text-sm text-[var(--text-muted)] mt-6">{t('landing.ctaNote')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Waitlist Section */}
            <WaitlistSection />

            {/* [P16] Advertiser CTA for non-authenticated visitors */}
            {!isAuthenticated && (
                <section className="py-24 relative bg-gradient-to-b from-[var(--bg)] to-[var(--bg-secondary)]">
                    <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                        <div className="rounded-3xl p-10 md:p-14 border border-[var(--border)] bg-[var(--card)] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-3xl" />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-black mb-4 text-[var(--text)]">Хотите разместить рекламу?</h2>
                                <p className="text-[var(--text-muted)] text-lg mb-8 max-w-xl mx-auto">
                                    Расскажите о своём продукте тысячам создателей и рекламодателей AI Viral Studio.
                                </p>
                                <button
                                    onClick={() => setChatWidgetOpen(true)}
                                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--primary)] text-[var(--text)] font-medium hover:opacity-90 transition-opacity"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Обсудить размещение
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* [P16-FINAL] added: 4-column editorial luxury footer */}
            <footer className="py-16 border-t border-[var(--border-strong)] bg-[var(--bg-secondary)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[var(--text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold gradient-text">AI Viral Studio</span>
                            </div>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-xs mb-6">
                                AI-платформа для создания вирусного контента. Генерация скриптов, анализ трендов и автопостинг в одном месте.
                            </p>
                            <div className="flex items-center gap-3">
                                <a href="https://t.me/aiviralstudio" target="_blank" rel="noreferrer" className="p-2.5 rounded-full glass-card text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="Telegram">
                                    <Send className="w-4 h-4" />
                                </a>
                                <a href="https://discord.gg/your_invite" target="_blank" rel="noreferrer" className="p-2.5 rounded-full glass-card text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="Discord">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                                </a>
                                <a href="https://vk.com/aiviralstudio" target="_blank" rel="noreferrer" className="p-2.5 rounded-full glass-card text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="VK">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.994 4 8.604c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.475-.085.72-.576.72z"/></svg>
                                </a>
                                <a href="https://youtube.com/@aiviralstudio" target="_blank" rel="noreferrer" className="p-2.5 rounded-full glass-card text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="YouTube">
                                    <Youtube className="w-4 h-4" />
                                </a>
                                <a href="https://x.com/aiviralstudio" target="_blank" rel="noreferrer" className="p-2.5 rounded-full glass-card text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="X / Twitter">
                                    <Twitter className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Продукт</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><a href="#features" className="hover:text-[var(--primary)] transition-colors">Фичи</a></li>
                                <li><a href="#pricing" className="hover:text-[var(--primary)] transition-colors">Тарифы</a></li>
                                <li><a href="#how-it-works" className="hover:text-[var(--primary)] transition-colors">Как работает</a></li>
                                <li><Link to="/roadmap" className="hover:text-[var(--primary)] transition-colors">Roadmap</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Компания</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><Link to="/privacy-policy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link></li>
                                <li><Link to="/terms-of-service" className="hover:text-[var(--primary)] transition-colors">Terms</Link></li>
                                <li><Link to="/consent" className="hover:text-[var(--primary)] transition-colors">Consent</Link></li>
                                <li><a href="https://t.me/aiviral_omega_bot" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] transition-colors">Контакты</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Ресурсы</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><Link to="/docs" className="hover:text-[var(--primary)] transition-colors">Документация</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 mb-8">
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            <strong className="text-[var(--text)]">Дисклеймер:</strong> Сервис предоставляет инструменты для генерации контента. Результаты носят рекомендательный характер. Мы не гарантируем вирусность, охваты или продажи. Весь публикуемый контент размещается клиентом самостоятельно. OMEGA даёт рекомендации. Перед публикацией проверьте контент на соответствие законодательству РФ.
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[var(--border-strong)]">
                        <div className="text-sm text-[var(--text-muted)]">
                            © 2026 AI Viral Studio. Все права защищены.
                        </div>
                        <div className="flex gap-6 text-sm text-[var(--text-muted)]">
                            <Link to="/privacy-policy" className="hover:text-[var(--primary)] transition-colors">Политика конфиденциальности</Link>
                            <Link to="/terms-of-service" className="hover:text-[var(--primary)] transition-colors">Условия использования</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* [P16-FINAL] added: launch confetti */}
            <Confetti />

            {/* Auth Modal */}
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                defaultMode={authModalMode}
                onSuccess={() => {
                    setAuthModalOpen(false)
                    const role = user?.role
                    if (role === 'client' || role === 'creator') {
                        navigate('/onboarding')
                    } else {
                        navigate('/dashboard')
                    }
                }}
            />

            {/* Client chat widget */}
            <ClientChatWidget open={chatWidgetOpen} onOpenChange={setChatWidgetOpen} />
        </div>
    )
}

export default LandingPage