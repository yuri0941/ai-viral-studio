import { useState } from 'react'
import { ModalShell } from '../common/ModalShell'
import { Landmark, FileText, CreditCard, Globe, Bitcoin, Wallet, Save, Download, Eye, EyeOff } from 'lucide-react'

export function WithdrawModal({ isOpen, onClose, data }) {
    const { withdrawRequisites, setWithdrawRequisites, showPassword, setShowPassword, showToast } = data
    const [activeType, setActiveType] = useState('legal')
    const [amount, setAmount] = useState('')
    const [showWithdrawPass, setShowWithdrawPass] = useState(false)

    const types = [
        { id: 'legal', label: 'Юр. лицо', icon: Landmark },
        { id: 'ip', label: 'ИП', icon: FileText },
        { id: 'card', label: 'Карта', icon: CreditCard },
        { id: 'international', label: 'SWIFT/IBAN', icon: Globe },
        { id: 'crypto', label: 'Крипта', icon: Bitcoin },
        { id: 'paypal', label: 'PayPal', icon: Wallet },
    ]

    const handleSave = () => {
        setWithdrawRequisites(withdrawRequisites)
        showToast('Реквизиты сохранены')
    }

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(withdrawRequisites[activeType], null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `requisites_${activeType}.json`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Реквизиты скачаны')
    }

    const handleWithdraw = () => {
        if (!amount || parseFloat(amount) <= 0) {
            showToast('Введите сумму', 'error')
            return
        }
        showToast(`Заявка на вывод $${amount} создана`)
        setAmount('')
        onClose()
    }

    const updateField = (field, value) => {
        setWithdrawRequisites(prev => ({
            ...prev,
            [activeType]: { ...prev[activeType], [field]: value }
        }))
    }

    const renderFields = () => {
        const req = withdrawRequisites[activeType] || {}
        switch (activeType) {
            case 'legal':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['companyName', 'inn', 'kpp', 'rs', 'bik', 'bank'].map(field => (
                            <div key={field}>
                                <label className="block text-xs text-gray-400 mb-1 capitalize">{field}</label>
                                <input value={req[field] || ''} onChange={e => updateField(field, e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                            </div>
                        ))}
                    </div>
                )
            case 'ip':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['fullName', 'inn', 'ogrnip', 'rs', 'bik', 'bank'].map(field => (
                            <div key={field}>
                                <label className="block text-xs text-gray-400 mb-1 capitalize">{field}</label>
                                <input value={req[field] || ''} onChange={e => updateField(field, e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                            </div>
                        ))}
                    </div>
                )
            case 'card':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['cardNumber', 'cardHolder', 'bank'].map(field => (
                            <div key={field}>
                                <label className="block text-xs text-gray-400 mb-1 capitalize">{field}</label>
                                <input value={req[field] || ''} onChange={e => updateField(field, e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                            </div>
                        ))}
                    </div>
                )
            case 'international':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['iban', 'swift', 'bankName', 'bankAddress', 'country', 'beneficiaryName'].map(field => (
                            <div key={field}>
                                <label className="block text-xs text-gray-400 mb-1 capitalize">{field}</label>
                                <input value={req[field] || ''} onChange={e => updateField(field, e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                            </div>
                        ))}
                    </div>
                )
            case 'crypto':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Адрес кошелька</label>
                            <input value={req.walletAddress || ''} onChange={e => updateField('walletAddress', e.target.value)}
                                className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30 font-mono" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Сеть</label>
                                <select value={req.network || 'TRC20'} onChange={e => updateField('network', e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30">
                                    {['TRC20', 'ERC20', 'BEP20', 'SOL', 'BTC'].map(n => <option key={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Валюта</label>
                                <select value={req.currency || 'USDT'} onChange={e => updateField('currency', e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30">
                                    {['USDT', 'BTC', 'ETH'].map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )
            case 'paypal':
                return (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">PayPal Email</label>
                        <input type="email" value={req.email || ''} onChange={e => updateField('email', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
                    </div>
                )
            default: return null
        }
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Вывод средств" maxWidth="max-w-2xl">
            <div className="space-y-5">
                {/* Withdraw Amount */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <label className="block text-xs text-emerald-400 mb-2 font-medium">Сумма вывода ($)</label>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-xl text-lg text-white outline-none focus:border-emerald-500/30 font-mono"
                        />
                        <button
                            onClick={handleWithdraw}
                            className="px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
                        >
                            Вывести
                        </button>
                    </div>
                </div>

                {/* Type Selector */}
                <div>
                    <label className="block text-xs text-gray-400 mb-2">Тип реквизитов</label>
                    <div className="flex flex-wrap gap-2">
                        {types.map(t => {
                            const Icon = t.icon
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveType(t.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeType === t.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'}`}
                                >
                                    <Icon size={14} /> {t.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Fields */}
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    {renderFields()}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                        <Save size={14} /> Сохранить
                    </button>
                    <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                        <Download size={14} /> Скачать JSON
                    </button>
                </div>
            </div>
        </ModalShell>
    )
}
