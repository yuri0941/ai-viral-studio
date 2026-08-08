import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api.js'
import {
    Landmark, FileText, Search, Scale, MessageSquare, Loader2,
    ChevronDown, ChevronUp, Download
} from 'lucide-react'

const STAGES = ['pre-seed', 'seed', 'series-a']
const DECK_SECTIONS = ['problem', 'solution', 'marketSize', 'businessModel', 'traction', 'team', 'financials', 'ask', 'useOfFunds']

export default function InvestmentPanel() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user } = useAuth()

    if (!['owner', 'admin'].includes(user?.role)) {
        navigate('/dashboard', { replace: true })
        return null
    }

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Pitch deck
    const [deckForm, setDeckForm] = useState({ projectName: '', description: '', metrics: '' })
    const [deck, setDeck] = useState(null)
    const [deckExpanded, setDeckExpanded] = useState({})

    // Investor match
    const [matchForm, setMatchForm] = useState({ projectName: '', niche: '', stage: 'pre-seed' })
    const [investors, setInvestors] = useState([])

    // SAFE
    const [safeForm, setSafeForm] = useState({ amount: 100000, valuationCap: 1000000, discount: 20 })
    const [safeNote, setSafeNote] = useState(null)

    // Negotiation
    const [negForm, setNegForm] = useState({ investorType: '', offerAmount: 100000 })
    const [script, setScript] = useState(null)
    const [scriptExpanded, setScriptExpanded] = useState({})

    const generateDeck = async () => {
        setLoading(true)
        setError('')
        try {
            let metrics = {}
            try { metrics = JSON.parse(deckForm.metrics || '{}') } catch {}
            const data = await request('/prediction/pitch-deck', {
                method: 'POST',
                body: JSON.stringify({ ...deckForm, metrics }),
            })
            setDeck(data)
        } catch (err) {
            setError(err.message || t('investment.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const findInvestors = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/investor-match', {
                method: 'POST',
                body: JSON.stringify(matchForm),
            })
            setInvestors(data.investors || [])
        } catch (err) {
            setError(err.message || t('investment.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const generateSafe = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/safe-note', {
                method: 'POST',
                body: JSON.stringify(safeForm),
            })
            setSafeNote(data)
        } catch (err) {
            setError(err.message || t('investment.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const generateScript = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await request('/prediction/negotiation-script', {
                method: 'POST',
                body: JSON.stringify(negForm),
            })
            setScript(data)
        } catch (err) {
            setError(err.message || t('investment.error', 'Ошибка'))
        } finally {
            setLoading(false)
        }
    }

    const downloadPDF = () => {
        window.print()
    }

    const toggleDeck = (key) => setDeckExpanded(prev => ({ ...prev, [key]: !prev[key] }))
    const toggleScript = (key) => setScriptExpanded(prev => ({ ...prev, [key]: !prev[key] }))

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Landmark className="w-7 h-7 text-violet-400" />
                    {t('investment.title', '💰 Investment Scout — Инвестиции и Переговоры')}
                </h1>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Pitch Deck */}
                    <div className="xl:col-span-2 glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-violet-400" />
                            {t('investment.pitchDeck', 'Pitch Deck')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                                value={deckForm.projectName}
                                onChange={(e) => setDeckForm(prev => ({ ...prev, projectName: e.target.value }))}
                                placeholder={t('investment.projectName', 'Название проекта')}
                                className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                            <input
                                value={deckForm.description}
                                onChange={(e) => setDeckForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('investment.description', 'Описание')}
                                className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                        </div>
                        <textarea
                            value={deckForm.metrics}
                            onChange={(e) => setDeckForm(prev => ({ ...prev, metrics: e.target.value }))}
                            placeholder={t('investment.metrics', 'Метрики (JSON)')}
                            rows={3}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={generateDeck}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('investment.generateDeck', 'Сгенерировать Pitch Deck')}
                            </button>
                            {deck && (
                                <button
                                    onClick={downloadPDF}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('investment.downloadPDF', 'Скачать PDF')}
                                </button>
                            )}
                        </div>

                        {deck && DECK_SECTIONS.map(key => {
                            const value = deck[key]
                            if (!value) return null
                            return (
                                <div key={key} className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden">
                                    <button
                                        onClick={() => toggleDeck(key)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5"
                                    >
                                        <span className="text-white font-medium text-sm">{t(`investment.${key}`, key)}</span>
                                        {deckExpanded[key] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </button>
                                    {deckExpanded[key] && (
                                        <div className="px-4 pb-3 text-sm text-gray-300 whitespace-pre-wrap">
                                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* SAFE + Negotiation */}
                    <div className="space-y-6">
                        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Scale className="w-5 h-5 text-violet-400" />
                                {t('investment.safeNote', 'SAFE Note')}
                            </h2>
                            <div className="space-y-2">
                                <input
                                    type="number"
                                    value={safeForm.amount}
                                    onChange={(e) => setSafeForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    placeholder={t('investment.amount', 'Сумма')}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                                />
                                <input
                                    type="number"
                                    value={safeForm.valuationCap}
                                    onChange={(e) => setSafeForm(prev => ({ ...prev, valuationCap: Number(e.target.value) }))}
                                    placeholder={t('investment.valuationCap', 'Valuation Cap')}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                                />
                                <input
                                    type="number"
                                    value={safeForm.discount}
                                    onChange={(e) => setSafeForm(prev => ({ ...prev, discount: Number(e.target.value) }))}
                                    placeholder={t('investment.discount', 'Дисконт %')}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <button
                                onClick={generateSafe}
                                disabled={loading}
                                className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
                            >
                                {t('investment.generateSAFE', 'Сгенерировать SAFE')}
                            </button>
                            {safeNote && (
                                <div className="bg-slate-900/50 rounded-xl p-3 text-sm text-gray-300 max-h-64 overflow-y-auto">
                                    {safeNote.title && <h3 className="text-white font-medium mb-2">{safeNote.title}</h3>}
                                    {safeNote.sections?.map((s, i) => (
                                        <div key={i} className="mb-2">
                                            <p className="text-violet-400 font-medium">{s.heading}</p>
                                            <p>{s.content}</p>
                                        </div>
                                    ))}
                                    {!safeNote.sections && <pre className="whitespace-pre-wrap">{JSON.stringify(safeNote, null, 2)}</pre>}
                                </div>
                            )}
                        </div>

                        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-violet-400" />
                                {t('investment.negotiationScript', 'Скрипт переговоров')}
                            </h2>
                            <input
                                value={negForm.investorType}
                                onChange={(e) => setNegForm(prev => ({ ...prev, investorType: e.target.value }))}
                                placeholder={t('investment.investorTypeLabel', 'Тип инвестора')}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                            <input
                                type="number"
                                value={negForm.offerAmount}
                                onChange={(e) => setNegForm(prev => ({ ...prev, offerAmount: Number(e.target.value) }))}
                                placeholder={t('investment.offerAmount', 'Предлагаемая сумма')}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                            <button
                                onClick={generateScript}
                                disabled={loading}
                                className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
                            >
                                {t('investment.generateScript', 'Сгенерировать скрипт')}
                            </button>
                            {script && (
                                <div className="bg-slate-900/50 rounded-xl p-3 text-sm text-gray-300 space-y-2 max-h-64 overflow-y-auto">
                                    {['opening', 'closing', 'followUp'].map(key => script[key] && (
                                        <div key={key}>
                                            <p className="text-violet-400 font-medium">{t(`investment.${key}`, key)}</p>
                                            <p>{typeof script[key] === 'string' ? script[key] : JSON.stringify(script[key])}</p>
                                        </div>
                                    ))}
                                    {script.keyPoints?.length > 0 && (
                                        <div>
                                            <p className="text-violet-400 font-medium">{t('investment.keyPoints', 'Ключевые моменты')}</p>
                                            <ul className="list-disc list-inside">{script.keyPoints.map((p, i) => <li key={i}>{p.point}</li>)}</ul>
                                        </div>
                                    )}
                                    {script.objections?.length > 0 && (
                                        <div>
                                            <p className="text-violet-400 font-medium">{t('investment.objections', 'Возражения')}</p>
                                            <ul className="list-disc list-inside">{script.objections.map((o, i) => <li key={i}>{o.objection} → {o.rebuttal}</li>)}</ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Investor Match */}
                <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Search className="w-5 h-5 text-violet-400" />
                        {t('investment.findInvestors', 'Поиск инвесторов')}
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            value={matchForm.projectName}
                            onChange={(e) => setMatchForm(prev => ({ ...prev, projectName: e.target.value }))}
                            placeholder={t('investment.projectName', 'Название проекта')}
                            className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                        />
                        <input
                            value={matchForm.niche}
                            onChange={(e) => setMatchForm(prev => ({ ...prev, niche: e.target.value }))}
                            placeholder={t('investment.niche', 'Ниша')}
                            className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                        />
                        <select
                            value={matchForm.stage}
                            onChange={(e) => setMatchForm(prev => ({ ...prev, stage: e.target.value }))}
                            className="bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                        >
                            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                            onClick={findInvestors}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium"
                        >
                            {t('investment.findInvestors', 'Найти инвесторов')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">{t('investment.investorType', 'Тип')}</th>
                                    <th className="px-4 py-3">{t('investment.focus', 'Фокус')}</th>
                                    <th className="px-4 py-3">{t('investment.checkSize', 'Чек')}</th>
                                    <th className="px-4 py-3">{t('investment.valueAdd', 'Value-add')}</th>
                                    <th className="px-4 py-3 rounded-r-lg">{t('investment.contactStrategy', 'Стратегия контакта')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investors.map((inv, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-4 py-3 text-white font-medium">{inv.type}</td>
                                        <td className="px-4 py-3 text-gray-300">{inv.focus}</td>
                                        <td className="px-4 py-3 text-gray-300">{inv.checkSize}</td>
                                        <td className="px-4 py-3 text-gray-300">{inv.valueAdd}</td>
                                        <td className="px-4 py-3 text-gray-300 text-xs">{inv.contactStrategy}</td>
                                    </tr>
                                ))}
                                {investors.length === 0 && (
                                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">{loading ? '...' : t('investment.noData', 'Нет данных')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
