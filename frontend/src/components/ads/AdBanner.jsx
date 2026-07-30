import { useEffect, useRef, useState } from 'react'

const AdBanner = ({ slot, format = 'auto', className = '' }) => {
    const adRef = useRef(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isPro, setIsPro] = useState(false)

    useEffect(() => {
        // Проверяем подписку пользователя
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setIsPro(user?.subscription?.plan === 'pro' || user?.subscription?.plan === 'agency')
    }, [])

    useEffect(() => {
        if (isPro) return // Pro пользователи не видят рекламу

        // Lazy loading — загружаем рекламу только когда видна
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '100px' }
        )

        if (adRef.current) observer.observe(adRef.current)

        return () => observer.disconnect()
    }, [isPro])

    useEffect(() => {
        if (!isVisible || isPro) return

        // Загружаем Google AdSense или другую рекламу
        try {
            if (window.adsbygoogle) {
                window.adsbygoogle.push({})
            }
        } catch (e) {
            console.log('Ad load error:', e)
        }
    }, [isVisible, isPro])

    if (isPro) return null // Скрываем для Pro

    return (
        <div
            ref={adRef}
            className={`ad-container ${className}`}
            style={{
                minHeight: format === 'sidebar' ? '600px' : '250px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '16px',
                margin: '16px 0',
                border: '1px solid rgba(255,255,255,0.05)'
            }}
        >
            {isVisible && (
                <>
                    <div className="ad-label" style={{
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '8px'
                    }}>
                        Реклама
                    </div>

                    {/* Google AdSense */}
                    <ins
                        className="adsbygoogle"
                        style={{ display: 'block' }}
                        data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
                        data-ad-slot={slot}
                        data-ad-format={format}
                        data-full-width-responsive="true"
                    />

                    {/* Fallback — наша реклама (если AdSense не загрузился) */}
                    <div className="ad-fallback" style={{
                        display: 'none', // Показываем через JS если adsbygoogle не сработал
                        padding: '20px',
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.6)'
                    }}>
                        <p>🚀 Хотите больше AI-запросов?</p>
                        <button className="btn-upgrade">
                            Обновить до Pro
                        </button>
                    </div>
                </>
            )}

            {!isVisible && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="ad-skeleton" style={{
                        width: '100%',
                        height: '200px',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '8px'
                    }} />
                </div>
            )}
        </div>
    )
}

export default AdBanner