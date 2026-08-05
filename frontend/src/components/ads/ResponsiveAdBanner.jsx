import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ResponsiveAdBanner({ variant = 'auto', className = '' }) {
    const [closed, setClosed] = useState(false)

    useEffect(() => {
        const key = 'ad_banner_closed_' + variant
        try {
            if (localStorage.getItem(key) === '1') setClosed(true)
        } catch {}
    }, [variant])

    const handleClose = () => {
        setClosed(true)
        try { localStorage.setItem('ad_banner_closed_' + variant, '1') } catch {}
    }

    if (closed) return null

    return (
        <div className={`relative ${className}`}>
            {/* Desktop floating card */}
            <div className="hidden sm:flex flex-col fixed bottom-4 right-4 w-72 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">Реклама</span>
                    <button onClick={handleClose} className="text-gray-500 hover:text-white text-xs" aria-label="Закрыть">✕</button>
                </div>
                <p className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Ваша реклама здесь</p>
                <Link to="/advertiser" className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all text-center">Разместить рекламу</Link>
            </div>
            {/* Mobile bottom sheet */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 w-full bg-black/40 backdrop-blur-xl border-t border-white/10 rounded-t-2xl p-4 z-40">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">Реклама</span>
                    <button onClick={handleClose} className="text-gray-500 hover:text-white text-xs" aria-label="Закрыть">✕</button>
                </div>
                <p className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Ваша реклама здесь</p>
                <Link to="/advertiser" className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all text-center">Разместить рекламу</Link>
            </div>
        </div>
    )
}

export default ResponsiveAdBanner
