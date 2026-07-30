export function LoadingSkeleton({ type = 'card', count = 1, className = '' }) {
    const base = 'animate-pulse rounded-xl bg-white/5'

    if (type === 'card') {
        return (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={`${base} h-28`} />
                ))}
            </div>
        )
    }

    if (type === 'table') {
        return (
            <div className={`space-y-3 ${className}`}>
                <div className={`${base} h-10`} />
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={`${base} h-12`} />
                ))}
            </div>
        )
    }

    if (type === 'text') {
        return (
            <div className={`space-y-2 ${className}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={`${base} h-4 w-full ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
                ))}
            </div>
        )
    }

    return <div className={`${base} h-28 ${className}`} />
}
