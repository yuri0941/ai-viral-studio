import { createContext, useContext, useState, useEffect } from 'react'

const AdContext = createContext()

export const AdProvider = ({ children }) => {
    const [adsEnabled, setAdsEnabled] = useState(true)
    const [userPlan, setUserPlan] = useState('free')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkUserPlan = () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}')
                const plan = user?.subscription?.plan || 'free'
                setUserPlan(plan)

                // Отключаем рекламу для платных планов
                if (['pro', 'agency', 'enterprise'].includes(plan)) {
                    setAdsEnabled(false)
                }
            } catch (error) {
                console.error('Error checking user plan:', error)
            } finally {
                setIsLoading(false)
            }
        }

        checkUserPlan()

        // Слушаем изменения в localStorage (при обновлении подписки)
        const handleStorageChange = () => checkUserPlan()
        window.addEventListener('storage', handleStorageChange)

        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    // Слоты рекламы
    const adSlots = {
        sidebar: '1234567890',
        banner: '0987654321',
        native: '1122334455',
        mobile: '5566778899'
    }

    // Форматы для разных устройств
    const getAdFormat = () => {
        const width = window.innerWidth
        if (width < 768) return 'mobile'
        if (width < 1024) return 'tablet'
        return 'desktop'
    }

    // Показывать ли рекламу на текущей странице
    const shouldShowAd = (pageType) => {
        if (!adsEnabled) return false
        if (isLoading) return false

        // Не показывать на landing page и странице оплаты
        const noAdPages = ['landing', 'checkout', 'payment', 'success']
        return !noAdPages.includes(pageType)
    }

    const value = {
        adsEnabled,
        userPlan,
        isLoading,
        adSlots,
        showAds: adsEnabled && !isLoading,
        getAdFormat,
        shouldShowAd,
        trackImpression: async (slot, page) => {
            try {
                const token = localStorage.getItem('token')
                await fetch('http://localhost:5000/api/ads/impression', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        adSlot: slot,
                        page,
                        device: getAdFormat()
                    })
                })
            } catch (error) {
                console.error('Ad tracking error:', error)
            }
        },
        trackClick: async (impressionId) => {
            try {
                const token = localStorage.getItem('token')
                await fetch(`http://localhost:5000/api/ads/click/${impressionId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            } catch (error) {
                console.error('Ad click tracking error:', error)
            }
        }
    }

    return <AdContext.Provider value={value}>{children}</AdContext.Provider>
}

export const useAds = () => {
    const context = useContext(AdContext)
    if (!context) {
        throw new Error('useAds must be used within AdProvider')
    }
    return context
}