import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ai-viral-theme'

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark'
        return localStorage.getItem(STORAGE_KEY) || 'dark'
    })

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            // ignore
        }
    }, [theme])

    const setDark = useCallback(() => setTheme('dark'), [])
    const setLight = useCallback(() => setTheme('light'), [])
    const toggle = useCallback(() => setTheme(prev => prev === 'dark' ? 'light' : 'dark'), [])

    return { theme, isDark: theme === 'dark', setTheme, setDark, setLight, toggle }
}
