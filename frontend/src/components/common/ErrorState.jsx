import { AlertTriangle, RefreshCw } from 'lucide-react'

// [DESIGN-PRO З2] Канонический error-state по спеке backend/knowledge/design.json#states.error:
// что случилось + что делать + кнопка (повторить). Без сырых кодов/стектрейсов пользователю.
// Статус не только цветом (rui-c2): иконка + текст.
export function ErrorState({ title = 'Что-то пошло не так', description = 'Данные не загрузились. Проверьте соединение и попробуйте ещё раз.', onRetry, retryLabel = 'Повторить', compact = false }) {
    return (
        <div className={`flex flex-col items-center justify-center text-center gap-3 ${compact ? 'p-6' : 'p-10'} rounded-2xl bg-white/[0.02] border border-white/5`} role="alert">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-rose-400" />
            </div>
            <div>
                <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
                <p className="text-xs text-gray-500 max-w-xs">{description}</p>
            </div>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-1 min-h-[44px] px-4 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                >
                    <RefreshCw size={14} /> {retryLabel}
                </button>
            )}
        </div>
    )
}
