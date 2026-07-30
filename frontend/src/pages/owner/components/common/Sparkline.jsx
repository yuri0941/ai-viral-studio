export function Sparkline({ data, color = 'emerald', height = 40 }) {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = 100 - ((v - min) / range) * 100
        return `${x},${y}`
    }).join(' ')

    const colorMap = {
        emerald: '#10b981',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        orange: '#f59e0b',
        red: '#ef4444',
        gray: '#6b7280',
    }

    const c = colorMap[color] || colorMap.emerald

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" style={{ height }}>
            <polyline
                fill="none"
                stroke={c}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                style={{ filter: `drop-shadow(0 0 4px ${c}40)` }}
            />
        </svg>
    )
}
