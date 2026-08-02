import { useState } from 'react'
import { Type, Image, Square, Wand2, Download, Smartphone, Monitor, Tablet } from 'lucide-react'

const PRESETS = [
    { id: 'instagram', label: 'Instagram 1:1', ratio: '1/1' },
    { id: 'stories', label: 'Stories 9:16', ratio: '9/16' },
    { id: 'tiktok', label: 'TikTok 9:16', ratio: '9/16' },
    { id: 'youtube', label: 'YouTube 16:9', ratio: '16/9' },
    { id: 'telegram', label: 'Telegram 1:1', ratio: '1/1' },
]

export function AdStudioTab() {
    const [activeTool, setActiveTool] = useState('text')
    const [prompt, setPrompt] = useState('')
    const [generatedImage, setGeneratedImage] = useState('')
    const [generating, setGenerating] = useState(false)
    const [headline, setHeadline] = useState('')
    const [cta, setCta] = useState('')
    const [preview, setPreview] = useState('instagram')

    async function handleGenerateImage() {
        if (!prompt.trim()) return
        setGenerating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/omega/generate-cover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ prompt }),
            })
            const json = await res.json()
            if (json.success) setGeneratedImage(json.url)
        } catch (e) {
            console.error(e)
        } finally {
            setGenerating(false)
        }
    }

    async function handleGenerateText() {
        if (!prompt.trim()) return
        setGenerating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/omega/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    message: `Создай рекламный заголовок и CTA для: ${prompt}. Верни JSON: { "headline", "cta" }`,
                }),
            })
            const json = await res.json()
            const text = json.data?.response || ''
            try {
                const match = text.match(/\{[\s\S]*\}/)
                const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
                setHeadline(parsed.headline || '')
                setCta(parsed.cta || '')
            } catch {
                setHeadline(text.slice(0, 60))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] min-h-[500px]">
                {/* Toolbar */}
                <div className="w-full lg:w-16 flex lg:flex-col gap-2 p-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                    {[ { id: 'text', icon: Type }, { id: 'image', icon: Image }, { id: 'shape', icon: Square } ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTool(t.id)}
                            className={`p-2 rounded-xl transition-colors ${activeTool === t.id ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                        >
                            <t.icon size={18} />
                        </button>
                    ))}
                </div>

                {/* Canvas */}
                <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center overflow-hidden p-4">
                    <div
                        className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg flex items-center justify-center overflow-hidden transition-all"
                        style={{ aspectRatio: PRESETS.find(p => p.id === preview)?.ratio || '1/1', maxHeight: '100%', maxWidth: '100%' }}
                    >
                        {generatedImage ? (
                            <img src={generatedImage} alt="creative" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center text-[var(--text-muted)] p-6">
                                <div className="text-sm font-medium mb-2">Canvas {preview}</div>
                                <div className="text-xs">Выберите инструмент или сгенерируйте креатив</div>
                            </div>
                        )}
                        {headline && (
                            <div className="absolute top-4 left-4 right-4 text-center">
                                <div className="text-lg font-bold text-[var(--text)] drop-shadow">{headline}</div>
                            </div>
                        )}
                        {cta && (
                            <div className="absolute bottom-4 left-4 right-4 text-center">
                                <div className="inline-block px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-medium">{cta}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Panel */}
                <div className="w-full lg:w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-4 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Wand2 size={16} className="text-[var(--primary)]" /> AI-панель</h3>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Описание креатива..."
                        className="w-full h-24 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none resize-none"
                    />
                    <div className="space-y-2">
                        <button onClick={handleGenerateImage} disabled={generating} className="w-full py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                            {generating ? 'Генерация…' : 'Сгенерировать креатив'}
                        </button>
                        <button onClick={handleGenerateText} disabled={generating} className="w-full py-2 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--card-hover)]">
                            Написать текст
                        </button>
                        <button onClick={() => { handleGenerateImage(); handleGenerateText(); }} disabled={generating} className="w-full py-2 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--card-hover)]">
                            A/B тест: 2 варианта
                        </button>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">Превью форматов</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPreview(p.id)}
                                    className={`p-2 rounded-lg border text-[10px] text-center transition-colors ${preview === p.id ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">Экспорт</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {['PNG','JPG','MP4'].map(fmt => (
                                <button key={fmt} className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[var(--border)] text-[10px] text-[var(--text-muted)] hover:bg-[var(--card-hover)]">
                                    <Download size={10} /> {fmt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdStudioTab
