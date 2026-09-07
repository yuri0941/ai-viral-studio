// [HOTFIX-FINAL-2 З6] House-ads слоты (спека Р3): домашние заглушки во всех рекламных слотах.
// Ротация: аддоны → апгрейд → рефералка 12% → YouTube-разведка. Crossfade 250–300ms.
// Варианты: banner (чат-топ ≤34px), sidebar (карточка), pill (768–1024), bottombar (<768, сворачиваемая).
// Метка «Реклама» всегда; ✕ «Скрыть на день» у каждого слота; reduced-motion → статика;
// pulse не чаще раза в 3.5с. owner/admin/staff слоты не видят (как и прежний промо-баннер).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Sparkles, Rocket, Gift, Youtube, ChevronUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { API_BASE_URL } from '../../config.js'

const HIDE_MS = 24 * 60 * 60 * 1000 // «Скрыть на день»
const ROTATE_MS = 10000
const FADE_MS = 275 // crossfade 250–300ms

const ITEMS = [
    { id: 'addons', icon: Sparkles, to: '/settings?tab=addons' },
    { id: 'upgrade', icon: Rocket, to: '/settings?tab=subscription' },
    { id: 'referral', icon: Gift, action: 'copy-referral' },
    { id: 'ytScout', icon: Youtube, to: '/creative-hub/viral' },
]

function isHiddenForDay(slot) {
    try {
        const ts = Number(localStorage.getItem(`house_ad_hide_${slot}`) || 0)
        return ts > 0 && Date.now() - ts < HIDE_MS
    } catch { return false }
}

function hideForDay(slot) {
    try { localStorage.setItem(`house_ad_hide_${slot}`, String(Date.now())) } catch { /* quota */ }
}

function useReducedMotion() {
    const [reduced, setReduced] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        if (!mq) return
        const onChange = () => setReduced(mq.matches)
        mq.addEventListener?.('change', onChange)
        return () => mq.removeEventListener?.('change', onChange)
    }, [])
    return reduced
}

export function HouseAdSlot({ slot, variant = 'sidebar', className = '' }) {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const reducedMotion = useReducedMotion()
    const [hidden, setHidden] = useState(() => isHiddenForDay(slot))
    const [collapsed, setCollapsed] = useState(false) // bottombar: свернута в чип
    const [index, setIndex] = useState(0)
    const [fading, setFading] = useState(false)
    const [copied, setCopied] = useState(false)
    const timerRef = useRef(null)

    // Ротация house ads; reduced-motion → статика (первый креатив, без ротации и анимаций)
    useEffect(() => {
        if (reducedMotion || hidden) return
        timerRef.current = setInterval(() => {
            setFading(true)
            setTimeout(() => {
                setIndex(i => (i + 1) % ITEMS.length)
                setFading(false)
            }, FADE_MS)
        }, ROTATE_MS)
        return () => clearInterval(timerRef.current)
    }, [reducedMotion, hidden])

    if (hidden) return null
    // Команда проекта домашнюю рекламу не видит — шум (правило прежнего промо-баннера)
    if (['owner', 'admin', 'staff'].includes(user?.role)) return null

    const item = ITEMS[index]
    const Icon = item.icon

    const handleHide = (e) => {
        e.stopPropagation()
        hideForDay(slot)
        setHidden(true)
    }

    const handleClick = async () => {
        if (item.action === 'copy-referral') {
            let link = `${window.location.origin}/`
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`${API_BASE_URL}/public/referral`, { headers: { Authorization: `Bearer ${token}` } })
                const data = await res.json()
                if (data?.link) link = data.link
            } catch { /* фолбэк — главная */ }
            try {
                await navigator.clipboard.writeText(link)
                setCopied(true)
                setTimeout(() => setCopied(false), 2500)
            } catch { /* clipboard недоступен */ }
            return
        }
        navigate(item.to)
    }

    const label = (
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] opacity-70 shrink-0">
            {t('houseAd.label')}
        </span>
    )
    const hideBtn = (
        <button
            onClick={handleHide}
            aria-label={t('houseAd.hide')}
            title={t('houseAd.hide')}
            className="shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
        >
            <X size={12} />
        </button>
    )
    const pulseDot = (
        <span
            className={`shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--primary)] ${reducedMotion ? '' : 'animate-pulse'}`}
            style={reducedMotion ? undefined : { animationDuration: '3.5s' }}
        />
    )
    const content = (
        <div
            className="flex items-center gap-2 min-w-0 transition-opacity ease-in-out"
            style={{ transitionDuration: `${FADE_MS}ms`, opacity: fading ? 0 : 1 }}
        >
            <Icon size={variant === 'sidebar' ? 18 : 13} className="shrink-0 text-[var(--primary)]" />
            <span className={`truncate ${variant === 'sidebar' ? 'text-sm' : 'text-xs'} text-[var(--text)]`}>
                {t(`houseAd.items.${item.id}.title`)}
            </span>
        </div>
    )

    // Чат: топ-баннер ≤34px, не сдвигает инпут (занимает своё место над лентой)
    if (variant === 'banner') {
        return (
            <div className={`h-[34px] min-h-[34px] w-full flex items-center gap-2 px-3 rounded-xl glass-card border border-[var(--border)] overflow-hidden ${className}`}>
                {pulseDot}
                {label}
                <button onClick={handleClick} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                    {content}
                </button>
                <span className="shrink-0 text-[10px] font-semibold text-[var(--primary)]">
                    {copied ? t('houseAd.copied') : t(`houseAd.items.${item.id}.cta`)}
                </span>
                {hideBtn}
            </div>
        )
    }

    // 768–1024: мини-пилюля
    if (variant === 'pill') {
        return (
            <div className={`inline-flex items-center gap-2 h-8 pl-3 pr-1 rounded-full glass-card border border-[var(--border)] max-w-full overflow-hidden ${className}`}>
                {pulseDot}
                {label}
                <button onClick={handleClick} className="min-w-0 hover:opacity-80 transition-opacity">
                    {content}
                </button>
                {hideBtn}
            </div>
        )
    }

    // <768: нижняя плашка над safe-area, сворачиваемая в чип
    if (variant === 'bottombar') {
        if (collapsed) {
            return (
                <button
                    onClick={() => setCollapsed(false)}
                    aria-label={t('houseAd.label')}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-full glass-card border border-[var(--border)] text-[10px] text-[var(--text-muted)] ${className}`}
                >
                    <ChevronUp size={12} /> {t('houseAd.label')}
                </button>
            )
        }
        return (
            <div className={`w-full flex items-center gap-2 px-3 py-2 rounded-2xl glass-card border border-[var(--border)] shadow-lg shadow-black/30 ${className}`}>
                {pulseDot}
                {label}
                <button onClick={handleClick} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                    {content}
                </button>
                <button
                    onClick={() => setCollapsed(true)}
                    aria-label={t('houseAd.collapse')}
                    title={t('houseAd.collapse')}
                    className="shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                    <ChevronUp size={14} className="rotate-180" />
                </button>
                {hideBtn}
            </div>
        )
    }

    // Десктоп ≥1024 (прочие вкладки): карточка в сайдбаре
    return (
        <div className={`rounded-2xl glass-card border border-[var(--border)] p-3 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">{pulseDot}{label}</div>
                {hideBtn}
            </div>
            <button onClick={handleClick} className="w-full text-left hover:opacity-80 transition-opacity">
                {content}
            </button>
            <button
                onClick={handleClick}
                className="mt-2 w-full py-2 min-h-[36px] rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/20 transition-colors"
            >
                {copied ? t('houseAd.copied') : t(`houseAd.items.${item.id}.cta`)}
            </button>
        </div>
    )
}

export default HouseAdSlot
