import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Zap, Coins, TrendingDown } from 'lucide-react'
import { API_BASE_URL } from '../../../../config.js'

// [REAL-DATA З5.3] Реестр цен действий (✦) + себестоимость/маржа + аналитика расхода 7/30д.
// Всё из API: GET/POST /owner/action-prices, GET /owner/action-analytics. Без деплоя (hot-reload ≤60с).
export function ActionPricesCard() {
    const { t } = useTranslation()
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    const [items, setItems] = useState([])
    const [draft, setDraft] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [days, setDays] = useState(30)
    const [analytics, setAnalytics] = useState(null)

    const load = () => {
        setLoading(true)
        fetch(`${API_BASE_URL}/owner/action-prices`, { headers })
            .then(r => r.json())
            .then(json => {
                const list = json?.items || []
                setItems(list)
                setDraft(Object.fromEntries(list.map(i => [i.priceKey, i.priceCredits])))
            })
            .catch(() => setError(t('subscriptions.actionPrices.loadError', 'Не удалось загрузить реестр цен')))
            .finally(() => setLoading(false))
    }

    const loadAnalytics = (d) => {
        fetch(`${API_BASE_URL}/owner/action-analytics?days=${d}`, { headers })
            .then(r => r.json())
            .then(json => setAnalytics(json || null))
            .catch(() => setAnalytics(null))
    }

    useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { loadAnalytics(days) }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setSaving(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/owner/action-prices`, {
                method: 'POST',
                headers,
                body: JSON.stringify(draft),
            })
            const json = await res.json()
            if (!res.ok) {
                if (json?.code === 'below_cost') {
                    setError(t('subscriptions.actionPrices.belowCost', { min: json.minCredits, cost: json.costRub, defaultValue: `Минимум ${json.minCredits}✦ при текущей себестоимости (${json.costRub} ₽/действие) — маржа не ниже 70%` }))
                } else {
                    setError(json?.error || t('subscriptions.actionPrices.saveError', 'Ошибка сохранения'))
                }
                return
            }
            load()
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="luxury-card glass p-5"><div className="h-24 shimmer rounded-2xl" /></div>

    return (
        <div className="luxury-card glass p-5 space-y-4" data-testid="action-prices-card">
            <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-[var(--text-muted)]" />
                <h3 className="text-lg font-semibold text-[var(--text)]">{t('subscriptions.actionPrices.title', 'Цены действий (✦)')}</h3>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">{t('subscriptions.actionPrices.hint', 'Цена каждой функции в кредитах. Применяется сразу у всех ролей, без деплоя. 0 = бесплатно. Себестоимость — факт из логов AI за 30 дней.')}</p>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 text-xs">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(item => (
                    <div key={item.id} data-testid={`action-price-${item.id}`}>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">{item.labelRu}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={draft[item.priceKey] ?? item.priceCredits}
                                onChange={e => setDraft(prev => ({ ...prev, [item.priceKey]: parseInt(e.target.value, 10) || 0 }))}
                                className="w-24 px-3 py-2 rounded-lg glass text-sm text-[var(--text)] outline-none"
                                data-testid={`action-price-input-${item.id}`}
                            />
                            <span className="text-xs text-[var(--text-muted)]">✦</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                            {t('subscriptions.actionPrices.costLine', 'Себестоимость')}: {item.costRub} ₽{!item.costMeasured && ` (${t('subscriptions.actionPrices.estimated', 'оценка')})`}
                            {item.marginPercent !== null && ` · ${t('subscriptions.actionPrices.marginLine', 'маржа')}: `}
                            {item.marginPercent !== null && (
                                <span className={item.belowFloor ? 'text-red-400 font-medium' : 'text-emerald-400'}>{item.marginPercent}%</span>
                            )}
                        </p>
                    </div>
                ))}
            </div>
            <button type="button"
                onClick={save}
                disabled={saving}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                data-testid="action-prices-save"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {t('subscriptions.actionPrices.save', 'Сохранить цены')}
            </button>

            {/* Аналитика расхода 7/30 дней */}
            <div className="pt-4 border-t border-[var(--border)] space-y-3" data-testid="action-analytics">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-[var(--text-muted)]" />
                        {t('subscriptions.actionPrices.analyticsTitle', 'Расход по функциям')}
                    </h4>
                    <div className="flex gap-1">
                        {[7, 30].map(d => (
                            <button key={d} type="button" onClick={() => setDays(d)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${days === d ? 'bg-violet-600 text-white border-violet-500' : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)]'}`}>
                                {d} {t('subscriptions.actionPrices.days', 'дн')}
                            </button>
                        ))}
                    </div>
                </div>
                {!analytics || analytics.rows?.every(r => r.count === 0) ? (
                    <p className="text-xs text-[var(--text-muted)]">{t('subscriptions.actionPrices.emptyAnalytics', 'Списаний за период нет — таблица заполнится по факту использования.')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                                    <th className="text-left py-2 font-medium">{t('subscriptions.actionPrices.colAction', 'Функция')}</th>
                                    <th className="text-right py-2 font-medium">{t('subscriptions.actionPrices.colCount', 'Штук')}</th>
                                    <th className="text-right py-2 font-medium">{t('subscriptions.actionPrices.colCredits', 'Списано ✦')}</th>
                                    <th className="text-right py-2 font-medium">{t('subscriptions.actionPrices.colCost', 'Себестоимость ₽')}</th>
                                    <th className="text-right py-2 font-medium">{t('subscriptions.actionPrices.colMargin', 'Маржа ₽')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.rows.map(r => (
                                    <tr key={r.id} className={`border-b border-[var(--border)] last:border-0 ${r.lossMaking ? 'bg-red-500/5' : ''}`} data-testid={`action-analytics-${r.id}`}>
                                        <td className="py-2 text-[var(--text)]">{r.labelRu}</td>
                                        <td className="py-2 text-right text-[var(--text-muted)]">{r.count}</td>
                                        <td className="py-2 text-right text-[var(--text)]">{r.creditsSpent}</td>
                                        <td className="py-2 text-right text-[var(--text-muted)]">{r.costRub}</td>
                                        <td className={`py-2 text-right font-medium ${r.lossMaking ? 'text-red-400' : 'text-emerald-400'}`}>{r.marginRub}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ActionPricesCard
