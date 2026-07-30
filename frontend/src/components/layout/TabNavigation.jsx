export function TabNavigation({ tabs, activeTab, onChange }) {
    if (!tabs?.length) return null

    return (
        <div className="sticky top-0 z-20 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] transition-colors duration-300">
            <div className="px-4 py-3">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide touch-pan-x pb-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onChange?.(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {Icon && <Icon size={14} />}
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
