import { useEffect, useState } from 'react'
import {
    Store, Loader2, Download, Send, AlertCircle, CheckCircle, Package,
    BookOpen, ClipboardList, GraduationCap, TrendingUp, Megaphone, X
} from 'lucide-react'
import { franchiseApi } from '../../../../services/api.js'

const NICHES = ['Кофе', 'Бьюти', 'Авто', 'IT', 'Финансы', 'Недвижимость', 'Здоровье', 'Другое']
const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Краснодар', 'Дубай', 'Белград', 'Алматы', 'Тбилиси']

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-[var(--text)]"><X className="w-5 h-5" /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

export function FranchiseTab({ data }) {
    const user = data?.user || {}
    const plan = (user.subscriptionPlan || '').toLowerCase()
    const allowed = user.role === 'owner' || plan === 'agency' || plan === 'enterprise'

    const [form, setForm] = useState({ brandName: '', niche: '', cities: [], investment: 50000 })
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [ready, setReady] = useState(null)
    const [result, setResult] = useState(null)
    const [kits, setKits] = useState([])
    const [selectedKit, setSelectedKit] = useState(null)
    const [recipients, setRecipients] = useState('')
    const [sendResult, setSendResult] = useState('')

    useEffect(() => {
        checkReady()
        loadKits()
    }, [])

    const checkReady = async () => {
        try {
            const res = await franchiseApi.ready()
            setReady(res.data)
        } catch (err) {
            setReady({ ready: false, missing: ['Не удалось проверить требования'] })
        } finally {
            setChecking(false)
        }
    }

    const loadKits = async () => {
        try {
            const res = await franchiseApi.list()
            setKits(res.data || [])
        } catch (err) {
            console.error(err)
        }
    }

    const generate = async (e) => {
        e.preventDefault()
        if (!form.brandName || !form.niche) return
        setLoading(true)
        setResult(null)
        try {
            const res = await franchiseApi.generate({
                brandName: form.brandName,
                niche: form.niche,
                city: form.cities.join(', '),
                investment: form.investment,
            })
            setResult(res.data)
            loadKits()
        } catch (err) {
            alert(err.message || 'Ошибка генерации')
        } finally {
            setLoading(false)
        }
    }

    const sendKit = async () => {
        if (!selectedKit || !recipients.trim()) return
        setLoading(true)
        try {
            const list = recipients.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
            const res = await franchiseApi.send(selectedKit._id, list)
            setSendResult(`Отправлено ${res.data?.recipients || 0} кандидатам`)
            setRecipients('')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!allowed) {
        return (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[var(--text)] mb-2">Франшиза доступна только на Agency</h2>
                <p className="text-sm text-gray-400">Перейдите на тариф Agency, чтобы генерировать франшизные пакеты.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
                    <Store className="w-6 h-6 text-[#00ff41]" />
                    Франшиза
                </h2>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Генерация франшизного пакета</h3>
                {checking ? (
                    <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Проверка требований...</p>
                ) : !ready?.ready ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <p className="text-sm text-yellow-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Не выполнены требования:</p>
                        <ul className="mt-2 text-sm text-gray-300 list-disc list-inside">
                            {(ready?.missing || []).map(m => <li key={m}>{m}</li>)}
                        </ul>
                    </div>
                ) : (
                    <form onSubmit={generate} className="space-y-4">
                        <input
                            type="text"
                            value={form.brandName}
                            onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                            placeholder="Название бренда"
                            className="w-full bg-black/30 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm"
                            required
                        />
                        <select
                            value={form.niche}
                            onChange={(e) => setForm({ ...form, niche: e.target.value })}
                            className="w-full bg-black/30 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm"
                            required
                        >
                            <option value="">Выберите нишу</option>
                            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Города</p>
                            <div className="flex flex-wrap gap-2">
                                {CITIES.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm(prev => ({
                                            ...prev,
                                            cities: prev.cities.includes(c) ? prev.cities.filter(x => x !== c) : [...prev.cities, c]
                                        }))}
                                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                            form.cities.includes(c)
                                                ? 'bg-[#00ff41]/20 border-[#00ff41] text-[#00ff41]'
                                                : 'bg-white/5 border-[var(--border)] text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400">Инвестиции: ${form.investment.toLocaleString()}</label>
                            <input
                                type="range"
                                min="10000"
                                max="500000"
                                step="10000"
                                value={form.investment}
                                onChange={(e) => setForm({ ...form, investment: Number(e.target.value) })}
                                className="w-full mt-2 accent-[#00ff41]"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00d936] disabled:opacity-50 rounded-xl text-black font-medium text-sm transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                            Сгенерировать франшизу
                        </button>
                    </form>
                )}
            </div>

            {result?.status === 'ready' && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-[#00ff41]" />
                        <h3 className="text-lg font-semibold text-[var(--text)]">Франшизный пакет готов: {result.brandName}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <Card icon={BookOpen} title="Брендбук" color="text-[#8b5cf6]" />
                        <Card icon={ClipboardList} title="SOP" color="text-blue-400" />
                        <Card icon={GraduationCap} title="Обучение" color="text-[#f0883e]" />
                        <Card icon={TrendingUp} title="Фин. модель" color="text-[#00ff41]" />
                        <Card icon={Megaphone} title="Маркетинг" color="text-pink-400" />
                        <Card icon={Package} title="Landing HTML" color="text-cyan-400" />
                    </div>
                    <a
                        href={franchiseApi.download(result.kitId)}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--border)] rounded-xl text-[var(--text)] text-sm transition-colors"
                    >
                        <Download className="w-4 h-4" /> Скачать ZIP (JSON)
                    </a>
                </div>
            )}

            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">История генераций</h3>
                {kits.length === 0 ? (
                    <p className="text-sm text-gray-400">Пока нет сгенерированных пакетов.</p>
                ) : (
                    <div className="space-y-2">
                        {kits.map(kit => (
                            <div key={kit._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-[var(--border)]">
                                <div>
                                    <p className="text-[var(--text)] font-medium text-sm">{kit.brandName}</p>
                                    <p className="text-xs text-gray-400">{kit.niche} — {kit.city}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a href={franchiseApi.download(kit._id)} download className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400" title="Скачать">
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <button onClick={() => setSelectedKit(kit)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#00ff41]" title="Разослать">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedKit && (
                <Modal title={`Разослать: ${selectedKit.brandName}`} onClose={() => { setSelectedKit(null); setSendResult('') }}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Введите email кандидатов через запятую или с новой строки:</p>
                        <textarea
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            rows={5}
                            placeholder="partner1@mail.com, partner2@mail.com"
                            className="w-full bg-black/30 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm"
                        />
                        <button
                            onClick={sendKit}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00d936] disabled:opacity-50 rounded-xl text-black font-medium text-sm transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Разослать кандидатам
                        </button>
                        {sendResult && <p className="text-sm text-[#00ff41]">{sendResult}</p>}
                    </div>
                </Modal>
            )}
        </div>
    )
}

function Card({ icon: Icon, title, color }) {
    return (
        <div className="p-4 bg-white/5 rounded-xl border border-[var(--border)] flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-sm text-[var(--text)] font-medium">{title}</span>
        </div>
    )
}

export default FranchiseTab
