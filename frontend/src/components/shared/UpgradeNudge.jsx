import { useState, useEffect } from 'react'
import { X, Zap, Gift, Crown } from 'lucide-react'

const STORAGE_KEY = 'omega_upgrade_nudge_dismissed'

function getSuggestion({ user, generationsUsed, generationsLimit, postsCount, lastActiveDays }) {
    // [OWNER-OMEGA] владельцу и команде (owner/admin/staff) upsell не показываем — для них это шум
    if (['owner', 'admin', 'staff'].includes(user?.role)) return null
    if (generationsUsed != null && generationsLimit != null && generationsLimit > 0 && generationsUsed / generationsLimit > 0.8) {
        return {
            id: 'topup',
            icon: Zap,
            title: '💡 Генерации на исходе',
            // [CHECKOUT-UNIFY] ссылка вела на legacy /checkout с несуществующим планом topup-50 (404) → живой экран тарифов
            text: `Вы использовали ${generationsUsed} из ${generationsLimit}. Перейдите на Pro — больше генераций каждый день.`,
            cta: 'Тарифы',
            action: '/settings?tab=subscription',
        }
    }
    if (lastActiveDays != null && lastActiveDays >= 3) {
        return {
            id: 'comeback',
            icon: Gift,
            title: 'Возвращайтесь!',
            text: 'OMEGA скучала. Возьмите +20 бонусных генераций бесплатно.',
            cta: 'Получить',
            action: '/dashboard',
        }
    }
    if (user?.plan === 'free' && postsCount >= 5) {
        return {
            id: 'upgrade',
            icon: Crown,
            title: 'Готовы к росту?',
            // [CHECKOUT-UNIFY] тарифа Creator нет в PlanConfig — актуальный платный тариф Pro
            text: 'Перейдите на Pro — аналитика, планировщик, AI-обложки и безлимитные идеи.',
            cta: 'Подробнее',
            action: '/settings?tab=subscription',
        }
    }
    return null
}

export function UpgradeNudge({ user, generationsUsed, generationsLimit, postsCount, lastActiveDays }) {
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed.expires && new Date(parsed.expires) > new Date() && parsed.id === getSuggestion({ user, generationsUsed, generationsLimit, postsCount, lastActiveDays })?.id) {
                    setDismissed(true)
                }
            }
        } catch {}
    }, [user, generationsUsed, generationsLimit, postsCount, lastActiveDays])

    const suggestion = getSuggestion({ user, generationsUsed, generationsLimit, postsCount, lastActiveDays })
    if (!suggestion || dismissed) return null

    const Icon = suggestion.icon

    const close = () => {
        setDismissed(true)
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: suggestion.id, expires }))
    }

    return (
        <div className="glass-card glow-border rounded-2xl p-4 animate-fade-in-up slide-in-right relative overflow-hidden">
            <button onClick={close} className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                    <h4 className="text-sm font-bold text-white mb-1">{suggestion.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed mb-3">{suggestion.text}</p>
                    <a
                        href={suggestion.action}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-colors"
                    >
                        {suggestion.cta}
                    </a>
                </div>
            </div>
        </div>
    )
}

export default UpgradeNudge
