// [LANDING-UNIFY] Единый люкс-лендинг: одна точка входа на главную.
// Объединяет лучшее из двух прежних версий:
//  - живые тарифы из PlanConfig + founding −30% + счётчик слотов (бывшая pages/landing)
//  - люкс-подача бывшего legacy-лендинга (орбы/сетка/шум, bento-секции, editorial-футер)
// Все строки — через i18n (landing.*), TG-ссылки — только через config/bots.js.
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Bot, BarChart3, Factory, Telescope, Calendar, Check, ChevronDown, ArrowRight, Send, Mail, Menu, X, Loader2, Twitter, Youtube } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { API_BASE_URL, API_URL } from '../../config.js'
import { planConfigApi, testimonialsApi, launchApi, ownerLegalInfoApi } from '../../services/api.js'
import { clientBotUrl, channelUrl } from '../../config/bots.js'
import AuthModal from '../../components/auth/AuthModal'
import { PWAInstallButton } from '../../components/pwa/PWAInstallButton'
import ViralDemo from './ViralDemo.jsx'
import BetaCounter from '../../components/landing/BetaCounter.jsx'
import WaitlistSection from './WaitlistSection.jsx'

const FEATURE_ICONS = { aiContent: Bot, tgBot: Send, analytics: BarChart3, factory: Factory, forecasts: Telescope, autoPublish: Calendar }
const FEATURE_KEYS = ['aiContent', 'tgBot', 'analytics', 'factory', 'forecasts', 'autoPublish']
const STEP_KEYS = ['s1', 's2', 's3', 's4']
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4']

// [LANDING-RESTORE] таймаут публичных запросов лендинга: спящий/упавший API не должен
// давать вечный спиннер — через 9с показываем встроенный фолбэк
const PUBLIC_FETCH_OPTS = { timeout: 9000, noRetry: true }

// [LANDING-RESTORE] фолбэк-тарифы = дефолты backend/models/PlanConfig.js (free 0 / pro 990 / agency 4990).
// Используются ТОЛЬКО когда PlanConfig API недоступен; факт уходит в console.warn.
const FALLBACK_PLANS = [
  // [CLIENT-JOURNEY-QA] free features приведены к seed PlanConfig (все false) —
  // раньше фолбэк обещал free «Отложенный постинг», которого в тарифе нет
  { plan: 'free', price: 0, currency: 'RUB', quotas: { generationsPerDay: 20, youtubeUploadsPerDay: 2, youtubeChannels: 1, mediaQueueMB: 500, scheduledPostsMax: 10, aiTagsPerDay: 5 }, features: {} },
  { plan: 'pro', price: 990, currency: 'RUB', quotas: { generationsPerDay: 200, youtubeUploadsPerDay: 5, youtubeChannels: 3, mediaQueueMB: 5120, scheduledPostsMax: 100, aiTagsPerDay: 50 }, features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true } },
  { plan: 'agency', price: 4990, currency: 'RUB', quotas: { generationsPerDay: 1000, youtubeUploadsPerDay: 10, youtubeChannels: 10, mediaQueueMB: 25600, scheduledPostsMax: 0, aiTagsPerDay: 200 }, features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true, whiteLabel: true } },
]

// [LANDING-UNIFY] лёгкий scroll-reveal на IntersectionObserver (без тяжёлых библиотек)
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setVisible(true); return }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${visible ? 'reveal-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export default function LandingPage({ authMode = null }) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistStatus, setWaitlistStatus] = useState(null)
  // [LANDING-UNIFY] /login и /register отдают этот же лендинг с открытой модалкой (форма не тронута)
  // [LANDING-RESTORE] фикс прод-бага «Войти не открывает модалку»: переход / → /login
  // обновляет пропс authMode БЕЗ ремонта (тот же тип компонента), useState не перечитывался —
  // синхронизируем открытие модалки через useEffect
  const [authOpen, setAuthOpen] = useState(!!authMode)
  useEffect(() => { if (authMode) setAuthOpen(true) }, [authMode])

  // [P1.6-PREP] живые данные: тарифы из PlanConfig, отзывы из БД, founding-статус
  const [plans, setPlans] = useState(null)
  const [testimonials, setTestimonials] = useState([])
  const [foundingActive, setFoundingActive] = useState(false)
  const [foundingDiscountPercent, setFoundingDiscountPercent] = useState(30) // [PLANCONFIG-ADMIN] из FoundingConfig, фолбэк 30
  // [LANDING-RESTORE] правовая строка владельца (auto-update из его кабинета) — в legacy
  // запрос был, но данные не рендерились; теперь рендерится в футере
  const [legalInfo, setLegalInfo] = useState(null)

  useEffect(() => {
    let mounted = true
    planConfigApi.list(PUBLIC_FETCH_OPTS)
      .then(res => { if (mounted) setPlans(Array.isArray(res?.plans) && res.plans.length ? res.plans : FALLBACK_PLANS) })
      .catch((err) => {
        console.warn('[landing] PlanConfig недоступен, показываю встроенный фолбэк тарифов:', err?.message || err)
        if (mounted) setPlans(FALLBACK_PLANS)
      })
    testimonialsApi.list(PUBLIC_FETCH_OPTS)
      .then(res => { if (mounted) setTestimonials(Array.isArray(res?.testimonials) ? res.testimonials : []) })
      .catch(() => { if (mounted) setTestimonials([]) })
    launchApi.betaSlots(PUBLIC_FETCH_OPTS)
      .then(res => {
        if (!mounted) return
        setFoundingActive(!!res?.data?.foundingActive)
        // [PLANCONFIG-ADMIN] процент скидки — из FoundingConfig (БД), без хардкода 0.7
        if (Number.isFinite(res?.data?.discountPercent)) setFoundingDiscountPercent(res.data.discountPercent)
      })
      .catch(() => { if (mounted) setFoundingActive(true) }) // [LANDING-RESTORE] фолбэк: founding-скидка отображается и при упавшем API
    ownerLegalInfoApi.public(PUBLIC_FETCH_OPTS)
      .then(res => { if (mounted) setLegalInfo(res?.legalInfo || null) })
      .catch(() => { if (mounted) setLegalInfo(null) })
    return () => { mounted = false }
  }, [])

  // [LANDING-RESTORE] P1.5-METRICS visit beacon (был в legacy, потерян при Б2):
  // не чаще 1 раза/сутки с браузера, без персональных данных
  useEffect(() => {
    try {
      const KEY = 'avs_visit_ts'
      const last = Number(localStorage.getItem(KEY) || 0)
      if (Date.now() - last < 24 * 60 * 60 * 1000) return
      localStorage.setItem(KEY, String(Date.now()))
      fetch(`${API_URL}/metrics/visit`, { method: 'POST', keepalive: true }).catch(() => {})
    } catch { /* метрика не критична */ }
  }, [])

  // [P1.6-PREP] строки фич тарифа из quotas/features PlanConfig
  // [PLANCONFIG-ADMIN] если владелец задал featureList RU/EN — рендерим его (приоритет)
  const planFeatureLines = (p) => {
    const lang = (i18n.language || 'ru').slice(0, 2)
    const custom = p.featureList?.[lang] || []
    if (custom.length) return custom
    const q = p.quotas || {}
    const f = p.features || {}
    const lines = []
    if (q.generationsPerDay) lines.push(t('landing.plans.genPerDay', { count: q.generationsPerDay }))
    if (q.youtubeUploadsPerDay) lines.push(t('landing.plans.ytPerDay', { count: q.youtubeUploadsPerDay }))
    if (q.youtubeChannels) lines.push(t('landing.plans.ytChannels', { count: q.youtubeChannels }))
    if (q.mediaQueueMB) lines.push(t('landing.plans.mediaMB', { count: q.mediaQueueMB }))
    if (q.scheduledPostsMax) lines.push(t('landing.plans.scheduledMax', { count: q.scheduledPostsMax }))
    if (q.aiTagsPerDay) lines.push(t('landing.plans.aiTagsPerDay', { count: q.aiTagsPerDay }))
    for (const key of ['publishAt', 'playlists', 'brandVoice', 'abTesting', 'analytics', 'whiteLabel']) {
      if (f[key]) lines.push(t(`landing.plans.feature.${key}`))
    }
    return lines
  }

  const planPrice = (id) => plans?.find(p => p.plan === id)?.price ?? 0

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // [LANDING-UNIFY] parallax-акцент в герое: орбы следуют за курсором (только pointer: fine)
  const heroRef = useRef(null)
  useEffect(() => {
    const el = heroRef.current
    if (!el || !window.matchMedia('(pointer: fine)').matches) return
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    el.addEventListener('mousemove', onMove)
    return () => { el.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  const joinWaitlist = async (e) => {
    e.preventDefault()
    if (!waitlistEmail || waitlistLoading) return
    setWaitlistLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/public/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail, source: 'landing' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setWaitlistStatus({ ok: true, position: json.position })
      setWaitlistEmail('')
    } catch (err) {
      setWaitlistStatus({ ok: false, error: err.message })
    } finally {
      setWaitlistLoading(false)
    }
  }

  const closeAuth = () => {
    setAuthOpen(false)
    if (authMode) navigate('/')
  }

  const NAV = [
    { href: '#features', label: t('landing.nav.features') },
    { href: '#pricing', label: t('landing.nav.pricing') },
    { href: '#how', label: t('landing.nav.how') },
    { href: '#faq', label: t('landing.nav.faq') },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" /> AI Viral Studio
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--text-muted)]">
            {NAV.map(n => (
              <a key={n.href} href={n.href} className="hover:text-[var(--text)] transition-colors">{n.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {/* [LANDING-RESTORE] PWAInstallButton — был в legacy-шапке, рендерится только когда установка доступна */}
            <div className="hidden md:block"><PWAInstallButton /></div>
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-sm font-semibold hover:opacity-90 transition-opacity">{t('landing.dashboard')}</button>
            ) : (
              <>
                {/* [LANDING-RESTORE] контраст «Войти»: читаемая кнопка вместо бледного текста */}
                <Link to="/login" className="hidden md:block px-4 py-2 rounded-xl text-sm font-medium text-[var(--text)] border border-[var(--border)] glass-card hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors">{t('landing.login')}</Link>
                <Link to="/signup" className="btn-lux px-4 py-2 rounded-xl text-sm font-semibold">{t('landing.start')}</Link>
              </>
            )}
            <button className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="fixed inset-0 z-40 bg-[var(--bg)]/95 backdrop-blur-xl pt-20 px-6 md:hidden">
          <nav className="flex flex-col gap-5 text-lg">
            {NAV.map(n => (
              <a key={n.href} href={n.href} onClick={() => setMobileMenu(false)} className="py-1">{n.label}</a>
            ))}
            <Link to="/login" onClick={() => setMobileMenu(false)} className="py-1">{t('landing.login')}</Link>
            <Link to="/signup" onClick={() => setMobileMenu(false)} className="btn-lux px-6 py-3 rounded-xl text-center font-semibold">{t('landing.start')}</Link>
          </nav>
        </div>
      )}

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-20 px-4">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, var(--bg) 55%)' }} />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {/* [LANDING-UNIFY] parallax-орбы */}
        <div className="hero-orb absolute top-1/4 left-[8%] w-64 h-64 rounded-full bg-[var(--primary)] blur-3xl opacity-10 animate-float" style={{ transform: 'translate3d(calc(var(--px, 0) * 40px), calc(var(--py, 0) * 40px), 0)' }} />
        <div className="hero-orb absolute bottom-1/4 right-[10%] w-96 h-96 rounded-full bg-[var(--secondary)] blur-3xl opacity-10 animate-float" style={{ transform: 'translate3d(calc(var(--px, 0) * -60px), calc(var(--py, 0) * -60px), 0)', animationDelay: '2s' }} />
        <div className="hero-orb absolute top-1/2 left-[55%] w-48 h-48 rounded-full bg-[var(--accent)] blur-3xl opacity-10 animate-float" style={{ transform: 'translate3d(calc(var(--px, 0) * 25px), calc(var(--py, 0) * -25px), 0)', animationDelay: '4s' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
          <Reveal>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm border border-[var(--primary)]/20 mb-6">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" /> {t('landing.hero.launched')}
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.05] tracking-tight">
              {t('landing.hero.titlePre')}{' '}
              <span className="gradient-text italic">{t('landing.hero.titleAccent')}</span>{' '}
              {t('landing.hero.titlePost')}
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-muted)] mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/signup" className="btn-lux px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-2 w-full sm:w-auto justify-center">
                {t('landing.hero.ctaPrimary')} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="px-8 py-4 rounded-2xl glass-card border border-[var(--border)] font-semibold text-lg hover:border-[var(--primary)]/50 transition-colors w-full sm:w-auto text-center">
                {t('landing.login')}
              </Link>
            </div>
            <div className="flex justify-center mb-10"><BetaCounter /></div>
          </Reveal>

          <Reveal delay={220}>
            <form onSubmit={joinWaitlist} className="max-w-md mx-auto flex items-center gap-2 glass-card rounded-2xl p-2 border border-[var(--border)]">
              <Mail className="w-5 h-5 text-[var(--text-muted)] ml-3 shrink-0" />
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder={t('landing.hero.waitlistPlaceholder')}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm px-2 min-h-[40px]"
              />
              <button type="submit" disabled={waitlistLoading} className="btn-lux px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-60">
                {waitlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('landing.hero.waitlistButton')}
              </button>
            </form>
            {waitlistStatus?.ok && <p className="text-sm text-emerald-400 mt-3">{t('landing.hero.waitlistSuccess', { position: waitlistStatus.position })}</p>}
            {waitlistStatus?.ok === false && <p className="text-sm text-red-400 mt-3">{t('landing.hero.waitlistError', { error: waitlistStatus.error })}</p>}
          </Reveal>

          <Reveal delay={320}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mt-14">
              {['highlightAI', 'highlightTrends', 'highlightSchedule', 'highlightBeta'].map((k) => (
                <div key={k} className="text-center glass-card px-3 py-4 rounded-2xl border border-[var(--border)]">
                  <div className="text-sm text-[var(--text-muted)]">{t(`landing.${k}`)}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <a href="#viral-demo" className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" aria-label="Scroll">
          <ChevronDown className="w-6 h-6" />
        </a>
      </section>

      <ViralDemo />

      {/* Features — bento + spotlight */}
      <section id="features" className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="section-title">{t('landing.features.title')}</h2>
            <p className="section-subtitle">{t('landing.features.subtitle')}</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_KEYS.map((key, i) => {
              const Icon = FEATURE_ICONS[key]
              const isLarge = i === 0
              return (
                <Reveal key={key} delay={i * 80} className={isLarge ? 'md:col-span-2' : ''}>
                  <div className="spotlight glass-card rounded-2xl p-6 md:p-8 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-500 hover:scale-[1.01] h-full">
                    <div className={`rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-4 ${isLarge ? 'w-14 h-14' : 'w-12 h-12'}`}>
                      <Icon className={isLarge ? 'w-7 h-7' : 'w-6 h-6'} />
                    </div>
                    <h3 className={`font-semibold mb-2 ${isLarge ? 'text-2xl' : 'text-lg'}`}>{t(`landing.features.items.${key}.title`)}</h3>
                    <p className={`text-[var(--text-muted)] leading-relaxed ${isLarge ? 'text-base max-w-md' : 'text-sm'}`}>{t(`landing.features.items.${key}.desc`)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing — [P1.6-PREP] живые данные из PlanConfig (только визуал, данные не тронуты) */}
      <section id="pricing" className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--primary)]/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <Reveal>
            <h2 className="section-title">{t('landing.pricing.title')}</h2>
            <p className="section-subtitle">{t('landing.pricing.subtitle')}</p>
            <div className="flex justify-center mb-10"><BetaCounter /></div>
          </Reveal>
          {/* [LANDING-RESTORE] карточки-скелетоны — только пока идёт короткий (≤9с) запрос;
              при ошибке/таймауте рендерятся фолбэк-тарифы, error-ветка больше не нужна */}
          {plans === null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-2xl p-6 border border-[var(--border)] glass-card animate-pulse h-64" />
              ))}
            </div>
          )}
          {plans !== null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {plans.map((p, i) => {
                const isPopular = p.plan === 'pro'
                return (
                  <Reveal key={p.plan} delay={i * 100} className="h-full">
                    <div className={`relative rounded-2xl p-6 border h-full flex flex-col transition-all duration-500 hover:scale-[1.02] ${isPopular ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-[0_0_50px_rgba(0,255,65,0.12)]' : 'border-[var(--border)] glass-card'}`}>
                      {isPopular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--primary)] text-black text-xs font-bold whitespace-nowrap">{t('landing.plans.popular')}</span>}
                      <h3 className="text-xl font-bold mb-2 capitalize">{p.plan}</h3>
                      <div className="text-3xl font-black mb-1">{p.price} <span className="text-sm text-[var(--text-muted)] font-normal">{t('landing.plans.perMonth')}</span></div>
                      {/* [PLANCONFIG-ADMIN] «хватит на»: перевод лимитов PlanConfig в понятные единицы (авто-пересчёт) */}
                      <div className="text-xs text-[var(--text-muted)] mb-2 break-words">
                        {t('landing.plans.enoughFor', {
                          posts: p.quotas?.scheduledPostsMax > 0 ? p.quotas.scheduledPostsMax : '∞',
                          videos: (p.quotas?.youtubeUploadsPerDay || 0) * 30,
                          ai: (p.quotas?.generationsPerDay || 0) * 30,
                        })}
                      </div>
                      {foundingActive && p.price > 0 && (
                        <div className="text-xs text-emerald-400 mb-3 break-words">{t('landing.plans.foundingLine', { price: Math.round(p.price * (1 - foundingDiscountPercent / 100)), percent: foundingDiscountPercent })}</div>
                      )}
                      <ul className="space-y-2 mb-6 mt-4 flex-1">
                        {planFeatureLines(p).map((feat, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-[var(--text-muted)] break-words"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> {feat}</li>
                        ))}
                      </ul>
                      <Link to={`/signup?plan=${p.plan}`} className={`block text-center py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${isPopular ? 'btn-lux' : 'glass-card border border-[var(--border)] hover:border-[var(--primary)]/50'}`}>{t('landing.plans.choose')}</Link>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="section-title">{t('landing.how.title')}</h2>
            <p className="section-subtitle">{t('landing.how.subtitle')}</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent" />
            {STEP_KEYS.map((key, i) => (
              <Reveal key={key} delay={i * 100}>
                <div className="glass-card rounded-2xl p-6 border border-[var(--border)] h-full text-center relative">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mx-auto mb-4 relative z-10">
                    <span className="text-xl font-black text-[var(--primary)]">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{t(`landing.how.steps.${key}.title`)}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t(`landing.how.steps.${key}.desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — реальные отзывы из БД; [PLANCONFIG-ADMIN] при пустой БД секция скрывается (вернём после первых клиентов) */}
      {testimonials.length > 0 && (
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="section-title">{t('landing.testimonials.title')}</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((item, i) => (
              <Reveal key={item._id} delay={i * 80}>
                <div className="glass-card rounded-2xl p-6 border border-[var(--border)] h-full">
                  <p className="text-sm text-[var(--text)] mb-4 break-words">“{item.text}”</p>
                  <div className="text-sm font-semibold break-words">{item.name}</div>
                  {item.role && <div className="text-xs text-[var(--text-muted)] break-words">{item.role}</div>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* FAQ */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="section-title">{t('landing.faq.title')}</h2>
          </Reveal>
          <div className="space-y-3">
            {[
              ...FAQ_KEYS.slice(0, 3).map(k => ({ q: t(`landing.faq.items.${k}.q`), a: t(`landing.faq.items.${k}.a`) })),
              // живые цены из PlanConfig вместо хардкода
              { q: t('landing.faq.priceQuestion'), a: plans?.length ? t('landing.faq.priceAnswer', { pro: planPrice('pro'), agency: planPrice('agency') }) : t('landing.faq.priceAnswerFallback') },
              ...FAQ_KEYS.slice(3).map(k => ({ q: t(`landing.faq.items.${k}.q`), a: t(`landing.faq.items.${k}.a`) })),
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between gap-3 p-4 min-h-[44px] text-left">
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-sm text-[var(--text-muted)] leading-relaxed">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <Reveal className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-10 md:p-16 border border-[var(--primary)]/10 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--secondary)]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-6">{t('landing.ctaTitle')}</h2>
              <p className="text-[var(--text-muted)] text-lg mb-10 max-w-xl mx-auto">{t('landing.ctaSubtitle')}</p>
              <Link to="/signup" className="btn-lux inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-lg font-semibold">
                {t('landing.ctaButton')} <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-[var(--text-muted)] mt-6">{t('landing.ctaNote')}</p>
            </div>
          </div>
        </Reveal>
      </section>

      <WaitlistSection />

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-16 px-4 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-sm mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-lg mb-4"><Sparkles className="w-5 h-5 text-[var(--primary)]" /> AI Viral Studio</div>
            <p className="text-[var(--text-muted)] leading-relaxed mb-6">{t('landing.footer.tagline')}</p>
            <div className="flex items-center gap-3">
              {/* [LANDING-RESTORE] TG через конфиг ботов; VK/YouTube/X — реальные ссылки из legacy-футера (Discord-заглушка your_invite удалена в Б2 навсегда) */}
              <a href={channelUrl()} target="_blank" rel="noreferrer" className="p-2.5 rounded-full glass-card text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" aria-label="Telegram">
                <Send className="w-4 h-4" />
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
            <div className="font-semibold mb-4">{t('landing.footer.product')}</div>
            <div className="space-y-3 text-[var(--text-muted)]">
              <a href="#features" className="block hover:text-[var(--primary)] transition-colors">{t('landing.nav.features')}</a>
              <a href="#pricing" className="block hover:text-[var(--primary)] transition-colors">{t('landing.nav.pricing')}</a>
              <a href="#how" className="block hover:text-[var(--primary)] transition-colors">{t('landing.nav.how')}</a>
              {/* [LANDING-RESTORE] Roadmap/Скачать — были в legacy-шапке и футере */}
              <Link to="/roadmap" className="block hover:text-[var(--primary)] transition-colors">{t('landing.footer.roadmap')}</Link>
              <Link to="/download" className="block hover:text-[var(--primary)] transition-colors">{t('landing.footer.download')}</Link>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-4">{t('landing.footer.company')}</div>
            <div className="space-y-3 text-[var(--text-muted)]">
              <Link to="/docs" className="block hover:text-[var(--primary)] transition-colors">{t('landing.footer.apiDocs')}</Link>
              <Link to="/privacy" className="block hover:text-[var(--primary)] transition-colors">{t('landing.footer.privacy')}</Link>
              <Link to="/terms" className="block hover:text-[var(--primary)] transition-colors">{t('landing.footer.terms')}</Link>
              <Link to="/consent" className="block hover:text-[var(--primary)] transition-colors">{t('landing.footer.consent')}</Link>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-4">{t('landing.footer.contacts')}</div>
            <div className="space-y-3 text-[var(--text-muted)]">
              <a href={clientBotUrl('landing')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors"><Send className="w-4 h-4" /> {t('landing.footer.contactBot')}</a>
              <a href={channelUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors"><Send className="w-4 h-4" /> {t('landing.footer.channel')}</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto rounded-2xl border border-[var(--border)] p-5 mb-8">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t('landing.footer.disclaimer')}</p>
        </div>
        {/* [LANDING-RESTORE] правовая строка владельца: auto-update из его кабинета (OwnerLegalInfo API) */}
        {legalInfo?.operatorName && (
          <div className="max-w-6xl mx-auto text-center text-xs text-[var(--text-muted)] mb-3">
            {legalInfo.operatorName}
            {legalInfo.operatorType ? ` · ${legalInfo.operatorType}` : ''}
            {legalInfo.inn ? ` · ${t('landing.footer.innLabel')} ${legalInfo.inn}` : ''}
          </div>
        )}
        <div className="max-w-6xl mx-auto text-center text-xs text-[var(--text-muted)]">{t('landing.footer.copyright')}</div>
      </footer>

      {/* [LANDING-UNIFY] модалка входа/регистрации (форма не тронута); key — чтобы mode перечитывался */}
      <AuthModal
        key={authMode || 'login'}
        isOpen={authOpen}
        onClose={closeAuth}
        defaultMode={authMode || 'login'}
        onSuccess={() => {
          setAuthOpen(false)
          const role = user?.role
          if (role === 'client' || role === 'creator') {
            navigate('/onboarding')
          } else {
            navigate('/dashboard')
          }
        }}
      />
    </div>
  )
}
