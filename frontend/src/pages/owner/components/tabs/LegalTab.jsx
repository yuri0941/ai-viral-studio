import { useState } from 'react'
import { Building2, Save, FileText, Landmark, CreditCard, Globe, Bitcoin, Wallet } from 'lucide-react'

export function LegalTab({ data }) {
    const [form, setForm] = useState(data.company)
    const [activeSection, setActiveSection] = useState('company')
    const [withdrawType, setWithdrawType] = useState('legal')
    const [reqs, setReqs] = useState(data.withdrawRequisites)
    const [showPass, setShowPass] = useState(false)

    const handleSaveCompany = () => {
        data.setCompany(form)
        data.showToast('Реквизиты компании сохранены')
    }

    const handleSaveWithdraw = () => {
        data.setWithdrawRequisites(reqs)
        data.showToast('Реквизиты для вывода сохранены')
    }

    const sections = [
        { id: 'company', label: 'Компания', icon: Building2 },
        { id: 'withdraw', label: 'Вывод средств', icon: Wallet },
    ]

    const withdrawSections = [
        { id: 'legal', label: 'Юр. лицо', icon: Landmark },
        { id: 'ip', label: 'ИП', icon: FileText },
        { id: 'card', label: 'Карта', icon: CreditCard },
        { id: 'international', label: 'SWIFT/IBAN', icon: Globe },
        { id: 'crypto', label: 'Крипта', icon: Bitcoin },
        { id: 'paypal', label: 'PayPal', icon: Wallet },
    ]

    const renderWithdrawForm = () => {
        switch (withdrawType) {
            case 'legal':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['companyName', 'inn', 'kpp', 'rs', 'bik', 'bank'].map(field => (
                            <div key={field}>
                                <label className="block text-xs text-gray-400 mb-1 capitalize">{field}</label>
                                <input value={reqs.legal[field]} onChange={e => setReqs(p => ({ ...p, legal: { ...p.legal, [field]: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
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
                                <input value={reqs.ip[field]} onChange={e => setReqs(p => ({ ...p, ip: { ...p.ip, [field]: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
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
                                <input value={reqs.card[field]} onChange={e => setReqs(p => ({ ...p, card: { ...p.card, [field]: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
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
                                <input value={reqs.international[field]} onChange={e => setReqs(p => ({ ...p, international: { ...p.international, [field]: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
                            </div>
                        ))}
                    </div>
                )
            case 'crypto':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Адрес кошелька</label>
                            <input value={reqs.crypto.walletAddress} onChange={e => setReqs(p => ({ ...p, crypto: { ...p.crypto, walletAddress: e.target.value } }))}
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30 font-mono" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Сеть</label>
                                <select value={reqs.crypto.network} onChange={e => setReqs(p => ({ ...p, crypto: { ...p.crypto, network: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30">
                                    {['TRC20', 'ERC20', 'BEP20', 'SOL', 'BTC'].map(n => <option key={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Валюта</label>
                                <select value={reqs.crypto.currency} onChange={e => setReqs(p => ({ ...p, crypto: { ...p.crypto, currency: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30">
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
                        <input type="email" value={reqs.paypal.email} onChange={e => setReqs(p => ({ ...p, paypal: { ...p.paypal, email: e.target.value } }))}
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
                    </div>
                )
            default: return null
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                {sections.map(s => {
                    const Icon = s.icon
                    return (
                        <button type="button" key={s.id} onClick={() => setActiveSection(s.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === s.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-[var(--text)] hover:bg-white/5 border border-transparent'}`}>
                            <Icon size={16} /> {s.label}
                        </button>
                    )
                })}
            </div>

            {activeSection === 'company' && (
                <div className="max-w-2xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(form).map(([key, val]) => (
                            <div key={key}>
                                <label className="block text-xs text-gray-400 mb-1 capitalize">{key}</label>
                                <input value={val} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleSaveCompany} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                        <Save size={14} /> Сохранить реквизиты
                    </button>
                </div>
            )}

            {activeSection === 'withdraw' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {withdrawSections.map(s => {
                            const Icon = s.icon
                            return (
                                <button type="button" key={s.id} onClick={() => setWithdrawType(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${withdrawType === s.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-[var(--text)] hover:bg-white/5 border border-transparent'}`}>
                                    <Icon size={14} /> {s.label}
                                </button>
                            )
                        })}
                    </div>
                    <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                        {renderWithdrawForm()}
                        <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-3">
                            <button type="button" onClick={handleSaveWithdraw} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                                <Save size={14} /> Сохранить реквизиты
                            </button>
                            <button type="button" onClick={() => {
                                const blob = new Blob([JSON.stringify(reqs[withdrawType], null, 2)], { type: 'application/json' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `requisites_${withdrawType}.json`
                                a.click()
                                URL.revokeObjectURL(url)
                                data.showToast('Реквизиты скачаны')
                            }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-sm text-gray-300 hover:bg-white/10 transition-colors">
                                <FileText size={14} /> Скачать JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
