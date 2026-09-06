// [HOTFIX-FINAL] Витрина пакетов кредитов (1 кредит = 1 генерация).
// Цены/размеры — только с бэкенда (CreditPack). Покупка → ЮKassa confirmationUrl.
// Сюда ведут все кнопки «Пополнить» (кольцо баланса, пилюля квоты, overflow-модалка).
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Coins, Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { creditsApi, request } from '../services/api'

export default function CreditsPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [packs, setPacks] = useState([])
    const [quota, setQuota] = useState(null)
    const [loading, setLoading] = useState(true)
    const [buying, setBuying] = useState(null)

    useEffect(() => {
        let alive = true
        Promise.all([
            creditsApi.packs().catch(() => null),
            request('/users/me/quota').catch(() => null),
        ]).then(([packsRes, quotaRes]) => {
            if (!alive) return
            setPacks(Array.isArray(packsRes?.packs) ? packsRes.packs : [])
            setQuota(quotaRes?.data || null)
            setLoading(false)
        })
        return () => { alive = false }
    }, [])

    const buy = async (pack) => {
        setBuying(pack.packId)
        try {
            const res = await creditsApi.purchase(pack.packId)
            if (res?.confirmationUrl) {
                window.location.href = res.confirmationUrl
                return
            }
            toast.error(t('credits.purchaseError'))
        } catch (err) {
            console.error('[CreditsPage] purchase failed:', err)
            toast.error(t('credits.purchaseError'))
        } finally {
            setBuying(null)
        }
    }

    const bestPackId = packs.length ? packs[packs.length - 1].packId : null
    const remaining = quota ? (quota.remaining ?? 0) + (quota.trialTokens ?? 0) : null

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-6 md:py-10">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label={t('common.back', 'Назад')}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Coins size={22} className="text-amber-400" />
                    <h1 className="text-xl md:text-2xl font-bold">{t('credits.title')}</h1>
                </div>

                {remaining !== null && (
                    <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-muted)]">
                        {t('credits.balanceLine')} <b className="text-[var(--text)]">{remaining}✦</b>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[var(--text-muted)]" /></div>
                ) : packs.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-muted)] text-center">
                        {t('credits.empty')}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {packs.map(pack => (
                            <div
                                key={pack.packId}
                                className={`relative p-5 rounded-2xl bg-[var(--bg-secondary)] border transition ${pack.packId === bestPackId ? 'border-amber-400/50' : 'border-[var(--border)]'}`}
                            >
                                {pack.packId === bestPackId && (
                                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[11px] text-amber-400 flex items-center gap-1">
                                        <Sparkles size={11} />
                                        {t('credits.bestValue')}
                                    </div>
                                )}
                                <div className="text-2xl font-bold">{pack.credits}✦</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">{t('credits.perCredit', { price: pack.perCredit })}</div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="text-xl font-bold text-emerald-400">{pack.priceRub}₽</span>
                                    <button
                                        onClick={() => buy(pack)}
                                        disabled={buying !== null}
                                        className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {buying === pack.packId ? <Loader2 size={16} className="animate-spin" /> : null}
                                        {t('credits.buy')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-xs text-[var(--text-muted)] text-center">{t('credits.hint')}</p>
            </div>
        </div>
    )
}
