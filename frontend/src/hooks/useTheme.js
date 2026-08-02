import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'ai-viral-theme'

function getSystemTheme() {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem(STORAGE_KEY) || 'dark'
}

export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme)

    const appliedTheme = useMemo(() => {
        if (theme === 'system') return getSystemTheme()
        return theme
    }, [theme])

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('dark')
        if (appliedTheme === 'dark') {
            root.classList.add('dark')
        }
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            // ignore
        }
    }, [theme, appliedTheme])

    useEffect(() => {
        if (theme !== 'system') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => setTheme('system') // trigger re-render to recompute appliedTheme
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const current = prev === 'system' ? getSystemTheme() : prev
            return current === 'dark' ? 'light' : 'dark'
        })
    }, [])

    return { theme, appliedTheme, setTheme, toggleTheme }
}
