import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config.js'

// Создаём контекст
const AuthContext = createContext(null)

// Кастомный хук — ОБЯЗАТЕЛЕН для useAuth
export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// Провайдер
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const detectTimezone = () => {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
    }

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token')
            let authed = false
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await response.json()
                    if (data.success) {
                        setUser(data.user)
                        setIsAuthenticated(true)
                        authed = true
                        localStorage.setItem('user_profile', JSON.stringify(data.user))
                        if (!data.user?.preferences?.timezone) {
                            updatePreferences({ timezone: detectTimezone() })
                        }
                    } else if (response.status === 401) {
                        // [DOP-4] только настоящий 401 = сессия мертва
                        localStorage.removeItem('token')
                    }
                    // [DOP-4] 5xx/прочее — НЕ выкидываем: восстанавливаем кэш профиля ниже
                } catch (error) {
                    // [DOP-4] сетевая ошибка/cold start Render (PWA на телефоне) — НЕ выкидываем:
                    // раньше здесь затирался токен → владельца выбрасывало из кабинета
                    console.warn('[Auth] /auth/me недоступен, используем кэш профиля:', error.message)
                }
                // [DOP-4] если сессия не подтверждена, но токен жив — восстанавливаем из кэша
                if (!authed && localStorage.getItem('token')) {
                    try {
                        const cached = JSON.parse(localStorage.getItem('user_profile') || 'null')
                        if (cached) {
                            setUser(cached)
                            setIsAuthenticated(true)
                        }
                    } catch { /* битый кэш — игнорируем */ }
                }
            }
            setLoading(false)
        }
        checkAuth()
    }, [])

    const login = async (email, password, turnstileToken = '') => {
        try {
            const timezone = detectTimezone()
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, turnstileToken, timezone })
            })
            const data = await response.json()
            if (data.success) {
                localStorage.setItem('token', data.token)
                setUser(data.user)
                setIsAuthenticated(true)
                return { success: true }
            }
            return { success: false, message: data.message || data.error }
        } catch (error) {
            return { success: false, message: 'Ошибка сервера' }
        }
    }

    const register = async (name, email, password, consent = {}, turnstileToken = '') => {
        try {
            const timezone = detectTimezone()
            // [CLIENT-JOURNEY-QA] реферальный код из ?ref= (сохраняется лендингом в localStorage)
            const referralCode = localStorage.getItem('referral_code') || ''
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, email, password,
                    timezone,
                    acceptedTerms: !!consent.acceptedTerms,
                    acceptedPrivacy: !!consent.acceptedPrivacy,
                    acceptedConsent: !!consent.acceptedConsent,
                    isAdult: !!consent.isAdult,
                    turnstileToken,
                    ...(referralCode ? { referralCode } : {}),
                })
            })
            const data = await response.json()
            if (data.success) {
                localStorage.setItem('token', data.token)
                setUser(data.user)
                setIsAuthenticated(true)
                return { success: true }
            }
            return { success: false, message: data.message || data.error, code: data.code || null }
        } catch (error) {
            return { success: false, message: 'Ошибка сервера' }
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        setUser(null)
        setIsAuthenticated(false)
    }

    const updateUser = (updates) => {
        setUser(prev => {
            if (!prev) return prev
            const next = { ...prev, ...updates }
            localStorage.setItem('user_profile', JSON.stringify(next))
            return next
        })
    }

    const updatePreferences = async (preferences) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ preferences })
            })
            const data = await response.json()
            if (data.success) {
                setUser(prev => {
                    if (!prev) return prev
                    const next = { ...prev, preferences: { ...prev.preferences, ...preferences } }
                    localStorage.setItem('user_profile', JSON.stringify(next))
                    return next
                })
                return { success: true }
            }
            return { success: false, message: data.message }
        } catch (error) {
            return { success: false, message: 'Ошибка сервера' }
        }
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, register, logout, updateUser, updatePreferences }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext