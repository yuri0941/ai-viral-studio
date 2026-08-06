import { useState, useEffect } from 'react'
import { X, Download, RefreshCw, CheckCircle } from 'lucide-react'

export function UpdateModal({ version, changelog = [], onUpdate, onRemind, onSkip }) {
    const [progress, setProgress] = useState(0)
    const [updating, setUpdating] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (!updating) return
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval)
                    setDone(true)
                    setTimeout(() => onUpdate?.(), 800)
                    return 100
                }
                return p + 10
            })
        }, 250)
        return () => clearInterval(interval)
    }, [updating, onUpdate])

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-card rounded-2xl w-full max-w-md p-6">
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
                    <div className="mb-5">
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            {done ? 'Перезагрузка...' : `Загрузка обновления ${progress}%`}
                        </p>
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
