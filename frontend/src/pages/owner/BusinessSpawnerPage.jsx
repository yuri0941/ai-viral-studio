import { useState, useEffect, useMemo } from 'react'
import {
    Rocket, Coffee, Utensils, GraduationCap, ShoppingBag, Code, Sparkles, Crown, Dumbbell,
    Home, Palette, Check, ArrowLeft, ArrowRight, Globe, Instagram, Music, Youtube,
    Send, Twitter, Linkedin, Calendar, Loader2, Save, CheckCircle, AlertCircle
} from 'lucide-react'
import { API_URL } from '../../config.js'

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers,
        },
        ...options,
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
    }
    return res.json()
}

const NICHES = [
    { id: 'coffee', label: 'Кофейня', icon: Coffee, description: 'Уютное место для ценителей Specialty кофе.' },
    { id: 'restaurant', label: 'Ресторан', icon: Utensils, description: 'Гастрономический опыт и авторская кухня.' },
    { id: 'school', label: 'Онлайн-школа', icon: GraduationCap, description: 'Курсы, мастер-классы и образовательный контент.' },
    { id: 'ecommerce', label: 'E-commerce', icon: ShoppingBag, description: 'Продажи товаров через сайт и маркетплейсы.' },
    { id: 'saas', label: 'SaaS', icon: Code, description: 'Облачный сервис и подписочная модель.' },
    { id: 'beauty', label: 'Бьюти', icon: Sparkles, description: 'Косметика, уход и beauty-услуги.' },
    { id: 'fitness', label: 'Фитнес', icon: Dumbbell, description: 'Тренировки, коучинг и здоровый образ жизни.' },
    { id: 'realty', label: 'Недвижимость', icon: Home, description: 'Аренда, продажа и управление объектами.' },
]

const STYLES = [
    { id: 'professional', label: 'Professional', sample: 'Чистая типографика, сдержанные цвета, доверие.' },
    { id: 'friendly', label: 'Friendly', sample: 'Мягкие формы, тёплые тона, разговорный тон.' },
    { id: 'bold', label: 'Bold', sample: 'Контраст, крупные заголовки, уверенность.' },
    { id: 'minimal', label: 'Minimal', sample: 'Много воздуха, 1-2 цвета, фокус на контент.' },
]

const COLORS = [
    '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'
]

const SOCIALS = [
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'tiktok', label: 'TikTok', icon: Music },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'telegram', label: 'Telegram', icon: Send },
    { id: 'vk', label: 'VK', icon: Globe },
    { id: 'twitter', label: 'Twitter/X', icon: Twitter },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
]

const STEP_TITLES = [
    'Выберите нишу',
    'Название и бренд',
    'Соцсети и платформы',
    'Контент-план',
    'Обзор и запуск',
]

function randomDate(offsetDays = 0) {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString().split('T')[0]
}

export function BusinessSpawnerPage() {
    const [step, setStep] = useState(1)
    const [selectedNiche, setSelectedNiche] = useState(null)
    const [businessName, setBusinessName] = useState('')
    const [brandColor, setBrandColor] = useState(COLORS[0])
    const [customColor, setCustomColor] = useState(COLORS[0])
    const [brandStyle, setBrandStyle] = useState(STYLES[0].id)
    const [socials, setSocials] = useState(() => {
        const init = {}
        SOCIALS.forEach(s => {
            init[s.id] = { enabled: false, username: '', link: '' }
        })
        return init
    })
    const [posts, setPosts] = useState([])
    const [generatingName, setGeneratingName] = useState(false)
    const [generatingPosts, setGeneratingPosts] = useState(false)
    const [launching, setLaunching] = useState(false)
    const [launchProgress, setLaunchProgress] = useState(0)
    const [launchError, setLaunchError] = useState(null)

    const activeColor = brandColor === 'custom' ? customColor : brandColor

    const selectedNicheData = useMemo(() => NICHES.find(n => n.id === selectedNiche), [selectedNiche])

    useEffect(() => {
        if (step === 4 && posts.length === 0) {
            generatePosts()
        }
    }, [step])

    const toggleSocial = (id) => {
        setSocials(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }))
    }

    const updateSocial = (id, field, value) => {
        setSocials(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
    }

    const generateName = async () => {
        if (!selectedNiche) return
        setGeneratingName(true)
        try {
            const res = await api('/omega/generate-name', {
                method: 'POST',
                body: JSON.stringify({ niche: selectedNicheData?.label || selectedNiche }),
            })
            if (res?.name) {
                setBusinessName(res.name)
            } else {
                throw new Error('empty')
            }
        } catch {
            // fallback generation
            const prefixes = {
                coffee: ['Brew', 'Bean', 'Cup', 'Moka', 'Roast'],
                restaurant: ['Taste', 'Gusto', 'Savor', 'Plate', 'Kitchen'],
                school: ['Learn', 'Skill', 'Academy', 'Mind', 'Study'],
                ecommerce: ['Shop', 'Mart', 'Cart', 'Goods', 'Market'],
                saas: ['Flow', 'SaaS', 'Cloud', 'Task', 'Logic'],
                beauty: ['Glow', 'Charm', 'Beauty', 'Skin', 'Lush'],
                fitness: ['Fit', 'Pulse', 'Iron', 'Move', 'Strong'],
                realty: ['Home', 'Estate', 'Key', 'Nest', 'Place'],
            }
            const list = prefixes[selectedNiche] || ['Nova', 'Flux', 'Orbit']
            setBusinessName(`${list[Math.floor(Math.random() * list.length)]}${Math.floor(Math.random() * 90 + 10)}`)
        } finally {
            setGeneratingName(false)
        }
    }

    const generatePosts = () => {
        setGeneratingPosts(true)
        const templates = [
            'Знакомство с брендом: кто мы и почему это важно',
            'Топ-3 ошибки клиентов в нише и как их избежать',
            'История создания: первые шаги и вдохновение',
            'Кейс: как мы помогли первому клиенту',
            'Обзор главной фишки продукта',
            'Честный разбор мифов в индустрии',
            'Пользовательский контент и отзыв',
            'Анонс акции или запуска',
            'Полезный чек-лист для аудитории',
            'Подведение итогов месяца и планы',
        ]
        const next = templates.map((title, i) => ({
            id: `post-${i}`,
            title,
            date: randomDate(i + 1),
            text: '',
        }))
        setPosts(next)
        setTimeout(() => setGeneratingPosts(false), 600)
    }

    const generatePostText = (postId) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, text: `Автоматически сгенерированный текст для поста «${p.title}». Здесь может быть длинный текст с призывом к действию, хештегами и полезной информацией для вашей аудитории.` } : p))
    }

    const movePostDate = (postId, days) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p
            const d = new Date(p.date)
            d.setDate(d.getDate() + days)
            return { ...p, date: d.toISOString().split('T')[0] }
        }))
    }

    const saveDraft = () => {
        const draft = { step, selectedNiche, businessName, brandColor, customColor, brandStyle, socials, posts }
        localStorage.setItem('business_spawner_draft', JSON.stringify(draft))
        alert('Черновик сохранён')
    }

    const launchBusiness = async () => {
        setLaunching(true)
        setLaunchError(null)
        setLaunchProgress(0)
        const payload = {
            niche: selectedNicheData?.label,
            name: businessName,
            color: activeColor,
            style: brandStyle,
            socials,
            posts,
        }
        try {
            const progressInterval = setInterval(() => {
                setLaunchProgress(p => {
                    if (p >= 90) {
                        clearInterval(progressInterval)
                        return 90
                    }
                    return p + 10
                })
            }, 300)
            const res = await api('/business-spawner/launch', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
            clearInterval(progressInterval)
            setLaunchProgress(100)
            setTimeout(() => {
                window.location.href = `/dashboard?businessId=${res.businessId || 'new-id'}`
            }, 500)
        } catch (err) {
            setLaunchError(err.message)
            setLaunching(false)
        }
    }

    const canGoNext = () => {
        if (step === 1) return !!selectedNiche
        if (step === 2) return !!businessName.trim()
        return true
    }

    const renderStep1 = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {NICHES.map(niche => {
                const Icon = niche.icon
                const active = selectedNiche === niche.id
                return (
                    <button
                        key={niche.id}
                        onClick={() => setSelectedNiche(niche.id)}
                        className={`relative text-left p-5 rounded-2xl border transition-all hover:scale-105 ${
                            active
                                ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg shadow-[var(--primary)]/10'
                                : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--primary)]/30'
                        }`}
                    >
                        {active && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                                <Check size={14} className="text-white" />
                            </div>
                        )}
                        <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
                            <Icon size={24} className="text-[var(--primary)]" />
                        </div>
                        <h3 className="text-[var(--text)] font-semibold mb-1">{niche.label}</h3>
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">{niche.description}</p>
                    </button>
                )
            })}
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-6 max-w-2xl">
            <div>
                <label className="text-sm text-[var(--text-muted)] mb-2 block">Название бизнеса</label>
                <div className="flex items-center gap-2">
                    <input
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="Например, BrewLab"
                        className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]/50"
                    />
                    <button
                        onClick={generateName}
                        disabled={generatingName || !selectedNiche}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-sm hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                    >
                        {generatingName ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        AI
                    </button>
                </div>
            </div>

            <div>
                <label className="text-sm text-[var(--text-muted)] mb-2 block">Цвет бренда</label>
                <div className="flex flex-wrap items-center gap-3">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setBrandColor(c)}
                            className={`w-10 h-10 rounded-full border-2 transition-all ${brandColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={customColor}
                            onChange={e => { setBrandColor('custom'); setCustomColor(e.target.value) }}
                            className="w-10 h-10 rounded-full overflow-hidden border-0 p-0 cursor-pointer"
                        />
                        <span className="text-xs text-[var(--text-muted)]">Кастомный</span>
                    </div>
                </div>
            </div>

            <div>
                <label className="text-sm text-[var(--text-muted)] mb-2 block">Стиль бренда</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STYLES.map(style => (
                        <button
                            key={style.id}
                            onClick={() => setBrandStyle(style.id)}
                            className={`text-left p-4 rounded-xl border transition-all ${
                                brandStyle === style.id
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--primary)]/30'
                            }`}
                        >
                            <div className="text-[var(--text)] font-medium text-sm mb-1">{style.label}</div>
                            <div className="text-[var(--text-muted)] text-xs">{style.sample}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )

    const renderStep3 = () => (
        <div className="space-y-4 max-w-2xl">
            <button
                onClick={() => {
                    SOCIALS.forEach(s => updateSocial(s.id, 'enabled', true))
                }}
                className="px-4 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs hover:bg-[var(--primary)]/20 transition-colors"
            >
                Авто-подключение всех платформ
            </button>
            <div className="space-y-3">
                {SOCIALS.map(s => {
                    const Icon = s.icon
                    const enabled = socials[s.id].enabled
                    return (
                        <div key={s.id} className={`p-4 rounded-xl border transition-colors ${enabled ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)]'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[var(--bg)] flex items-center justify-center">
                                        <Icon size={18} className="text-[var(--primary)]" />
                                    </div>
                                    <span className="text-[var(--text)] text-sm font-medium">{s.label}</span>
                                </div>
                                <button
                                    onClick={() => toggleSocial(s.id)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'}`}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                            {enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        value={socials[s.id].username}
                                        onChange={e => updateSocial(s.id, 'username', e.target.value)}
                                        placeholder="Название аккаунта"
                                        className="px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]/50"
                                    />
                                    <input
                                        value={socials[s.id].link}
                                        onChange={e => updateSocial(s.id, 'link', e.target.value)}
                                        placeholder="Ссылка"
                                        className="px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]/50"
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )

    const renderStep4 = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text)]">AI-контент-план</h3>
                <button
                    onClick={generatePosts}
                    disabled={generatingPosts}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                >
                    {generatingPosts ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Пересоздать план
                </button>
            </div>
            <div className="relative pl-6 border-l-2 border-[var(--border)] space-y-6">
                {posts.map((post, idx) => (
                    <div key={post.id} className="relative">
                        <div className="absolute -left-[31px] top-0 w-5 h-5 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)] flex items-center justify-center text-[10px] text-[var(--primary)]">
                            {idx + 1}
                        </div>
                        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                                <Calendar size={12} />
                                <input
                                    type="date"
                                    value={post.date}
                                    onChange={e => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, date: e.target.value } : p))}
                                    className="bg-transparent outline-none text-[var(--text)]"
                                />
                                <button onClick={() => movePostDate(post.id, -1)} className="px-2 py-0.5 rounded bg-[var(--bg)] hover:bg-[var(--surface)]">-1</button>
                                <button onClick={() => movePostDate(post.id, 1)} className="px-2 py-0.5 rounded bg-[var(--bg)] hover:bg-[var(--surface)]">+1</button>
                            </div>
                            <input
                                value={post.title}
                                onChange={e => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, title: e.target.value } : p))}
                                className="w-full bg-transparent text-[var(--text)] font-medium text-sm outline-none"
                            />
                            {post.text ? (
                                <p className="text-[var(--text-muted)] text-xs leading-relaxed">{post.text}</p>
                            ) : (
                                <button
                                    onClick={() => generatePostText(post.id)}
                                    className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
                                >
                                    <Sparkles size={12} /> Сгенерировать текст
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    const renderStep5 = () => {
        const enabledSocials = SOCIALS.filter(s => socials[s.id].enabled)
        return (
            <div className="max-w-2xl space-y-6">
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
                    <h3 className="text-[var(--text)] font-semibold flex items-center gap-2">
                        <Crown size={18} className="text-[var(--primary)]" /> Сводка
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-[var(--text-muted)]">Ниша</div>
                        <div className="text-[var(--text)] text-right">{selectedNicheData?.label}</div>
                        <div className="text-[var(--text-muted)]">Название</div>
                        <div className="text-[var(--text)] text-right">{businessName}</div>
                        <div className="text-[var(--text-muted)]">Цвет</div>
                        <div className="text-[var(--text)] text-right flex items-center justify-end gap-2">
                            <span className="w-4 h-4 rounded-full border border-[var(--border)]" style={{ backgroundColor: activeColor }} />
                            {activeColor}
                        </div>
                        <div className="text-[var(--text-muted)]">Стиль</div>
                        <div className="text-[var(--text)] text-right capitalize">{STYLES.find(s => s.id === brandStyle)?.label}</div>
                        <div className="text-[var(--text-muted)]">Платформы</div>
                        <div className="text-[var(--text)] text-right">{enabledSocials.map(s => s.label).join(', ') || '—'}</div>
                        <div className="text-[var(--text-muted)]">Постов</div>
                        <div className="text-[var(--text)] text-right">{posts.length}</div>
                    </div>
                </div>

                {launching && (
                    <div className="space-y-2">
                        <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${launchProgress}%` }} />
                        </div>
                        <div className="text-xs text-[var(--text-muted)] text-center">Запуск бизнеса… {launchProgress}%</div>
                    </div>
                )}

                {launchError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle size={14} /> {launchError}
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={launchBusiness}
                        disabled={launching}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {launching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                        🚀 Запустить бизнес
                    </button>
                    <button
                        onClick={saveDraft}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors"
                    >
                        <Save size={16} /> 💾 Сохранить как черновик
                    </button>
                </div>
            </div>
        )
    }

    const stepContent = () => {
        switch (step) {
            case 1: return renderStep1()
            case 2: return renderStep2()
            case 3: return renderStep3()
            case 4: return renderStep4()
            case 5: return renderStep5()
            default: return renderStep1()
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Rocket className="text-[var(--primary)]" size={28} />
                        Рождение бизнеса
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Пошаговый wizard создания нового бизнеса с OMEGA.</p>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between">
                    {STEP_TITLES.map((title, idx) => {
                        const s = idx + 1
                        const active = s === step
                        const completed = s < step
                        return (
                            <div key={s} className="flex-1 flex items-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                                        active
                                            ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                            : completed
                                                ? 'bg-green-500/20 text-green-400 border-green-500'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]'
                                    }`}>
                                        {completed ? <Check size={14} /> : s}
                                    </div>
                                    <span className={`text-[10px] text-center hidden sm:block ${active ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{title}</span>
                                </div>
                                {s < STEP_TITLES.length && (
                                    <div className={`flex-1 h-[2px] mx-2 ${s < step ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 md:p-6">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-5">{STEP_TITLES[step - 1]}</h2>
                    {stepContent()}
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                    >
                        <ArrowLeft size={16} /> Назад
                    </button>
                    {step < 5 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canGoNext()}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            Далее <ArrowRight size={16} />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default BusinessSpawnerPage
