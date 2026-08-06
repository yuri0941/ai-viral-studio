import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Sparkline } from './Sparkline'

export function KPICard({ title, value, prefix = '', suffix = '', change = 0, sparklineData = [], icon: Icon, color = 'emerald', onClick }) {
    const [displayValue, setDisplayValue] = useState(0)
    const [animated, setAnimated] = useState(false)
    const ref = useRef(null)

    const colorMap = {
        emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20',
        blue: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/20',
        purple: 'from-purple-500/20 to-violet-500/10 text-purple-400 border-purple-500/20',
        orange: 'from-orange-500/20 to-amber-500/10 text-orange-400 border-orange-500/20',
        red: 'from-red-500/20 to-rose-500/10 text-red-400 border-red-500/20',
        gray: 'from-gray-500/20 to-slate-500/10 text-gray-400 border-gray-500/20',
    }

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !animated) {
                setAnimated(true)
                const num = parseFloat(value) || 0
                const duration = 1200
                const start = performance.now()
                const tick = (now) => {
                    const progress = Math.min((now - start) / duration, 1)
                    const ease = 1 - Math.pow(1 - progress, 3)
                    setDisplayValue(num * ease)
                    if (progress < 1) requestAnimationFrame(tick)
                }
                requestAnimationFrame(tick)
            }
        }, { threshold: 0.3 })
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [value, animated])

    const isPositive = change > 0
    const isNeutral = change === 0
    const TrendIcon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown
    const trendColor = isPositive ? 'text-emerald-400' : isNeutral ? 'text-gray-400' : 'text-red-400'

    const format = (n) => {
        if (Number.isInteger(parseFloat(value))) return Math.round(n).toLocaleString('en-US')
        return n.toFixed(1)
    }

    return (
        <div
            ref={ref}
            onClick={onClick}
            className={`glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer group`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-white/5 backdrop-blur-sm">
                    {Icon && <Icon size={20} />}
                </div>
                {sparklineData.length > 0 && (
                    <div className="w-24 h-10 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Sparkline data={sparklineData} color={color} />
                    </div>
                )}
            </div>
            <div className="text-2xl font-bold tracking-tight">
                {prefix}{format(displayValue)}{suffix}
            </div>
            <div className="text-xs text-gray-400 mt-1">{title}</div>
            {change !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
                    <TrendIcon size={12} />
                    <span>{isNeutral ? '0%' : `${isPositive ? '+' : ''}${change}%`}</span>
                    <span className="text-gray-500 font-normal">vs прошлый период</span>
                </div>
            )}
        </div>
    )
}
