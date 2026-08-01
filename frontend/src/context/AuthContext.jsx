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
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await response.json()
                    if (data.success) {
                        setUser(data.user)
                        setIsAuthenticated(true)
                        if (!data.user?.preferences?.timezone) {
                            updatePreferences({ timezone: detectTimezone() })
                        }
                    } else {
                        localStorage.removeItem('token')
                    }
                } catch (error) {
                    localStorage.removeItem('token')
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
                })
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