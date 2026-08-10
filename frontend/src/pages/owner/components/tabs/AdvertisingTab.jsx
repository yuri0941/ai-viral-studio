import { useEffect, useState } from 'react'
import { DataTable } from '../common/DataTable'
import { StatusBadge } from '../common/StatusBadge'
import { formatCurrency } from '../../utils/helpers'
import { Megaphone, Plus, MessageSquare, CheckCircle, XCircle, Pause, Play, Banknote, Save } from 'lucide-react'
import { ownerApi } from '../../../../services/api'

const PRICING_LABELS = {
    cpm: { label: 'CPM', hint: '₽ за 1000 показов' },
    cpc: { label: 'CPC', hint: '₽ за клик' },
    cpa: { label: 'CPA', hint: '₽ за действие' },
    fixedMonth: { label: 'Фикс', hint: '₽ за месяц размещения' },
}

export function AdvertisingTab({ data }) {
    const { campaigns, updateCampaignStatus, addNegotiation, setModal } = data
    const [activeChat, setActiveChat] = useState(null)
    const [chatText, setChatText] = useState('')
    const [pricing, setPricing] = useState({ cpm: 0, cpc: 0, cpa: 0, fixedMonth: 0, currency: 'RUB' })
    const [pricingLoading, setPricingLoading] = useState(false)
    const [pricingSaved, setPricingSaved] = useState(false)

    useEffect(() => {
        ownerApi.adPricing().then(res => {
            const p = res?.data?.data || res?.data || {}
            setPricing(prev => ({ ...prev, ...p }))
        }).catch(err => console.warn('[AdvertisingTab] pricing load failed:', err.message))
    }, [])

    const handlePricingChange = (key, value) => {
        const num = Number(value.replace(/[^0-9.]/g, ''))
        setPricing(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }))
        setPricingSaved(false)
    }

    const savePricing = async () => {
        setPricingLoading(true)
        try {
            await ownerApi.saveAdPricing({
                cpm: Number(pricing.cpm) || 0,
                cpc: Number(pricing.cpc) || 0,
                cpa: Number(pricing.cpa) || 0,
                fixedMonth: Number(pricing.fixedMonth) || 0,
                currency: pricing.currency || 'RUB',
            })
            setPricingSaved(true)
            setTimeout(() => setPricingSaved(false), 2000)
        } catch (err) {
            console.error('[AdvertisingTab] save pricing failed:', err)
        } finally {
            setPricingLoading(false)
        }
    }

    const columns = [
        { key: 'name', label: 'Кампания', render: (row) => (
            <div>
                <div className="text-sm font-medium text-[var(--text)]">{row.name}</div>
                <div className="text-xs text-gray-500">{row.client}</div>
            </div>
        )},
        { key: 'platform', label: 'Площадка', render: (row) => <span className="text-xs text-gray-400">{row.platform}</span> },
        { key: 'budget', label: 'Бюджет', render: (row) => <span className="text-sm font-mono text-[var(--text)]">{formatCurrency(row.budget)}</span> },
        { key: 'spent', label: 'Потрачено', render: (row) => <span className="text-sm font-mono text-gray-400">{formatCurrency(row.spent)}</span> },
        { key: 'status', label: 'Статус', render: (row) => <StatusBadge status={row.status} /> },
        { key: 'roi', label: 'ROI', render: (row) => <span className={`text-sm font-mono ${row.roi > 100 ? 'text-emerald-400' : 'text-gray-400'}`}>{row.roi}%</span> },
        {
            key: 'actions',
            label: 'Действия',
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setActiveChat(row)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors" title="Переговоры">
                        <MessageSquare size={14} />
                    </button>
                    {row.status === 'pending_review' && (
                        <>
                            <button type="button" onClick={() => updateCampaignStatus(row.id, 'active')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors" title="Утвердить">
                                <CheckCircle size={14} />
                            </button>
                            <button type="button" onClick={() => updateCampaignStatus(row.id, 'cancelled')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors" title="Отклонить">
                                <XCircle size={14} />
                            </button>
                        </>
                    )}
                    {row.status === 'active' && (
                        <button type="button" onClick={() => updateCampaignStatus(row.id, 'paused')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition-colors" title="Пауза">
                            <Pause size={14} />
                        </button>
                    )}
                    {row.status === 'paused' && (
                        <button type="button" onClick={() => updateCampaignStatus(row.id, 'active')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors" title="Возобновить">
                            <Play size={14} />
                        </button>
                    )}
                </div>
            )
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Megaphone size={18} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Рекламные кампании</h2>
                </div>
                <button type="button" onClick={() => setModal({ type: 'createCampaign' })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-sm text-purple-400 font-medium hover:bg-purple-500/30 transition-colors">
                    <Plus size={16} /> Новая кампания
                </button>
            </div>

            {/* Ad Pricing Panel */}
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-4">
                <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-[var(--text)]">Цены рекламы</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(PRICING_LABELS).map(([key, meta]) => (
                        <div key={key} className="space-y-1.5">
                            <label className="text-xs text-gray-500">{meta.label} <span className="text-gray-600">({meta.hint})</span></label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    value={pricing[key] || ''}
                                    onChange={e => handlePricingChange(key, e.target.value)}
                                    className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-emerald-500/30"
                                />
                                <span className="text-xs text-gray-500">{pricing.currency === 'USD' ? '$' : pricing.currency === 'EUR' ? '€' : '₽'}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <button type="button"
                        onClick={savePricing}
                        disabled={pricingLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                        <Save size={14} /> {pricingLoading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    {pricingSaved && <span className="text-xs text-emerald-400">Сохранено</span>}
                </div>
            </div>

            <DataTable data={campaigns} columns={columns} searchable emptyText="Нет кампаний" />

            {/* Negotiations Chat Drawer */}
            {activeChat && (
                <div className="fixed inset-y-0 right-0 w-96 max-w-[100vw] bg-[var(--bg-secondary)] border-l border-[var(--border)] z-50 shadow-2xl flex flex-col">
                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-[var(--text)]">{activeChat.name}</div>
                            <div className="text-xs text-gray-500">{activeChat.client}</div>
                        </div>
                        <button type="button" onClick={() => setActiveChat(null)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                            <XCircle size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeChat.negotiations?.length === 0 && (
                            <div className="text-center text-gray-500 text-sm py-8">Начните переговоры...</div>
                        )}
                        {activeChat.negotiations?.map(msg => (
                            <div key={msg.id} className={`flex ${msg.from === 'owner' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.from === 'owner' ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/20' : 'bg-white/5 text-gray-300 border border-[var(--border)]'}`}>
                                    {msg.message}
                                    <div className="text-[10px] text-gray-500 mt-1">{new Date(msg.time).toLocaleTimeString('ru-RU')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-[var(--border)]">
                        <div className="flex gap-2">
                            <input
                                value={chatText}
                                onChange={e => setChatText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && chatText.trim()) { addNegotiation(activeChat.id, chatText); setChatText('') } }}
                                placeholder="Сообщение..."
                                className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-emerald-500/30"
                            />
                            <button type="button"
                                onClick={() => { if (chatText.trim()) { addNegotiation(activeChat.id, chatText); setChatText('') } }}
                                className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            >
                                <MessageSquare size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdvertisingTab
