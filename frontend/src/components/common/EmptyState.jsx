import { Sparkles, ArrowRight } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, compact = false }) {
    if (compact) {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-2 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    {Icon ? <Icon size={24} className="text-purple-400" /> : <Sparkles size={24} className="text-purple-400" />}
                </div>
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-gray-500 max-w-xs">{description}</div>
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="mt-1 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                        {actionLabel} <ArrowRight size={12} />
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center text-center gap-4 p-10 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:scale-[1.01]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                {Icon ? <Icon size={32} className="text-purple-400" /> : <Sparkles size={32} className="text-purple-400" />}
            </div>
            <div>
                <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-500 max-w-md">{description}</p>
            </div>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 hover:bg-emerald-500/20 hover:scale-[1.02] transition-all"
                >
                    {actionLabel} <ArrowRight size={14} />
                </button>
            )}
        </div>
    )
}

export default EmptyState
