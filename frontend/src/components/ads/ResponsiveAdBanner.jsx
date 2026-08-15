import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ResponsiveAdBanner({ variant = 'auto', className = '' }) {
    const { t } = useTranslation()
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
        <div className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 w-[300px] max-w-[calc(100vw-2rem)] glass-card rounded-xl p-4 shadow-2xl shadow-black/40 transition-opacity duration-300 ${className}`}>
            <button
                onClick={handleClose}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:scale-110 transition-transform z-50"
                aria-label={t('adBanner.close')}
            >
                <X size={14} />
            </button>
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">{t('adBanner.label')}</span>
            </div>
            <p className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{t('adBanner.placeholder')}</p>
            <Link
                to="/advertiser"
                className="mt-3 block w-full py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all text-center"
            >
                {t('adBanner.cta')}
            </Link>
        </div>
    )
}

export default ResponsiveAdBanner
