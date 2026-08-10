import { useState, useRef, useEffect } from 'react'
import { Type, Image, Square, Wand2, Download, Smartphone, Monitor, Tablet, Layers, ZoomIn, ZoomOut, Move, Trash2, Copy } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

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
    const [zoom, setZoom] = useState(100)
    const [layers, setLayers] = useState([
        { id: 'bg', name: 'Background', type: 'image', visible: true },
        { id: 'headline', name: 'Headline', type: 'text', visible: true },
        { id: 'cta', name: 'CTA Button', type: 'shape', visible: true },
    ])

    // [P18] added: canvas elements (draggable + editable)
    const [elements, setElements] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [dragging, setDragging] = useState(null)
    const canvasRef = useRef(null)

    async function handleGenerateImage() {
        if (!prompt.trim()) return
        setGenerating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_BASE_URL}/omega/generate-cover`, {
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
            const res = await fetch(`${API_BASE_URL}/omega/chat`, {
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

    // [P18] added: canvas element management
    function addElement(type, xPercent, yPercent) {
        const id = Date.now().toString()
        const base = {
            id,
            type,
            x: Math.max(0, Math.min(90, xPercent - (type === 'text' ? 20 : 12))),
            y: Math.max(0, Math.min(90, yPercent - 6)),
            width: type === 'text' ? 40 : 25,
            height: type === 'text' ? 12 : 25,
            text: type === 'text' ? 'Новый текст' : type === 'shape' ? '' : '',
            color: type === 'shape' ? '#8b5cf6' : type === 'text' ? '#ffffff' : '#000000',
            fontSize: 16,
            zIndex: elements.length + 1,
        }
        setElements(prev => [...prev, base])
        setSelectedId(id)
    }

    function handleCanvasClick(e) {
        if (activeTool === 'move' || activeTool === 'ai') return
        if (!canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        addElement(activeTool, x, y)
        setActiveTool('move')
    }

    function startDrag(e, id) {
        e.stopPropagation()
        if (activeTool !== 'move') setActiveTool('move')
        const el = elements.find(el => el.id === id)
        if (!el) return
        setSelectedId(id)
        setDragging({
            id,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: el.x,
            startTop: el.y,
        })
    }

    useEffect(() => {
        if (!dragging) return
        function onMove(e) {
            if (!canvasRef.current) return
            const rect = canvasRef.current.getBoundingClientRect()
            const dx = ((e.clientX - dragging.startX) / rect.width) * 100
            const dy = ((e.clientY - dragging.startY) / rect.height) * 100
            setElements(prev => prev.map(el =>
                el.id === dragging.id
                    ? {
                        ...el,
                        x: Math.max(0, Math.min(100 - el.width, dragging.startLeft + dx)),
                        y: Math.max(0, Math.min(100 - el.height, dragging.startTop + dy)),
                    }
                    : el
            ))
        }
        function onUp() { setDragging(null) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [dragging])

    function updateSelected(patch) {
        if (!selectedId) return
        setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...patch } : el))
    }

    function deleteSelected() {
        if (!selectedId) return
        setElements(prev => prev.filter(el => el.id !== selectedId))
        setSelectedId(null)
    }

    const selectedElement = elements.find(el => el.id === selectedId)

    const toggleLayer = (id) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
    }

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] min-h-[500px]">
                {/* Toolbar */}
                <div className="w-full lg:w-16 flex lg:flex-col gap-2 p-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                    {[ { id: 'move', icon: Move }, { id: 'text', icon: Type }, { id: 'image', icon: Image }, { id: 'shape', icon: Square } ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTool(t.id)}
                            className={`p-2 rounded-xl transition-colors ${activeTool === t.id ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                            title={t.id}
                        >
                            <t.icon size={18} />
                        </button>
                    ))}
                </div>

                {/* [P16-CONTINUE] added: canvas with rulers and zoom */}
                <div className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg)] relative overflow-hidden flex flex-col">
                    {/* Top ruler */}
                    <div className="h-6 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-end px-4 text-[10px] text-[var(--text-muted)] select-none">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <span key={i} className="flex-1 border-l border-[var(--border-strong)] h-2 pl-1">{i * 50}</span>
                        ))}
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left ruler */}
                        <div className="w-6 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col items-end py-4 text-[10px] text-[var(--text-muted)] select-none">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <span key={i} className="h-12 border-t border-[var(--border-strong)] w-2 pr-1 text-right">{i * 50}</span>
                            ))}
                        </div>
                        <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative">
                            <div
                                ref={canvasRef}
                                onClick={handleCanvasClick}
                                className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg flex items-center justify-center overflow-hidden transition-all cursor-crosshair"
                                style={{ aspectRatio: PRESETS.find(p => p.id === preview)?.ratio || '1/1', maxHeight: '100%', maxWidth: '100%', transform: `scale(${zoom / 100})` }}
                            >
                                {(!layers.find(l => l.id === 'bg')?.visible || !generatedImage) && (
                                    <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] pointer-events-none">
                                        <div className="text-center p-6">
                                            <div className="text-sm font-medium mb-2">Canvas {preview}</div>
                                            <div className="text-xs">Выберите инструмент или сгенерируйте креатив</div>
                                        </div>
                                    </div>
                                )}
                                {layers.find(l => l.id === 'bg')?.visible && generatedImage && (
                                    <img src={generatedImage} alt="creative" className="w-full h-full object-cover pointer-events-none" />
                                )}
                                {layers.find(l => l.id === 'headline')?.visible && headline && (
                                    <div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
                                        <div className="text-lg font-bold text-[var(--text)] drop-shadow">{headline}</div>
                                    </div>
                                )}
                                {layers.find(l => l.id === 'cta')?.visible && cta && (
                                    <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
                                        <div className="inline-block px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-medium">{cta}</div>
                                    </div>
                                )}

                                {/* [P18] added: draggable canvas elements */}
                                {elements.map(el => (
                                    <div
                                        key={el.id}
                                        onMouseDown={(e) => startDrag(e, el.id)}
                                        className={`absolute select-none overflow-hidden ${selectedId === el.id ? 'ring-2 ring-[var(--primary)]' : ''}`}
                                        style={{
                                            left: `${el.x}%`,
                                            top: `${el.y}%`,
                                            width: `${el.width}%`,
                                            height: `${el.height}%`,
                                            zIndex: el.zIndex,
                                            backgroundColor: el.type === 'shape' ? el.color : 'transparent',
                                            color: el.type === 'text' ? el.color : 'inherit',
                                            fontSize: `${el.fontSize}px`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: activeTool === 'move' ? 'move' : 'pointer',
                                        }}
                                    >
                                        {el.type === 'image' && (
                                            <img src={generatedImage || 'https://placehold.co/200x200?text=Image'} alt="" className="w-full h-full object-cover" />
                                        )}
                                        {el.type === 'text' && (
                                            <span className="font-medium text-center leading-tight">{el.text}</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Zoom controls */}
                            <div className="absolute bottom-4 right-4 flex items-center gap-1 glass-card p-1 rounded-lg">
                                <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"><ZoomOut size={14} /></button>
                                <span className="text-xs text-[var(--text)] w-10 text-center">{zoom}%</span>
                                <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"><ZoomIn size={14} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Panel */}
                <div className="w-full lg:w-64 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-4 overflow-y-auto">
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
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">Превью форматов</h4>
                        <div className="grid grid-cols-2 gap-2">
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

                    {/* [P18] added: element properties panel */}
                    <div className="pt-4 border-t border-[var(--border)]">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">Свойства</h4>
                        {selectedElement ? (
                            <div className="space-y-2">
                                {selectedElement.type === 'text' && (
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">Текст</label>
                                        <input
                                            value={selectedElement.text}
                                            onChange={(e) => updateSelected({ text: e.target.value })}
                                            className="w-full px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] outline-none"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">X %</label>
                                        <input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateSelected({ x: Number(e.target.value) })} className="w-full px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">Y %</label>
                                        <input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateSelected({ y: Number(e.target.value) })} className="w-full px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">W %</label>
                                        <input type="number" value={Math.round(selectedElement.width)} onChange={(e) => updateSelected({ width: Number(e.target.value) })} className="w-full px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">H %</label>
                                        <input type="number" value={Math.round(selectedElement.height)} onChange={(e) => updateSelected({ height: Number(e.target.value) })} className="w-full px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">Цвет</label>
                                        <input type="color" value={selectedElement.color} onChange={(e) => updateSelected({ color: e.target.value })} className="w-full h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)]" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">z-index</label>
                                        <input type="number" value={selectedElement.zIndex} onChange={(e) => updateSelected({ zIndex: Number(e.target.value) })} className="w-full px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] outline-none" />
                                    </div>
                                </div>
                                {selectedElement.type === 'text' && (
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)]">Размер шрифта</label>
                                        <input type="range" min={8} max={72} value={selectedElement.fontSize} onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })} className="w-full" />
                                        <div className="text-[10px] text-[var(--text-muted)] text-right">{selectedElement.fontSize}px</div>
                                    </div>
                                )}
                                <button onClick={deleteSelected} className="w-full py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 flex items-center justify-center gap-1">
                                    <Trash2 size={12} /> Удалить
                                </button>
                            </div>
                        ) : (
                            <div className="text-[10px] text-[var(--text-muted)]">Выберите элемент на canvas</div>
                        )}
                    </div>
                </div>

                {/* [P16-CONTINUE] added: layers panel like Figma */}
                <div className="w-full lg:w-52 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col">
                    <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 mb-3"><Layers size={16} className="text-[var(--primary)]" /> Слои</h3>
                    <div className="flex-1 space-y-1 overflow-y-auto">
                        {[...layers].reverse().map(layer => (
                            <div
                                key={layer.id}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${layer.visible ? 'text-[var(--text)] hover:bg-[var(--surface)]' : 'text-[var(--text-muted)] opacity-60'}`}
                                onClick={() => toggleLayer(layer.id)}
                            >
                                <div className="flex items-center gap-2">
                                    {layer.type === 'text' ? <Type size={12} /> : layer.type === 'image' ? <Image size={12} /> : <Square size={12} />}
                                    <span>{layer.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-1 rounded hover:bg-[var(--surface)] text-[var(--text-muted)]"><Copy size={10} /></button>
                                    <button className="p-1 rounded hover:bg-[var(--surface)] text-[var(--text-muted)]"><Trash2 size={10} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdStudioTab
