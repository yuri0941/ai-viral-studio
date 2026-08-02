import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Twitter, Youtube, Send, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/auth/AuthModal'
import { ClientChatWidget } from '../components/chat/ClientChatWidget'
import { PWAInstallButton } from '../components/pwa/PWAInstallButton'
import { ownerLegalInfoApi } from '../services/api.js'
import WaitlistSection from './landing/WaitlistSection'
import ViralDemo from './landing/ViralDemo'
import BetaCounter from '../components/landing/BetaCounter'

function LandingPage() {
    const { isAuthenticated } = useAuth()
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authModalMode, setAuthModalMode] = useState('login')
    const [scrolled, setScrolled] = useState(false)
    const [activeFeature, setActiveFeature] = useState(0)
    const [legalInfo, setLegalInfo] = useState(null)
    const [chatWidgetOpen, setChatWidgetOpen] = useState(false)
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

    const plans = [
        {
            name: 'Free',
            price: '$0',
            period: '/мес',
            features: ['3 AI запроса/день', '1 соцсеть', '5 анализов/мес', 'Watermark на видео'],
            cta: 'Начать бесплатно',
            popular: false
        },
        {
            name: 'Creator',
            price: '$29.99',
            period: '/мес',
            features: ['50 AI запросов/день', '3 соцсети', '50 анализов/мес', 'Без watermark', 'Приоритетная генерация'],
            cta: 'Выбрать Creator',
            popular: true
        },
        {
            name: 'Pro',
            price: '$79.99',
            period: '/мес',
            features: ['Безлимит AI', '8 соцсетей', 'Безлимит аналитика', 'AI миниатюры', 'API доступ'],
            cta: 'Выбрать Pro',
            popular: false
        },
        {
            name: 'Agency',
            price: '$139.99',
            period: '/мес',
            features: ['Безлимит всё', 'Безлимит соцсети', 'Команда до 5 чел', 'White-label', 'Приоритетная поддержка'],
            cta: 'Выбрать Agency',
            popular: false
        }
    ]

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
                            <BetaCounter />
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
                {/* Background glows */}
                <div className="glow-green top-1/4 left-1/4 animate-pulse-glow" />
                <div className="glow-blue bottom-1/4 right-1/4 animate-pulse-glow" style={{ animationDelay: '2s' }} />

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass mb-10 border-[var(--success)]/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" />
                        <span className="text-sm text-[var(--text)] font-medium">10,000+ создателей уже с нами</span>
                    </div>

                    {/* Main heading */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight">
                        Создавай <span className="gradient-text">вирусный</span><br />
                        контент за <span className="text-[var(--success)]">60 секунд</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-[var(--text-muted)] mb-12 max-w-3xl mx-auto leading-relaxed">
                        AI генерирует скрипты, анализирует тренды и публикует
                        в соцсети — всё автоматически. Сосредоточься на творчестве.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <button
                            onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true) }}
                            className="btn btn-primary text-lg px-10 py-4"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Попробовать бесплатно
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="btn btn-secondary text-lg px-10 py-4"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Демо
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {[
                            { value: '10K+', label: 'Пользователей' },
                            { value: '500K+', label: 'Скриптов' },
                            { value: '50M+', label: 'Просмотров' },
                            { value: '98%', label: 'Довольны' }
                        ].map((stat, i) => (
                            <div key={i} className="glass p-5 rounded-2xl text-center group hover:border-[var(--success)]/30 transition-all duration-300">
                                <div className="text-3xl font-black text-[var(--success)] mb-1">{stat.value}</div>
                                <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
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

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className={`glass p-8 rounded-2xl group cursor-pointer transition-all duration-500 ${activeFeature === i ? 'border-[var(--success)]/30 scale-[1.02]' : ''}`}
                                onMouseEnter={() => setActiveFeature(i)}
                            >
                                <div className="w-14 h-14 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)] mb-5 group-hover:bg-[var(--success)]/20 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-[var(--text-muted)] leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
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

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {plans.map((plan, i) => (
                            <div key={i} className={`relative glass rounded-2xl p-8 ${plan.popular ? 'border-[var(--success)]/40 scale-105 shadow-[0_0_40px_rgba(0,255,65,0.1)]' : ''}`}>
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--success)] to-[#00cc33] text-[var(--text-inverse)] text-xs font-bold px-4 py-1.5 rounded-full">
                                        Популярный
                                    </div>
                                )}
                                <h3 className="text-lg font-semibold mb-2 text-[var(--text)]">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-black">{plan.price}</span>
                                    <span className="text-[var(--text-muted)]">{plan.period}</span>
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
                                    onClick={() => { setAuthModalMode('register'); setAuthModalOpen(true) }}
                                    className={`w-full btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} py-3`}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative">
                <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                    <div className="glass rounded-3xl p-12 md:p-16 border-[var(--success)]/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--success)]/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2563eb]/5 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-black mb-6">Готов к вирусному контенту?</h2>
                            <p className="text-[var(--text-muted)] text-lg mb-10 max-w-xl mx-auto">
                                Присоединяйся к 10,000+ создателей, которые уже используют AI Viral Studio для роста аудитории
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
                            <p className="text-sm text-[var(--text-muted)] mt-6">7 дней бесплатно, без карты • Отмена в любой момент</p>
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

            {/* [P16] Luxury Footer */}
            <footer className="py-16 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid md:grid-cols-5 gap-12 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[var(--text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold gradient-text">AI Viral Studio</span>
                            </div>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-sm mb-6">
                                AI-платформа для создания вирусного контента. Генерация скриптов, анализ трендов и автопостинг в одном месте.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href="https://t.me/aiviralstudio" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="Telegram">
                                    <Send className="w-5 h-5" />
                                </a>
                                <a href="https://vk.com/aiviralstudio" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="VK">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.994 4 8.604c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.475-.085.72-.576.72z"/></svg>
                                </a>
                                <a href="https://youtube.com/@aiviralstudio" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors" aria-label="YouTube">
                                    <Youtube className="w-5 h-5" />
                                </a>
                                <a href="https://x.com/aiviralstudio" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" aria-label="X / Twitter">
                                    <Twitter className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Продукт</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><a href="#features" className="hover:text-[var(--text)] transition-colors">Фичи</a></li>
                                <li><a href="#pricing" className="hover:text-[var(--text)] transition-colors">Тарифы</a></li>
                                <li><a href="#how-it-works" className="hover:text-[var(--text)] transition-colors">Как работает</a></li>
                                <li><Link to="/roadmap" className="hover:text-[var(--text)] transition-colors">Roadmap</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Компания</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><Link to="/privacy-policy" className="hover:text-[var(--text)] transition-colors">Privacy</Link></li>
                                <li><Link to="/terms-of-service" className="hover:text-[var(--text)] transition-colors">Terms</Link></li>
                                <li><Link to="/consent" className="hover:text-[var(--text)] transition-colors">Consent</Link></li>
                                <li><a href="#" className="hover:text-[var(--text)] transition-colors">Контакты</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Ресурсы</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><a href="#" className="hover:text-[var(--text)] transition-colors">Блог</a></li>
                                <li><a href="#" className="hover:text-[var(--text)] transition-colors">Документация</a></li>
                                <li><a href="#" className="hover:text-[var(--text)] transition-colors">API</a></li>
                                <li><a href="#" className="hover:text-[var(--text)] transition-colors">Статус системы</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-[var(--text)]">Контакты</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li>{legalInfo?.operatorName || 'AI Viral Studio'}</li>
                                <li>
                                    <a href={`mailto:${legalInfo?.contactEmail || 'support@aiviral-studio.ru'}`} className="hover:text-[var(--text)] transition-colors">
                                        {legalInfo?.contactEmail || 'support@aiviral-studio.ru'}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 mb-8">
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            <strong className="text-[var(--text)]">Дисклеймер:</strong> Сервис предоставляет инструменты для генерации контента. Результаты носят рекомендательный характер. Мы не гарантируем вирусность, охваты или продажи. Весь публикуемый контент размещается клиентом самостоятельно. OMEGA даёт рекомендации. Перед публикацией проверьте контент на соответствие законодательству РФ.
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[var(--border)]">
                        <div className="text-sm text-[var(--text-muted)]">
                            © 2026 AI Viral Studio. Все права защищены.
                        </div>
                        <div className="flex gap-6 text-sm text-[var(--text-muted)]">
                            <Link to="/privacy-policy" className="hover:text-[var(--text)] transition-colors">Политика конфиденциальности</Link>
                            <Link to="/terms-of-service" className="hover:text-[var(--text)] transition-colors">Условия использования</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Auth Modal */}
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                defaultMode={authModalMode}
                onSuccess={() => { setAuthModalOpen(false); navigate('/dashboard') }}
            />

            {/* Client chat widget */}
            <ClientChatWidget open={chatWidgetOpen} onOpenChange={setChatWidgetOpen} />
        </div>
    )
}

export default LandingPage