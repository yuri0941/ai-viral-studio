import { useState, useEffect, useRef } from 'react'

export function LazyImage({ src, alt, className = '', placeholder = '/icons/icon-192x192.png' }) {
    const [loaded, setLoaded] = useState(false)
    const [inView, setInView] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!ref.current || !window.IntersectionObserver) {
            setInView(true)
            return
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '100px' }
        )
        observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={ref} className={`relative ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 bg-[var(--surface)] animate-pulse flex items-center justify-center">
                    <img src={placeholder} alt="" className="w-8 h-8 opacity-30" />
                </div>
            )}
            {inView && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
        </div>
    )
}
