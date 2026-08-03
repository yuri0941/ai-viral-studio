import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, ImageIcon, Loader2, Search } from 'lucide-react'
import { omegaApi } from '../../services/api.js'

// [P17] added

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export function VisionUploader({ onClose }) {
    const { t } = useTranslation()
    const [imageUrl, setImageUrl] = useState('')
    const [preview, setPreview] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const onDrop = useCallback(async (e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        handleFile(file)
    }, [])

    const onFileChange = useCallback((e) => {
        const file = e.target.files[0]
        handleFile(file)
    }, [])

    const handleFile = async (file) => {
        if (!file) return
        const url = URL.createObjectURL(file)
        setPreview(url)
        setImageUrl('')
        setResult(null)
        setError('')
        try {
            const base64 = await fileToBase64(file)
            setImageUrl(base64)
        } catch (err) {
            setError(t('vision.readError') || 'Could not read image')
        }
    }

    const analyze = async () => {
        if (!imageUrl) return
        setLoading(true)
        setError('')
        try {
            const json = await omegaApi.visionAnalyze(imageUrl)
            setResult(json.data || json)
        } catch (err) {
            setError(err.message || t('vision.error') || 'Analysis failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                        <ImageIcon size={20} className="text-[var(--primary)]" />
                        {t('vision.title') || 'Vision Analysis'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface)]">
                        <X size={18} />
                    </button>
                </div>

                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center hover:border-[var(--primary)]/30 transition-colors"
                >
                    <Upload size={32} className="mx-auto text-[var(--primary)] mb-3" />
                    <p className="text-sm text-[var(--text-muted)]">{t('vision.dragDrop') || 'Drag & drop image or click to browse'}</p>
                    <input type="file" accept="image/*" onChange={onFileChange} className="hidden" id="vision-upload" />
                    <label htmlFor="vision-upload" className="inline-block mt-3 px-4 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-sm cursor-pointer hover:bg-[var(--primary)]/20">
                        {t('vision.browse') || 'Browse'}
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        value={imageUrl}
                        onChange={(e) => { setImageUrl(e.target.value); setPreview(e.target.value); setResult(null); setError('') }}
                        placeholder={t('vision.urlPlaceholder') || 'Or paste image URL'}
                        className="flex-1 glass rounded-xl px-4 py-2 text-sm text-[var(--text)] bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                    />
                    <button
                        onClick={analyze}
                        disabled={loading || !imageUrl}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        {t('vision.analyze') || 'Analyze'}
                    </button>
                </div>

                {error && <div className="text-sm text-[var(--danger)]">{error}</div>}

                {preview && (
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <img src={preview} alt="preview" className="max-h-64 w-full object-contain bg-black/5" />
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                            <h4 className="text-sm font-semibold text-[var(--text)] mb-2">{t('vision.description') || 'Description / OCR'}</h4>
                            <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{result.text}</p>
                        </div>

                        {Array.isArray(result.colors) && result.colors.length > 0 && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                <h4 className="text-sm font-semibold text-[var(--text)] mb-2">{t('vision.colors') || 'Color Palette'}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.colors.map((c, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-xs">
                                            <span className="w-6 h-6 rounded-full border border-[var(--border)]" style={{ background: c }} />
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.composition && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                <h4 className="text-sm font-semibold text-[var(--text)] mb-2">{t('vision.composition') || 'Composition'}</h4>
                                <div className="text-sm text-[var(--text-muted)]">
                                    {result.composition.width && <span>{result.composition.width}×{result.composition.height}</span>}
                                    {result.composition.aspectRatio && <span className="ml-3">{result.composition.aspectRatio}</span>}
                                </div>
                            </div>
                        )}

                        {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                <h4 className="text-sm font-semibold text-[var(--text)] mb-2">{t('vision.recommendations') || 'Recommendations'}</h4>
                                <ul className="list-disc list-inside text-sm text-[var(--text-muted)] space-y-1">
                                    {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default VisionUploader
