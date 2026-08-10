import { useState, useEffect } from 'react'
import { Send, X, Instagram, Youtube, Music2, Send as TelegramIcon, Check, Loader2, Clock } from 'lucide-react'

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, ratio: '1:1', aspect: 'aspect-square', color: 'text-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: Music2, ratio: '9:16', aspect: 'aspect-[9/16]', color: 'text-cyan-400' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, ratio: '16:9', aspect: 'aspect-video', color: 'text-red-500' },
    { id: 'telegram', name: 'Telegram', icon: TelegramIcon, ratio: 'текст', aspect: '', color: 'text-sky-400' },
]

function adaptContent(platform, content) {
    const base = content || 'Ваш пост готов к публикации. #viral #ai #content'
    switch (platform) {
        case 'instagram':
            return `${base}\n\n#viral #content #creator #trend2026 #ai\n\nCTA: Сохраните и подпишитесь`
        case 'tiktok':
            return base.slice(0, 120) + (base.length > 120 ? '...' : '') + '\n\n(≤60 сек)'
        case 'youtube':
            return `${base}\n\nОписание: разбор, таймкоды и ссылки в комментарии.`
        case 'telegram':
            return `${base}\n\n[Кнопка: Подробнее] [Кнопка: Задать вопрос]`
        default:
            return base
    }
}

export function OneClickPublish({ content, onPublish }) {
    const [showModal, setShowModal] = useState(false)
    const [selected, setSelected] = useState(PLATFORMS.map(p => p.id))
    const [publishing, setPublishing] = useState(false)
    const [toast, setToast] = useState(null)
    const [countdown, setCountdown] = useState(null)

    useEffect(() => {
        if (countdown === null) return
        if (countdown <= 0) {
            doPublish()
            return
        }
        const t = setTimeout(() => setCountdown(countdown - 1), 1000)
        return () => clearTimeout(t)
    }, [countdown])

    const toggle = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    const open = () => setShowModal(true)
    const close = () => setShowModal(false)

    const confirm = () => {
        setShowModal(false)
        setToast({ type: 'pending', message: `Публикация в ${selected.length} соцсети через 5 сек...` })
        setCountdown(5)
    }

    const cancel = () => {
        setCountdown(null)
        setToast({ type: 'cancelled', message: 'Публикация отменена' })
        setTimeout(() => setToast(null), 2000)
    }

    const doPublish = async () => {
        setCountdown(null)
        setPublishing(true)
        try {
            await new Promise(r => setTimeout(r, 800))
            if (onPublish) await onPublish(selected)
            setToast({ type: 'success', message: `Опубликовано в ${selected.length} соцсети!` })
        } catch (err) {
            setToast({ type: 'error', message: err.message || 'Ошибка публикации' })
        } finally {
            setPublishing(false)
            setTimeout(() => setToast(null), 3000)
        }
    }

    return (
        <>
            <button
                onClick={open}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-medium text-sm transition-all"
            >
                <Send size={16} /> Опубликовать везде
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a24] border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Опубликовать везде</h3>
                            <button onClick={close} className="text-gray-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Авто-адаптация контента под каждую площадку</p>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            {PLATFORMS.map(p => {
                                const Icon = p.icon
                                const active = selected.includes(p.id)
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => toggle(p.id)}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            active ? 'bg-white/10 border-emerald-500/30' : 'bg-white/5 border-white/10 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icon className={`w-5 h-5 ${p.color}`} />
                                            <span className="font-medium text-white text-sm">{p.name}</span>
                                            <span className="ml-auto text-xs text-gray-500">{p.ratio}</span>
                                        </div>
                                        <div className={`text-xs text-gray-300 leading-relaxed ${p.aspect ? 'p-2 rounded bg-black/30 ' + p.aspect : ''}`}>
                                            {adaptContent(p.id, content)}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10">Отмена</button>
                            <button
                                onClick={confirm}
                                disabled={selected.length === 0}
                                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-medium disabled:opacity-50"
                            >
                                Опубликовать в {selected.length} соцсети
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-lg flex items-center gap-3 ${
                    toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    toast.type === 'cancelled' ? 'bg-gray-500/10 border-gray-500/30 text-gray-300' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}>
                    {toast.type === 'success' ? <Check size={16} /> : toast.type === 'cancelled' ? <X size={16} /> : <Clock size={16} />}
                    <span className="text-sm">{toast.message}</span>
                    {toast.type === 'pending' && (
                        <button onClick={cancel} className="ml-2 text-xs underline hover:text-white">Отменить</button>
                    )}
                    {toast.type === 'pending' && <span className="text-xs text-gray-500">{countdown}s</span>}
                    {toast.type === 'pending' && <Loader2 size={14} className="animate-spin" />}
                </div>
            )}
        </>
    )
}

export default OneClickPublish
