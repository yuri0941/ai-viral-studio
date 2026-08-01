import { useEffect, useState } from 'react'
import { X, Megaphone } from 'lucide-react'
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
            {/* Desktop sidebar (300x250) */}
            <div className="hidden xl:flex flex-col items-center justify-center w-[300px] h-[250px] rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 text-center">
                <Megaphone size={24} className="text-purple-400 mb-2" />
                <p className="text-xs text-gray-400 mb-3">Ваша реклама может быть здесь</p>
                <Link to="/advertiser" className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-xs text-purple-400 hover:bg-purple-500/30 transition-colors">
                    Разместить рекламу
                </Link>
                <button onClick={handleClose} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white" aria-label="Закрыть"><X size={14} /></button>
            </div>

            {/* Desktop bottom (728x90) */}
            <div className="hidden md:flex xl:hidden items-center justify-between h-[90px] rounded-2xl bg-[#0f0f1a] border border-white/5 px-6">
                <div className="flex items-center gap-3">
                    <Megaphone size={20} className="text-purple-400" />
                    <div>
                        <p className="text-sm font-medium text-white">Ваша реклама может быть здесь</p>
                        <p className="text-xs text-gray-500">Рекламные форматы: 728×90, 300×250, 320×50</p>
                    </div>
                </div>
                <Link to="/advertiser" className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-xs text-purple-400 hover:bg-purple-500/30 transition-colors">
                    Разместить
                </Link>
                <button onClick={handleClose} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white" aria-label="Закрыть"><X size={14} /></button>
            </div>

            {/* Tablet bottom (468x60) */}
            <div className="hidden sm:flex md:hidden items-center justify-between h-[60px] rounded-2xl bg-[#0f0f1a] border border-white/5 px-4">
                <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-purple-400" />
                    <span className="text-xs text-gray-400">Реклама здесь</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/advertiser" className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[10px] text-purple-400 hover:bg-purple-500/30 transition-colors">
                        Разместить
                    </Link>
                    <button onClick={handleClose} className="p-1 text-gray-500 hover:text-white" aria-label="Закрыть"><X size={12} /></button>
                </div>
            </div>

            {/* Mobile fixed bottom (320x50) */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-[50px] bg-[#0f0f1a] border-t border-white/5 px-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-purple-400" />
                    <span className="text-xs text-gray-300">Ваша реклама здесь</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/advertiser" className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-[10px] text-purple-400 hover:bg-purple-500/30 transition-colors">
                        Разместить
                    </Link>
                    <button onClick={handleClose} className="p-1.5 text-gray-500 hover:text-white" aria-label="Закрыть"><X size={14} /></button>
                </div>
            </div>
        </div>
    )
}

export default ResponsiveAdBanner
