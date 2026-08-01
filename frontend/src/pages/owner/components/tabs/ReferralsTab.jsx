import { useEffect, useState } from 'react'
import { Share2, Users, DollarSign, Award, Copy, Check, AlertCircle, Loader2, TrendingUp } from 'lucide-react'
import { API_BASE_URL } from '../../../../config.js'

const TIERS = [
    { min: 0, label: 'Starter', reward: 'Начните приглашать' },
    { min: 1, label: 'Друг', reward: '$10 кредитов' },
    { min: 3, label: 'Популярный', reward: 'Agentic Mode 1 мес' },
    { min: 5, label: 'VIP', reward: 'Скидка 20% навсегда' },
    { min: 10, label: 'Affiliate Partner', reward: '40% комиссии' },
]

export function ReferralsTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [codeInput, setCodeInput] = useState('')
    const [applying, setApplying] = useState(false)

    useEffect(() => {
        loadReferrals()
    }, [])

    const loadReferrals = async () => {
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/referrals`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const json = await res.json()
            if (json.status === 'success') setData(json.data)
        } catch (err) {
            console.warn('[ReferralsTab] load failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const copyLink = () => {
        if (!data?.link) return
        navigator.clipboard.writeText(data.link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleApplyCode = async () => {
        if (!codeInput.trim()) return
        setApplying(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/referrals/apply`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeInput.trim() }),
            })
            const json = await res.json()
            if (json.status === 'success') {
                setCodeInput('')
                loadReferrals()
            } else {
                alert(json.message || 'Ошибка')
            }
        } catch (err) {
            alert(err.message)
        } finally {
            setApplying(false)
        }
    }

    if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>
    if (!data) return <div className="text-center py-12 text-gray-500">Нет данных</div>

    const nextTier = TIERS.find(t => t.min > data.count) || TIERS[TIERS.length - 1]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Share2 size={18} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Реферальная программа</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-blue-400" />
                        <span className="text-xs text-gray-500">Приведено</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{data.count}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-emerald-400" />
                        <span className="text-xs text-gray-500">Заработано</span>
                    </div>
                    <div className="text-2xl font-bold text-white">${data.earnings}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-amber-400" />
                        <span className="text-xs text-gray-500">Тир</span>
                    </div>
                    <div className="text-lg font-bold text-white">{data.tierLabel}</div>
                </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                <div className="text-sm font-medium text-white mb-3">Ваша реферальная ссылка</div>
                <div className="flex items-center gap-2">
                    <input
                        readOnly
                        value={data.link || ''}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none"
                    />
                    <button
                        onClick={copyLink}
                        className="px-3 py-2 rounded-xl bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] transition-colors"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                    До следующего тира «{nextTier.label}»: {data.referralsToNext} друга · Награда: {nextTier.reward}
                </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                <div className="text-sm font-medium text-white mb-3">Применить реферальный код</div>
                <div className="flex items-center gap-2">
                    <input
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value)}
                        placeholder="Введите код"
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none uppercase"
                    />
                    <button
                        onClick={handleApplyCode}
                        disabled={applying || !codeInput.trim()}
                        className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                        {applying ? <Loader2 size={16} className="animate-spin" /> : 'Применить'}
                    </button>
                </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                <div className="text-sm font-medium text-white mb-4">Таблица рефералов</div>
                {data.referredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        <AlertCircle size={24} className="mx-auto mb-2 text-gray-600" />
                        Пока никто не пришёл по вашей ссылке. Поделитесь ссылкой с друзьями!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-500 text-xs">
                                    <th className="text-left py-2">Имя</th>
                                    <th className="text-left py-2">Email</th>
                                    <th className="text-left py-2">Дата</th>
                                    <th className="text-left py-2">Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.referredUsers.map((r, i) => (
                                    <tr key={i} className="border-b border-white/5 text-gray-300">
                                        <td className="py-2">{r.name}</td>
                                        <td className="py-2">{r.email}</td>
                                        <td className="py-2">{r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '—'}</td>
                                        <td className="py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'оплатил' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {TIERS.map(t => (
                    <div key={t.min} className={`p-3 rounded-xl border text-center ${data.count >= t.min ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30' : 'bg-white/[0.02] border-white/5'}`}>
                        <div className="text-xs font-medium text-white">{t.label}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{t.min}+ · {t.reward}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ReferralsTab
