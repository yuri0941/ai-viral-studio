import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../common/DataTable'
import { KPICard } from '../common/KPICard'
import { formatCurrency, formatDate, getSparklineData } from '../../utils/helpers'
import { invoicesApi, yookassaApi } from '../../../../services/api.js'
import { useSmartData } from '../../../../hooks/useSmartData'
import { API_BASE_URL } from '../../../../config.js'
import {
    TrendingDown, TrendingUp, Wallet,
    Receipt, Plus, Loader2, ExternalLink, CreditCard
} from 'lucide-react'

const DEMO_TRANSACTIONS = [
    { date: '25.07.2026', source: 'Подписки Pro', amount: 5600, status: 'В обработке' },
    { date: '24.07.2026', source: 'Подписки Creator', amount: 2900, status: 'Успешно' },
    { date: '23.07.2026', source: 'Реклама', amount: -1200, status: 'Выполнено' },
    { date: '22.07.2026', source: 'Подписки Pro', amount: 5600, status: 'Успешно' },
    { date: '21.07.2026', source: 'Подписки Agency', amount: 14300, status: 'Успешно' },
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

export function FinanceTab({ data }) {
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
        { key: 'date', label: 'Дата', render: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDate(row.date)}</span> },
        { key: 'source', label: 'Источник', render: (row) => <span className="text-sm text-[var(--text)]">{row.source}</span> },
        { key: 'type', label: 'Тип', render: (row) => (
            <span className={`text-xs font-medium ${row.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.type === 'income' ? 'Доход' : 'Расход'}
            </span>
        )},
        { key: 'amount', label: 'Сумма', render: (row) => (
            <span className={`text-sm font-mono font-medium ${row.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
            </span>
        )},
        { key: 'status', label: 'Статус', render: (row) => {
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

    useEffect(() => {
        loadInvoices()
    }, [])

    async function loadInvoices() {
        setInvoiceLoading(true)
        try {
            const res = await invoicesApi.list({ limit: 50 })
            setInvoices(res.invoices || [])
        } catch (err) {
            console.error('[FinanceTab:loadInvoices]', err)
            pushToast('error', 'Не удалось загрузить счета')
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
            pushToast('error', 'Введите описание и сумму')
            return
        }
        try {
            await invoicesApi.create({
                description: newInvoice.description,
                amount,
                currency: newInvoice.currency,
                type: 'manual',
            })
            pushToast('success', 'Счёт создан')
            setNewInvoice({ description: '', amount: '', currency: 'RUB' })
            setShowNewInvoice(false)
            loadInvoices()
        } catch (err) {
            console.error('[FinanceTab:createInvoice]', err)
            pushToast('error', err.message || 'Ошибка создания счёта')
        }
    }

    async function handlePayInvoice(invoice) {
        if (invoice.status === 'paid') return
        setInvoicePaying(invoice._id)
        try {
            const res = await yookassaApi.payInvoice(invoice._id)
            if (res.paymentUrl) {
                pushToast('success', 'Перенаправляем на оплату…')
                window.location.href = res.paymentUrl
            } else {
                pushToast('error', 'Не удалось создать платёж')
            }
        } catch (err) {
            console.error('[FinanceTab:payInvoice]', err)
            pushToast('error', err.message || 'Ошибка оплаты')
        } finally {
            setInvoicePaying(null)
        }
    }

    const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((inv) =>
        invoiceStatusFilter === 'all' ? true : inv.status === invoiceStatusFilter
    )

    const safeFilteredInvoices = Array.isArray(filteredInvoices) ? filteredInvoices : []

    return (
        <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--text)]">Финансы</h2>
            </div>

            {isDemo && (
                <div className="bg-yellow-900/30 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-4">
                    📊 Пример данных — появятся после первой реальной транзакции
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard title="Доходы" value={stats.income} prefix="$" icon={TrendingUp} color="emerald" change={15.2} sparklineData={getSparklineData(stats.income, 7, 500)} />
                <KPICard title="Расходы" value={stats.expense} prefix="$" icon={TrendingDown} color="red" change={-4.3} sparklineData={getSparklineData(stats.expense, 7, 200)} />
                <KPICard title="Прибыль" value={stats.profit} prefix="$" icon={Wallet} color="blue" change={22.1} sparklineData={getSparklineData(stats.profit, 7, 300)} />
            </div>

            <DataTable data={normalizedTransactions} columns={columns} searchable exportable emptyText="Нет транзакций" />

            {/* Invoices Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-[#00ff41]" />
                        Счета и инвойсы
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={invoiceStatusFilter}
                            onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--text)]"
                        >
                            <option value="all">Все статусы</option>
                            <option value="draft">Черновики</option>
                            <option value="pending">Ожидают оплаты</option>
                            <option value="paid">Оплачены</option>
                            <option value="canceled">Отменены</option>
                        </select>
                        <button
                            onClick={() => setShowNewInvoice(!showNewInvoice)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00ff41] text-[#0a0a0f] text-sm font-medium hover:bg-[#00ff41]/90 transition-colors"
                        >
                            <Plus size={16} /> Новый счёт
                        </button>
                    </div>
                </div>

                {showNewInvoice && (
                    <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                        <input
                            value={newInvoice.description}
                            onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                            placeholder="Описание счёта"
                            className="md:col-span-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
                        />
                        <input
                            type="number"
                            min={1}
                            value={newInvoice.amount}
                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                            placeholder="Сумма"
                            className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
                        />
                        <select
                            value={newInvoice.currency}
                            onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm"
                        >
                            <option value="RUB">RUB</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                        <div className="md:col-span-4 flex justify-end">
                            <button type="submit" className="px-4 py-2 rounded-lg bg-[#00ff41] text-[#0a0a0f] text-sm font-medium hover:bg-[#00ff41]/90 transition-colors">
                                Создать счёт
                            </button>
                        </div>
                    </form>
                )}

                {invoiceLoading ? (
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка счетов…
                    </div>
                ) : safeFilteredInvoices.length === 0 ? (
                    <div className="text-sm text-[var(--text-muted)] p-4 border border-dashed border-[var(--border)] rounded-xl">
                        Нет счетов. Создайте первый счёт или оформите подписку.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">№</th>
                                    <th className="px-4 py-3 font-medium">Описание</th>
                                    <th className="px-4 py-3 font-medium">Сумма</th>
                                    <th className="px-4 py-3 font-medium">Статус</th>
                                    <th className="px-4 py-3 font-medium">Дата</th>
                                    <th className="px-4 py-3 font-medium">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {safeFilteredInvoices.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-[var(--card-hover)]">
                                        <td className="px-4 py-3 text-[var(--text)] font-mono">{inv.invoiceNumber || inv._id?.slice(-6)}</td>
                                        <td className="px-4 py-3 text-[var(--text)]">{inv.description || '—'}</td>
                                        <td className="px-4 py-3 text-[var(--text)] font-medium">
                                            {inv.amount?.toLocaleString('ru-RU')} {inv.currency}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${
                                                inv.status === 'paid'
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                    : inv.status === 'pending'
                                                    ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                                    : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                                            }`}>
                                                {inv.status === 'paid' ? 'Оплачен' : inv.status === 'pending' ? 'Ожидает' : inv.status === 'canceled' ? 'Отменён' : 'Черновик'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-muted)]">
                                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ru-RU') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {inv.status !== 'paid' && inv.status !== 'canceled' && (
                                                <button
                                                    onClick={() => handlePayInvoice(inv)}
                                                    disabled={invoicePaying === inv._id}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00ff41]/10 text-[#00ff41] text-xs font-medium hover:bg-[#00ff41]/20 transition-colors disabled:opacity-50"
                                                >
                                                    {invoicePaying === inv._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                                    Оплатить
                                                </button>
                                            )}
                                            {inv.paymentUrl && (
                                                <a
                                                    href={inv.paymentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="ml-2 inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[#00ff41]"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Ссылка
                                                </a>
                                            )}
                                        </td>
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
