import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, Bot, BarChart3, Factory, Telescope, Calendar, CreditCard } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const NICHES = ['кофейня', 'бьюти', 'IT', 'одежда', 'еда', 'недвижимость', 'фитнес', 'другое']
const GOALS = [
  { id: 'sales', label: 'Продажи' },
  { id: 'awareness', label: 'Узнаваемость' },
  { id: 'subscribers', label: 'Подписчики' },
  { id: 'leads', label: 'Лид-ген' }
]
const SOCIALS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'vk', label: 'VK' }
]

const PLANS = [
  { id: 'free', name: 'Free', price: 0, icon: Bot },
  { id: 'pro', name: 'Pro', price: 990, icon: BarChart3 },
  { id: 'agency', name: 'Agency', price: 4990, icon: Factory }
]

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialPlan = searchParams.get('plan') || 'free'
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [plans, setPlans] = useState({})
  const [form, setForm] = useState({
    email: '',
    password: '',
    plan: initialPlan,
    niche: '',
    goals: [],
    socials: [],
    firstProject: ''
  })

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/plans`).then(r => r.ok ? r.json() : {}).then(data => setPlans(data.plans || {})).catch(() => {})
  }, [])

  useEffect(() => {
    if (['pro', 'agency', 'free'].includes(initialPlan)) {
      setForm(f => ({ ...f, plan: initialPlan }))
    }
  }, [initialPlan])

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const toggle = (key, id) => {
    setForm(f => {
      const list = f[key]
      return { ...f, [key]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] }
    })
  }

  const createAccount = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role: 'creator' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Registration failed')
      if (json.token) localStorage.setItem('token', json.token)
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const payAndActivate = async () => {
    if (form.plan === 'free') return true
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/public/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: form.plan, provider: 'yookassa' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Payment failed')
      if (json.mock && json.paymentUrl === '#') {
        await fetch(`${API_BASE_URL}/public/subscribe/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ planId: form.plan })
        })
      } else if (json.paymentUrl && json.paymentUrl !== '#') {
        window.location.href = json.paymentUrl
        return false
      }
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (step < 4) return setStep(s => s + 1)
    const ok = await createAccount()
    if (!ok) return
    if (form.plan !== 'free') {
      const paid = await payAndActivate()
      if (!paid) return
    }
    setStep(5)
    setTimeout(() => navigate('/dashboard'), 2500)
  }

  const stepValid = () => {
    if (step === 1) return form.email && form.password.length >= 6 && form.plan
    if (step === 2) return form.niche && form.goals.length > 0 && form.socials.length > 0
    if (step === 3) return form.plan !== 'free' ? true : true
    if (step === 4) return form.firstProject
    return true
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-8">
          <Sparkles className="w-5 h-5 text-[var(--primary)]" /> AI Viral Studio
        </Link>

        <div className="glass-card rounded-3xl p-8 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 h-1 mx-1 rounded-full ${s <= step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Регистрация</h1>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-[var(--primary)]" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Пароль (мин. 6 символов)</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-[var(--primary)]" placeholder="••••••" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Выберите тариф</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map(p => {
                    const planData = plans[p.id] || p
                    const selected = form.plan === p.id
                    return (
                      <button key={p.id} onClick={() => update('plan', p.id)} className={`rounded-2xl p-4 border text-left transition-all ${selected ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--primary)]/30'}`}>
                        <p.icon className={`w-6 h-6 mb-2 ${selected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                        <div className="font-semibold">{planData.name}</div>
                        <div className="text-sm text-[var(--text-muted)]">{planData.price} ₽/мес</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Onboarding</h1>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Ваша ниша</label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map(n => (
                    <button key={n} onClick={() => update('niche', n)} className={`px-4 py-2 rounded-xl border text-sm ${form.niche === n ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Цели</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map(g => (
                    <button key={g.id} onClick={() => toggle('goals', g.id)} className={`px-4 py-2 rounded-xl border text-sm ${form.goals.includes(g.id) ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>{g.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Соцсети</label>
                <div className="flex flex-wrap gap-2">
                  {SOCIALS.map(s => (
                    <button key={s.id} onClick={() => toggle('socials', s.id)} className={`px-4 py-2 rounded-xl border text-sm ${form.socials.includes(s.id) ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>{s.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Оплата</h1>
              {form.plan === 'free' ? (
                <div className="p-6 rounded-2xl border border-[var(--border)] text-center">
                  <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-lg font-semibold">Бесплатный тариф</p>
                  <p className="text-sm text-[var(--text-muted)]">Никакой оплаты не требуется.</p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-6 h-6 text-[var(--primary)]" />
                    <div className="font-semibold">{plans[form.plan]?.name || form.plan} — {plans[form.plan]?.price || PLANS.find(p => p.id === form.plan)?.price} ₽/мес</div>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Сейчас включён mock-режим. После нажатия «Оплатить» подписка активируется автоматически для теста.</p>
                  <button disabled className="w-full py-3 rounded-xl bg-[var(--primary)]/20 text-[var(--text-muted)] text-sm font-medium cursor-not-allowed">Mock-оплата</button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Первый проект</h1>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">О чём ваш первый пост / видео?</label>
                <input value={form.firstProject} onChange={e => update('firstProject', e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-[var(--primary)]" placeholder="Например: обзор нового латте в кофейне" />
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50">
                <div className="text-sm font-medium mb-2">Сводка</div>
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <p>Тариф: <span className="text-[var(--text)]">{plans[form.plan]?.name || form.plan}</span></p>
                  <p>Ниша: <span className="text-[var(--text)]">{form.niche}</span></p>
                  <p>Цели: <span className="text-[var(--text)]">{form.goals.map(g => GOALS.find(x => x.id === g)?.label).join(', ')}</span></p>
                  <p>Соцсети: <span className="text-[var(--text)]">{form.socials.map(s => SOCIALS.find(x => x.id === s)?.label).join(', ')}</span></p>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Добро пожаловать!</h1>
              <p className="text-[var(--text-muted)]">OMEGA готовится к работе... Перенаправляем в Dashboard.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

          {step < 5 && (
            <div className="flex items-center justify-between mt-8">
              <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-30">
                <ArrowLeft className="w-4 h-4" /> Назад
              </button>
              <button onClick={submit} disabled={!stepValid() || loading} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-[var(--text-on-primary)] text-sm font-medium disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 4 ? 'Завершить' : 'Далее'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
