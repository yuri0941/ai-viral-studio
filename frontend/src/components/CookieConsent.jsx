import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const CONSENT_KEY = 'cookie_consent'

export function CookieConsent() {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        try {
            const saved = localStorage.getItem(CONSENT_KEY)
            if (saved === null) setVisible(true)
        } catch {}
    }, [])

    const handleAccept = () => {
        localStorage.setItem(CONSENT_KEY, 'accepted')
        setVisible(false)
    }

    const handleDecline = () => {
        localStorage.setItem(CONSENT_KEY, 'declined')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0f0f1a]/95 border-t border-white/10 backdrop-blur-md px-4 py-3">
            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-300 text-center sm:text-left">{t('cookieConsent.message')}</p>
                <div className="flex items-center gap-2">
                    <button onClick={handleDecline} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {t('cookieConsent.decline')}
                    </button>
                    <button onClick={() => {}} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {t('cookieConsent.settings')}
                    </button>
                    <button onClick={handleAccept} className="px-3 py-1.5 rounded-lg text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition-colors">
                        {t('cookieConsent.accept')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CookieConsent
