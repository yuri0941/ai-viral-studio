import { useState } from 'react'
import { Wand2, Download, RefreshCw, ImageIcon, Loader2, Copy, X, Check } from 'lucide-react'
import { omegaApi } from '../../services/api'

const SIZES = [
    { id: '1080x1080', label: 'Post 1080×1080' },
    { id: '1080x1920', label: 'Stories 1080×1920' },
    { id: '1920x1080', label: 'Cover 1920×1080' },
    { id: '1200x628', label: 'Banner 1200×628' },
]

const STYLES = [
    { id: 'realistic', label: 'Реалистичный' },
    { id: 'illustration', label: 'Иллюстрация' },
    { id: 'minimal', label: 'Минимализм' },
]

export function AICoverGenerator({ onUse, onClose }) {
    const [prompt, setPrompt] = useState('')
    const [style, setStyle] = useState('realistic')
    const [size, setSize] = useState('1080x1080')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [history, setHistory] = useState([])
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [imageError, setImageError] = useState(false)

    const generate = async () => {
        if (!prompt.trim()) return
        setLoading(true)
        setError('')
        try {
            const res = await omegaApi.generateCover({ prompt, style, size })
            if (res?.success && res.url) {
                setResult(res)
                setImageError(false)
                setHistory(prev => [res, ...prev].slice(0, 10))
            } else {
                setError('Не удалось сгенерировать обложку')
            }
        } catch (err) {
            setError(err.message || 'Ошибка генерации')
        } finally {
            setLoading(false)
        }
    }

    const copyUrl = () => {
        if (!result?.url) return
        navigator.clipboard.writeText(result.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a1a24] border border-white/10 shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2"><ImageIcon size={18} className="text-[#8B5CF6]" /> AI Обложка</h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"><X size={18} /></button>
                </div>

                {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

                <div className="space-y-3">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={3}
                        placeholder="Опишите обложку: например, 'Яркая обложка для ролика про AI-маркетинг, неоновые цвета, текст AI Viral'"
                        className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#8B5CF6]/30 resize-none"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Стиль</label>
                            <select
                                value={style}
                                onChange={e => setStyle(e.target.value)}
                                className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none"
                            >
                                {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Размер</label>
                            <select
                                value={size}
                                onChange={e => setSize(e.target.value)}
                                className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none"
                            >
                                {SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={generate}
                        disabled={loading || !prompt.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        {loading ? 'Генерация...' : 'Сгенерировать'}
                    </button>
                </div>

                {result && (
                    <div className="space-y-3">
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0f]">
                            {/* [VALUE-2026-08-04] added: image error placeholder */}
                            {imageError ? (
                                <div className="w-full h-48 flex flex-col items-center justify-center text-gray-400 text-sm text-center p-4">
                                    <ImageIcon size={40} className="mb-2 opacity-30" />
                                    Генерация заняла больше времени. Обновите страницу.
                                </div>
                            ) : (
                                <img
                                    src={result.url}
                                    alt="cover"
                                    className="w-full h-auto object-contain max-h-[400px]"
                                    onError={() => setImageError(true)}
                                />
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={copyUrl} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white transition-colors">
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {copied ? 'Скопировано' : 'Копировать URL'}
                            </button>
                            <a href={result.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white transition-colors">
                                <Download size={14} /> Открыть
                            </a>
                            {onUse && (
                                <button onClick={() => {
                                    // [VALUE-2026-08-04] added: persist cover URL to media queue
                                    try {
                                        const existing = JSON.parse(localStorage.getItem('mediaQueue') || '[]')
                                        const next = [{ type: 'image', url: result.url, createdAt: new Date().toISOString() }, ...existing].slice(0, 20)
                                        localStorage.setItem('mediaQueue', JSON.stringify(next))
                                    } catch {}
                                    onUse(result)
                                    onClose()
                                }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs transition-colors">
                                    Использовать в посте
                                </button>
                            )}
                            <button onClick={generate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white transition-colors">
                                <RefreshCw size={14} /> Регенерировать
                            </button>
                        </div>
                    </div>
                )}

                {history.length > 1 && (
                    <div>
                        <div className="text-xs text-gray-500 mb-2">История</div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {history.slice(1).map((h, i) => (
                                <button key={i} onClick={() => setResult(h)} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-[#8B5CF6]/30">
                                    <img src={h.url} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AICoverGenerator
