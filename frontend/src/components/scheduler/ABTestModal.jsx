import { useEffect, useState } from 'react'
import { X, Beaker, Sparkles, Check, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../../config.js'

export function ABTestModal({ isOpen, onClose, postParams }) {
    const [aiRequired, setAiRequired] = useState(null)
    const [variants, setVariants] = useState([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(null)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        const token = localStorage.getItem('token')
        fetch(`${API_BASE_URL}/analytics/ab-test/ai-required`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(res => setAiRequired(res.data?.required || false))
    }, [isOpen])

    const generate = async () => {
        const token = localStorage.getItem('token')
        setLoading(true)
        setSelected(null)
        setSaved(false)
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/ab-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    postParams: postParams || { topic: 'вирусный контент' },
                    platform: 'instagram',
                }),
            })
            const json = await res.json()
            if (json.status === 'success') {
                setVariants(json.data?.variants || [])
            } else {
                toast.error(json.message || 'Ошибка генерации')
            }
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const selectVariant = async (variantId) => {
        setSelected(variantId)
    }

    if (!isOpen) return null

    if (aiRequired === null) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="w-full max-w-2xl bg-[#0f0f1a] border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-center py-12 text-gray-500">
                        <Loader2 className="animate-spin mr-2" size={20} /> Проверка AI...
                    </div>
                </div>
            </div>
        )
    }

    if (aiRequired) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Beaker size={18} className="text-purple-400" /> A/B тест</h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><X size={18} /></button>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                        <AlertCircle size={18} />
                        <div>A/B тесты требуют подключенного AI-провайдера (Groq или OpenRouter).</div>
                    </div>
                    <a href="/owner?tab=apiKeys" className="mt-4 block w-full text-center py-2.5 rounded-xl bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] text-sm font-medium transition-colors">
                        Перейти к API Keys
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl bg-[#0f0f1a] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Beaker size={18} className="text-purple-400" /> A/B тест</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><X size={18} /></button>
                </div>

                {variants.length === 0 ? (
                    <div className="text-center py-12">
                        <button
                            onClick={generate}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            {loading ? 'Генерация...' : 'Сгенерировать 2 варианта'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            {variants.map((v) => (
                                <div
                                    key={v.id}
                                    onClick={() => selectVariant(v.id)}
                                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                                        selected === v.id
                                            ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/40'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-white">{v.label}</span>
                                        {selected === v.id && <Check size={18} className="text-[#8B5CF6]" />}
                                    </div>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{v.text}</p>
                                    {v.provider && <div className="mt-3 text-[10px] text-gray-500">Provider: {v.provider}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 justify-end pt-2">
                            <button
                                onClick={generate}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={16} /> Регенерировать
                            </button>
                            <button
                                onClick={() => { setSaved(true); setTimeout(onClose, 600) }}
                                disabled={!selected}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <Check size={16} /> {saved ? 'Сохранено' : 'Выбрать вариант'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ABTestModal
