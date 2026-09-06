import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ className = '' }) {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark'
        return localStorage.getItem('theme') || localStorage.getItem('ai-viral-theme') || 'dark'
    })

    useEffect(() => {
        const root = document.documentElement
        // [DESIGN-LAB] класс light тоже ставим: `.light …` селекторы в globals.css иначе мёртвые
        root.classList.remove('dark', 'light')
        root.classList.add(theme)
        root.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
        localStorage.setItem('ai-viral-theme', theme)
    }, [theme])

    const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`touch-44 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] transition-colors ${className}`}
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    )
}

export default ThemeToggle
