import { useState, useEffect } from 'react'
import { X, Download, RefreshCw, CheckCircle } from 'lucide-react'

// [v9.9.19.2-UX-HOTFIX-v4] модалка НИКОГДА не блокирует работу:
// - нет фейкового прогресс-бара скачивания (PWA update = caches.delete + reload в onUpdate)
// - 15 сек без результата → "Обновление отложено" + автозакрытие
// - "Напомнить позже" активна всегда
const UPDATE_TIMEOUT_MS = 15000

export function UpdateModal({ version, changelog = [], onUpdate, onRemind, onSkip }) {
    const [updating, setUpdating] = useState(false)
    const [stalled, setStalled] = useState(false)

    useEffect(() => {
        if (!updating || stalled) return
        const timer = setTimeout(() => setStalled(true), UPDATE_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [updating, stalled])

    useEffect(() => {
        if (!stalled) return
        const timer = setTimeout(() => onRemind?.(), 2500)
        return () => clearTimeout(timer)
    }, [stalled, onRemind])

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Доступно обновление v{version}</h3>
                    <button onClick={onSkip} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-5">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Что нового</h4>
                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {changelog.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {updating && (
                    <div className="mb-5 flex items-center justify-center gap-2 text-sm text-gray-400">
                        {stalled ? (
                            <p className="text-center">Обновление отложено, применится при следующем визите</p>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <p>Обновление...</p>
                            </>
                        )}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onRemind}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
                    >
                        Напомнить позже
                    </button>
                    <button
                        onClick={() => {
                            setUpdating(true)
                            onUpdate?.()
                        }}
                        disabled={updating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {updating ? 'Обновление...' : 'Обновить сейчас'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UpdateModal
