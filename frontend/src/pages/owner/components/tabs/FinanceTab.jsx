import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '../common/DataTable'
import { EmptyState } from '../../../../components/common/EmptyState.jsx' // [v6.0] added
import { formatCurrency, formatDate, getSparklineData } from '../../utils/helpers'
import { invoicesApi, yookassaApi, ownerExpensesApi } from '../../../../services/api.js'
import toast from 'react-hot-toast'
import { useSmartData } from '../../../../hooks/useSmartData'
import { API_BASE_URL } from '../../../../config.js'
import {
    TrendingDown, TrendingUp, Wallet,
    Receipt, Plus, Loader2, ExternalLink, CreditCard, Trash2
} from 'lucide-react'

// [PLANCONFIG-ADMIN] demo-данные приведены к реальным тарифам PlanConfig (Pro 990 / Agency 4990)
const DEMO_TRANSACTIONS = [
    { date: '25.07.2026', source: 'Подписки Pro', amount: 990, status: 'В обработке' },
    { date: '24.07.2026', source: 'Подписки Pro', amount: 990, status: 'Успешно' },
    { date: '23.07.2026', source: 'Реклама', amount: -1200, status: 'Выполнено' },
    { date: '22.07.2026', source: 'Подписки Agency', amount: 4990, status: 'Успешно' },
    { date: '21.07.2026', source: 'Подписки Agency', amount: 4990, status: 'Успешно' },
]

function normalizeTransaction(t) {
    const rawAmount = t.amount ?? 0
    const amount = Math.abs(rawAmount)
    const type = t.type || (rawAmount < 0 ? 'expense' : 'income')
    return { ...t, amount, type }
}

function isCompletedStatus(status) {
    return status === 'completed' || status === 'Успешно' || status === 'Выполнено'
}

function isPendingStatus(status) {
    return status === 'pending' || status === 'В обработке'
}

function ShimmerCard() {
    return (
        <div className="luxury-card p-5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl shimmer" />
                <div className="w-16 h-4 rounded shimmer" />
            </div>
            <div className="w-24 h-7 rounded shimmer" />
            <div className="w-3/4 h-3 rounded shimmer" />
        </div>
    )
}

export function FinanceTab({ data }) {
    const { t } = useTranslation()
    const { toasts, setToasts } = data
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const { data: transactions, isDemo } = useSmartData(`${API_BASE_URL}/finance/transactions`, DEMO_TRANSACTIONS, token)

    const normalizedTransactions = useMemo(() => {
        const list = Array.isArray(transactions) ? transactions : []
        return list.map(normalizeTransaction)
    }, [transactions])

    const stats = useMemo(() => {
        const income = normalizedTransactions.filter(p => p.type === 'income').reduce((a, b) => a + b.amount, 0)
        const expense = normalizedTransactions.filter(p => p.type === 'expense').reduce((a, b) => a + b.amount, 0)
        const profit = income - expense
        return { income, expense, profit }
    }, [normalizedTransactions])

    const columns = [
        { key: 'date', label: t('finance.date', 'Дата'), render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDate(row.date)}</span> },
        { key: 'source', label: t('finance.source', 'Источник'), render: (row) => <span className="text-sm text-[var(--text)]">{row.source}</span> },
        { key: 'type', label: t('finance.type', 'Тип'), render: (row) => (
            <span className={`text-xs font-medium ${row.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.type === 'income' ? t('finance.income', 'Доход') : t('finance.expense', 'Расход')}
            </span>
        )},
        { key: 'amount', label: t('finance.amount', 'Сумма'), render: (row) => (
            <span className={`text-sm font-mono font-medium ${row.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
            </span>
        )},
        { key: 'status', label: t('common.status', 'Статус'), render: (row) => {
            const completed = isCompletedStatus(row.status)
            const pending = isPendingStatus(row.status)
            return (
                <span className={`text-xs px-2 py-1 rounded-full border ${
                    completed
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : pending
                            ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                            : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                }`}>
                    {row.status || '—'}
                </span>
            )
        }},
    ]

    // Invoices
    const [invoices, setInvoices] = useState([])
    const [invoiceLoading, setInvoiceLoading] = useState(false)
    const [invoicePaying, setInvoicePaying] = useState(null)
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')
    const [showNewInvoice, setShowNewInvoice] = useState(false)
    const [newInvoice, setNewInvoice] = useState({ description: '', amount: '', currency: 'RUB' })
    const [creatingInvoice, setCreatingInvoice] = useState(false)

    useEffect(() => {
        loadInvoices()
    }, [])

    async function loadInvoices() {
        setInvoiceLoading(true)
        try {
            const res = await invoicesApi.list({ limit: 50 })
            setInvoices(res.invoices || [])
        } catch (e) {
            console.warn('[FinanceTab] Load failed:', e.message)
            setInvoices([]) // [v6.0] added: degrade gracefully to empty invoices
            pushToast('error', t('finance.loadError', 'Не удалось загрузить счета'))
        } finally {
            setInvoiceLoading(false)
        }
    }

    function pushToast(type, message) {
        const id = Date.now() + Math.random()
        setToasts((prev) => [...prev, { id, type, message }])
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
    }

    async function handleCreateInvoice(e) {
        e.preventDefault()
        const amount = parseFloat(newInvoice.amount)
        if (!newInvoice.description || amount <= 0) {
            pushToast('error', t('finance.invoiceValidation', 'Введите описание и сумму'))
            return
        }
        setCreatingInvoice(true)
        try {
            await invoicesApi.create({
                description: newInvoice.description,
                amount,
                currency: newInvoice.currency,
                type: 'manual',
            })
            pushToast('success', t('finance.invoiceCreated', 'Счёт создан'))
            setNewInvoice({ description: '', amount: '', currency: 'RUB' })
            setShowNewInvoice(false)
            loadInvoices()
        } catch (err) {
            console.error('[FinanceTab:createInvoice]', err)
            pushToast('error', err.message || t('finance.invoiceCreateError', 'Ошибка создания счёта'))
        } finally {
            setCreatingInvoice(false)
        }
    }

    async function handlePayInvoice(invoice) {
        if (invoice.status === 'paid') return
        setInvoicePaying(invoice._id)
        try {
            const res = await yookassaApi.payInvoice(invoice._id)
            if (res.paymentUrl) {
                pushToast('success', t('finance.redirecting', 'Перенаправляем на оплату…'))
                window.location.href = res.paymentUrl
            } else {
                pushToast('error', t('finance.paymentCreateError', 'Не удалось создать платёж'))
            }
        } catch (err) {
            console.error('[FinanceTab:payInvoice]', err)
            pushToast('error', err.message || t('finance.paymentError', 'Ошибка оплаты'))
        } finally {
            setInvoicePaying(null)
        }
    }

    const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((inv) =>
        invoiceStatusFilter === 'all' ? true : inv.status === invoiceStatusFilter
    )

    const safeFilteredInvoices = Array.isArray(filteredInvoices) ? filteredInvoices : []

    const statusOptions = [
        { key: 'all', label: t('finance.allStatuses', 'Все статусы') },
        { key: 'draft', label: t('finance.statusDraft', 'Черновики') },
        { key: 'pending', label: t('finance.statusPending', 'Ожидают оплаты') },
        { key: 'paid', label: t('finance.statusPaid', 'Оплачены') },
        { key: 'canceled', label: t('finance.statusCanceled', 'Отменены') },
    ]

    const metricMeta = [
        { key: 'income', label: t('finance.income', 'Доходы'), icon: TrendingUp, gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent', iconColor: 'text-emerald-400' },
        { key: 'expense', label: t('finance.expense', 'Расходы'), icon: TrendingDown, gradient: 'from-red-500/20 via-red-500/5 to-transparent', iconColor: 'text-red-400' },
        { key: 'profit', label: t('finance.profit', 'Прибыль'), icon: Wallet, gradient: 'from-[var(--primary)]/20 via-[var(--primary)]/5 to-transparent', iconColor: 'text-[var(--primary)]' },
    ]

    return (
        <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--text)]">{t('finance.title', 'Финансы')}</h2>
            </div>

            {isDemo && (
                <div className="bg-yellow-900/30 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-4">
                    📊 {t('finance.demoNotice', 'Пример данных — появятся после первой реальной транзакции')}
                </div>
            )}

            {/* [P16-FIX] added: gradient bg + glass overlay metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {metricMeta.map((m) => {
                    const Icon = m.icon
                    return (
                        <div key={m.key} className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                            <div className="relative glass rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[var(--text-muted)]">{m.label}</span>
                                    <div className={`w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center ${m.iconColor}`}>
                                        <Icon size={20} />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-[var(--text)] font-mono">
                                    {formatCurrency(stats[m.key])}
                                </div>
                                <div className="mt-1 text-xs text-[var(--text-muted)]">
                                    {m.key === 'income' && '+15.2%'}
                                    {m.key === 'expense' && '-4.3%'}
                                    {m.key === 'profit' && '+22.1%'}
                                    <span className="ml-1">{t('finance.vsLastPeriod', 'к прошлому периоду')}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* [P16-FIX] added: luxury-card table wrapper with sticky header */}
            <div className="luxury-card overflow-hidden p-1">
                <DataTable
                    data={normalizedTransactions}
                    columns={columns}
                    searchable
                    exportable
                    emptyText={t('finance.noTransactions', 'Нет транзакций')}
                    stickyHeader
                    wrapperClassName="border-0 rounded-xl bg-transparent"
                />
            </div>

            {/* Invoices Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-[var(--primary)]" />
                        {t('finance.invoices', 'Счета и инвойсы')}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={invoiceStatusFilter}
                            onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)]"
                        >
                            {statusOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <button type="button"
                            onClick={() => setShowNewInvoice(!showNewInvoice)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus size={16} /> {t('finance.newInvoice', 'Новый счёт')}
                        </button>
                    </div>
                </div>

                {showNewInvoice && (
                    <form onSubmit={handleCreateInvoice} className="luxury-card grid grid-cols-1 md:grid-cols-4 gap-3 p-4">
                        <input
                            value={newInvoice.description}
                            onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                            placeholder={t('finance.descriptionPlaceholder', 'Описание счёта')}
                            className="md:col-span-2 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm"
                        />
                        <input
                            type="number"
                            min={1}
                            value={newInvoice.amount}
                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                            placeholder={t('finance.amountPlaceholder', 'Сумма')}
                            className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm"
                        />
                        <select
                            value={newInvoice.currency}
                            onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
                            className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm"
                        >
                            <option value="RUB">RUB</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                        <div className="md:col-span-4 flex justify-end">
                            <button type="submit" disabled={creatingInvoice} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                                {t('finance.createInvoice', 'Создать счёт')}
                            </button>
                        </div>
                    </form>
                )}

                {invoiceLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => <ShimmerCard key={i} />)}
                    </div>
                ) : safeFilteredInvoices.length === 0 ? (
                    // [v6.0] added: graceful empty-state placeholder
                    <EmptyState
                        icon={Receipt}
                        title="Данные обновляются..."
                        description={t('finance.noInvoices', 'Нет счетов. Создайте первый счёт или оформите подписку.')}
                        actionLabel={t('finance.newInvoice', 'Новый счёт')}
                        onAction={() => setShowNewInvoice(true)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {safeFilteredInvoices.map((inv) => {
                            const isPaid = inv.status === 'paid'
                            const isCanceled = inv.status === 'canceled'
                            const isPending = inv.status === 'pending'
                            return (
                                <div key={inv._id} className={`luxury-card p-5 border-l-4 ${isPaid ? 'border-l-emerald-500' : isPending ? 'border-l-yellow-500' : isCanceled ? 'border-l-red-500' : 'border-l-gray-500'}`}>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <div className="text-xs text-[var(--text-muted)] font-mono mb-1">{inv.invoiceNumber || `#${inv._id?.slice(-6)}`}</div>
                                            <h4 className="text-sm font-semibold text-[var(--text)]">{inv.description || '—'}</h4>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full border ${
                                            isPaid
                                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                : isPending
                                                    ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                                    : isCanceled
                                                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                                        : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                                        }`}>
                                            {isPaid ? t('finance.statusPaid', 'Оплачен') : isPending ? t('finance.statusPending', 'Ожидает') : isCanceled ? t('finance.statusCanceled', 'Отменён') : t('finance.statusDraft', 'Черновик')}
                                        </span>
                                    </div>
                                    <div className="text-xl font-bold text-[var(--text)] font-mono mb-1">
                                        {inv.amount?.toLocaleString('ru-RU')} {inv.currency}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)] mb-4">
                                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ru-RU') : '—'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isPaid && !isCanceled && (
                                            <button type="button"
                                                onClick={() => handlePayInvoice(inv)}
                                                disabled={invoicePaying === inv._id}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                                            >
                                                {invoicePaying === inv._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                                {t('finance.pay', 'Оплатить')}
                                            </button>
                                        )}
                                        {inv.paymentUrl && (
                                            <a
                                                href={inv.paymentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)]"
                                            >
                                                <ExternalLink className="w-3 h-3" /> {t('finance.link', 'Ссылка')}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* [OWNER-OMEGA] Сбор расходов лайт: AI-вызовы (день/неделя/месяц) + инфраструктура */}
            <ExpensesCard />
        </div>
    )
}

// [OWNER-OMEGA] карточка расходов: AI по факту вызовов + инфраструктура (ручной ввод ₽/мес)
function ExpensesCard() {
    const { t } = useTranslation()
    const [summary, setSummary] = useState(null)
    const [range, setRange] = useState('month')
    const [service, setService] = useState('')
    const [amount, setAmount] = useState('')
    const [busy, setBusy] = useState(false)

    const load = () => {
        ownerExpensesApi.summary()
            .then(res => setSummary(res?.summary || null))
            .catch(() => setSummary(null))
    }
    useEffect(load, [])

    const addInfra = async () => {
        if (!service.trim() || busy) return
        setBusy(true)
        try {
            await ownerExpensesApi.upsertInfra({ service: service.trim(), amountRub: Number(amount) || 0 })
            toast.success(t('owner.expenses.saved'))
            setService('')
            setAmount('')
            load()
        } catch (e) {
            toast.error(e.message || t('owner.control.error'))
        } finally {
            setBusy(false)
        }
    }

    const removeInfra = async (name) => {
        if (busy) return
        setBusy(true)
        try {
            await ownerExpensesApi.removeInfra(name)
            load()
        } catch (e) {
            toast.error(e.message || t('owner.control.error'))
        } finally {
            setBusy(false)
        }
    }

    const ai = summary?.ai?.[range]
    const inp = 'px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-violet-500/30'

    return (
        <div className="space-y-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--text)]">{t('owner.expenses.title')}</h3>
                <div className="flex gap-1">
                    {['day', 'week', 'month'].map(r => (
                        <button key={r} type="button" onClick={() => setRange(r)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${range === r ? 'bg-violet-600 text-white border-violet-500' : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)]'}`}>
                            {t(`owner.expenses.range.${r}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* AI-расходы по факту вызовов */}
            {!summary && <div className="h-16 shimmer rounded-2xl" />}
            {summary && (
                <div>
                    <div className="text-xs text-[var(--text-muted)] mb-2">
                        {t('owner.expenses.aiTotal')}: <b className="text-[var(--text)]">${(ai?.costUsd ?? 0).toFixed(2)}</b> · {ai?.calls ?? 0} {t('owner.expenses.calls')}
                    </div>
                    {(ai?.byProvider || []).length > 0 && (
                        <div className="space-y-1">
                            {ai.byProvider.map(p => (
                                <div key={p.provider} className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                    <span>{p.provider}</span>
                                    <span>{p.calls} {t('owner.expenses.calls')} · ${p.costUsd.toFixed(4)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Инфраструктура — ручной ввод */}
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <div className="text-xs text-[var(--text-muted)]">
                    {t('owner.expenses.infraTitle')}: <b className="text-[var(--text)]">{(summary?.infraTotalRub ?? 0).toLocaleString('ru-RU')} ₽/мес</b>
                </div>
                {(summary?.infra || []).map(e => (
                    <div key={e.service} className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                        <span className="break-words">{e.service}</span>
                        <span className="flex items-center gap-2">
                            <b className="text-[var(--text)]">{Number(e.amountRub).toLocaleString('ru-RU')} ₽</b>
                            <button type="button" onClick={() => removeInfra(e.service)} aria-label={t('owner.expenses.remove')}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                <Trash2 size={12} />
                            </button>
                        </span>
                    </div>
                ))}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input value={service} onChange={e => setService(e.target.value)} placeholder={t('owner.expenses.servicePh')} className={`flex-1 min-w-0 ${inp}`} />
                    <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" placeholder={t('owner.expenses.amountPh')} className={`w-full sm:w-28 ${inp}`} />
                    <button type="button" onClick={addInfra} disabled={busy || !service.trim()}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2">
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {t('owner.expenses.add')}
                    </button>
                </div>
            </div>
        </div>
    )
}
