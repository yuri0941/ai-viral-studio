import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Bot, BarChart3, Factory, Telescope, Calendar, Check, ChevronDown, ArrowRight, Send, Mail, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { API_BASE_URL } from '../../config.js'
import { planConfigApi, testimonialsApi, launchApi } from '../../services/api.js' // [P1.6-PREP] живые тарифы и отзывы
import FeatureMap from '../../components/landing/FeatureMap.jsx'
import ViralDemo from './ViralDemo.jsx'
import BetaCounter from './BetaCounter.jsx'
import WaitlistSection from './WaitlistSection.jsx'

const FEATURES = [
  { icon: Bot, title: 'AI Контент', desc: 'OMEGA генерирует посты, видео и идеи под вашу нишу.' },
  { icon: Send, title: 'Telegram Бот', desc: 'Управляйте проектами и получайте отчёты прямо в Telegram.' },
  { icon: BarChart3, title: 'Аналитика', desc: 'Отслеживайте охваты, конверсии и рост в real-time.' },
  { icon: Factory, title: 'Project Factory', desc: 'Создавайте полноценные проекты одной кнопкой.' },
  { icon: Telescope, title: 'Прогнозы', desc: 'AI Boardroom ищет тренды до того, как они станут мейнстримом.' },
  { icon: Calendar, title: 'Auto-Publish', desc: 'Планируйте публикации по всем каналам из одного окна.' }
]

const STEPS = [
  { num: '01', title: 'Подключите соцсети', desc: 'TikTok, Instagram, YouTube, Telegram, VK.' },
  { num: '02', title: 'OMEGA анализирует', desc: 'AI изучает аудиторию, нишу и конкурентов.' },
  { num: '03', title: 'Генерирует контент', desc: 'Посты, скрипты, картинки и видео.' },
  { num: '04', title: 'Публикует', desc: 'Автопостинг, аналитика, рост.' }
]

// [P1.6-PREP] выдуманные отзывы удалены — секция читает реальные отзывы из БД (GET /api/testimonials)

const FAQ = [
  { q: 'Что такое AI Viral Studio?', a: 'Это платформа с AI-ассистентом OMEGA, который создаёт, публикует и анализирует вирусный контент.' },
  { q: 'Нужны ли навыки программирования?', a: 'Нет. Интерфейс простой, а бот в Telegram ведёт вас за руку.' },
  { q: 'Какие соцсети поддерживаются?', a: 'TikTok, Instagram, YouTube, Telegram, VK и другие через интеграции.' },
  { q: 'Как попасть в бета-тест?', a: 'Запишитесь в waitlist — мы высылаем приглашения каждую неделю.' }
]

// [P1.6-PREP] хардкод PLANS удалён — тарифы читаются из PlanConfig (GET /api/plan-config)

export default function LandingPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState(null)

  // [P1.6-PREP] живые данные: тарифы из PlanConfig, отзывы из БД, founding-статус
  const [plans, setPlans] = useState(null)
  const [plansError, setPlansError] = useState(false)
  const [testimonials, setTestimonials] = useState([])
  const [foundingActive, setFoundingActive] = useState(false)

  useEffect(() => {
    let mounted = true
    planConfigApi.list()
      .then(res => { if (mounted) setPlans(Array.isArray(res?.plans) ? res.plans : []) })
      .catch(() => { if (mounted) { setPlans([]); setPlansError(true) } })
    testimonialsApi.list()
      .then(res => { if (mounted) setTestimonials(Array.isArray(res?.testimonials) ? res.testimonials : []) })
      .catch(() => { if (mounted) setTestimonials([]) })
    launchApi.betaSlots()
      .then(res => { if (mounted) setFoundingActive(!!res?.data?.foundingActive) })
      .catch(() => { if (mounted) setFoundingActive(false) })
    return () => { mounted = false }
  }, [])

  // [P1.6-PREP] строки фич тарифа из quotas/features PlanConfig
  const planFeatureLines = (p) => {
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

  const joinWaitlist = async (e) => {
    e.preventDefault()
    if (!waitlistEmail) return
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
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" /> AI Viral Studio
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text)] transition-colors">Возможности</a>
            <a href="#pricing" className="hover:text-[var(--text)] transition-colors">Тарифы</a>
            <a href="#how" className="hover:text-[var(--text)] transition-colors">Как это работает</a>
            <a href="#faq" className="hover:text-[var(--text)] transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90">Dashboard</button>
            ) : (
              <>
                <Link to="/login" className="hidden md:block text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Войти</Link>
                <Link to="/signup" className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90">Начать</Link>
              </>
            )}
            <button className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="fixed inset-0 z-40 bg-[var(--bg)]/95 pt-20 px-4 md:hidden">
          <nav className="flex flex-col gap-4 text-lg">
            <a href="#features" onClick={() => setMobileMenu(false)}>Возможности</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)}>Тарифы</a>
            <a href="#how" onClick={() => setMobileMenu(false)}>Как это работает</a>
            <a href="#faq" onClick={() => setMobileMenu(false)}>FAQ</a>
            <Link to="/login" onClick={() => setMobileMenu(false)}>Войти</Link>
            <Link to="/signup" onClick={() => setMobileMenu(false)}>Начать</Link>
          </nav>
        </div>
      )}

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary)_0%,_transparent_50%)] opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm border border-[var(--primary)]/20 mb-6">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" /> Запущено в 2026
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            AI Viral Studio — <br className="hidden md:block" />
            <span className="text-[var(--primary)]">автоматизируй вирусный контент</span> с OMEGA
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">
            ИИ создаёт, публикует и анализирует контент за вас. Подключите соцсети — и начните расти.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link to="/signup" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--text-on-primary)] font-semibold text-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              🚀 Записаться в бета <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="px-8 py-4 rounded-2xl glass-card border border-[var(--border)] font-semibold text-lg hover:border-[var(--primary)]/50 transition-colors">
              💼 Для бизнеса
            </Link>
          </div>

          <form onSubmit={joinWaitlist} className="max-w-md mx-auto flex items-center gap-2 glass-card rounded-2xl p-2 border border-[var(--border)]">
            <Mail className="w-5 h-5 text-[var(--text-muted)] ml-3" />
            <input
              type="email"
              required
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              placeholder="Email для бета-доступа"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm px-2"
            />
            <button type="submit" className="px-4 py-2 min-h-[40px] rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-medium whitespace-nowrap shrink-0">Ждать доступ</button>
          </form>
          {waitlistStatus?.ok && <p className="text-sm text-emerald-400 mt-3">✅ Вы в waitlist, позиция #{waitlistStatus.position}</p>}
          {waitlistStatus?.ok === false && <p className="text-sm text-red-400 mt-3">Ошибка: {waitlistStatus.error}</p>}
        </div>
        <BetaCounter />
      </section>

      <ViralDemo />

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Возможности</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                <f.icon className="w-8 h-8 text-[var(--primary)] mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeatureMap />

      {/* Pricing — [P1.6-PREP] живые данные из PlanConfig */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Тарифы</h2>
          {plansError && (
            <div className="glass-card rounded-2xl p-6 border border-[var(--border)] text-center text-[var(--text-muted)]">
              {t('landing.plans.error')}
            </div>
          )}
          {!plansError && plans === null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-2xl p-6 border border-[var(--border)] glass-card animate-pulse h-64" />
              ))}
            </div>
          )}
          {!plansError && plans !== null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.plan} className={`relative rounded-2xl p-6 border ${p.plan === 'pro' ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] glass-card'}`}>
                  {p.plan === 'pro' && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--primary)] text-[var(--text-on-primary)] text-xs font-medium">{t('landing.plans.popular')}</span>}
                  <h3 className="text-xl font-bold mb-2 capitalize">{p.plan}</h3>
                  <div className="text-3xl font-bold mb-1">{p.price} <span className="text-sm text-[var(--text-muted)] font-normal">{t('landing.plans.perMonth')}</span></div>
                  {foundingActive && p.price > 0 && (
                    <div className="text-xs text-emerald-400 mb-3 break-words">{t('landing.plans.foundingLine', { price: Math.round(p.price * 0.7) })}</div>
                  )}
                  <ul className="space-y-2 mb-6 mt-4">
                    {planFeatureLines(p).map((feat, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-[var(--text-muted)] break-words"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> {feat}</li>
                    ))}
                  </ul>
                  <Link to={`/signup?plan=${p.plan}`} className="block text-center py-3 min-h-[40px] rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90">{t('landing.plans.choose')}</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Как это работает</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 border border-[var(--border)]">
                <div className="text-3xl font-black text-[var(--primary)]/30 mb-4">{s.num}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — [P1.6-PREP] реальные отзывы из БД; при отсутствии — честная заглушка */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('landing.testimonials.title')}</h2>
          {testimonials.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-[var(--border)] text-center text-[var(--text-muted)] break-words">
              {t('landing.testimonials.empty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((item) => (
                <div key={item._id} className="glass-card rounded-2xl p-6 border border-[var(--border)]">
                  <p className="text-sm text-[var(--text)] mb-4 break-words">“{item.text}”</p>
                  <div className="text-sm font-semibold break-words">{item.name}</div>
                  {item.role && <div className="text-xs text-[var(--text-muted)] break-words">{item.role}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <WaitlistSection />

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-3">
            {[...FAQ.slice(0, 3),
              // [P1.6-PREP] живые цены из PlanConfig вместо хардкода
              { q: 'Сколько стоит?', a: plans?.length ? t('landing.faq.priceAnswer', { pro: planPrice('pro'), agency: planPrice('agency') }) : t('landing.faq.priceAnswerFallback') },
              ...FAQ.slice(3)].map((item, i) => (
              <div key={i} className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between p-4 text-left">
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-sm text-[var(--text-muted)]">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4"><Sparkles className="w-5 h-5 text-[var(--primary)]" /> AI Viral Studio</div>
            <p className="text-[var(--text-muted)]">Автоматизация вирусного контента с OMEGA AI.</p>
          </div>
          <div>
            <div className="font-semibold mb-3">Продукт</div>
            <div className="space-y-2 text-[var(--text-muted)]"><a href="#features" className="block hover:text-[var(--text)]">Возможности</a><a href="#pricing" className="block hover:text-[var(--text)]">Тарифы</a><a href="#how" className="block hover:text-[var(--text)]">Как работает</a></div>
          </div>
          <div>
            <div className="font-semibold mb-3">Компания</div>
            <div className="space-y-2 text-[var(--text-muted)]"><Link to="/docs" className="block hover:text-[var(--text)]">API Docs</Link><Link to="/privacy" className="block hover:text-[var(--text)]">Privacy</Link><Link to="/terms" className="block hover:text-[var(--text)]">Terms</Link></div>
          </div>
          <div>
            <div className="font-semibold mb-3">Контакты</div>
            <a href="https://t.me/aiviralstudio" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)]"><Send className="w-4 h-4" /> Telegram канал</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 text-center text-xs text-[var(--text-muted)]">© 2026 AI Viral Studio. Все права защищены.</div>
      </footer>
    </div>
  )
}
