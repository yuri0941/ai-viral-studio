import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const CONSENT_KEY = 'cookie_consent'
const PREFS_KEY = 'cookie_prefs'

export function CookieConsent() {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [prefs, setPrefs] = useState({ analytics: false, marketing: false })

    useEffect(() => {
        try {
            const saved = localStorage.getItem(CONSENT_KEY)
            if (saved === null) setVisible(true)
            const savedPrefs = localStorage.getItem(PREFS_KEY)
            if (savedPrefs) setPrefs(JSON.parse(savedPrefs))
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

    const handleSavePrefs = () => {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
        localStorage.setItem(CONSENT_KEY, 'custom')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0f0f1a]/95 border-t border-white/10 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-300 text-center sm:text-left">{t('cookieConsent.message')}</p>
                <div className="flex items-center gap-2">
                    <button onClick={handleDecline} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {t('cookieConsent.decline')}
                    </button>
                    <button onClick={() => setShowSettings(prev => !prev)} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {t('cookieConsent.settings')}
                    </button>
                    <button onClick={handleAccept} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition-colors">
                        {t('cookieConsent.accept')}
                    </button>
                </div>
            </div>
            {showSettings && (
                <div className="max-w-[1600px] mx-auto mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer min-h-[44px]">
                        <input
                            type="checkbox"
                            checked={prefs.analytics}
                            onChange={e => setPrefs(prev => ({ ...prev, analytics: e.target.checked }))}
                            className="w-4 h-4 accent-[#8b5cf6]"
                        />
                        {t('cookieConsent.analytics', 'Аналитика')}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer min-h-[44px]">
                        <input
                            type="checkbox"
                            checked={prefs.marketing}
                            onChange={e => setPrefs(prev => ({ ...prev, marketing: e.target.checked }))}
                            className="w-4 h-4 accent-[#8b5cf6]"
                        />
                        {t('cookieConsent.marketing', 'Маркетинг')}
                    </label>
                    <button onClick={handleSavePrefs} className="px-4 py-2.5 min-h-[44px] rounded-lg text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition-colors sm:ml-auto">
                        {t('cookieConsent.save', 'Сохранить')}
                    </button>
                </div>
            )}
        </div>
    )
}

export default CookieConsent
