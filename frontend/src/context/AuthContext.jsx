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

// [VIEW-AS-PERSIST] допустимые роли для view-as режима владельца (owner не входит — это выход из режима)
const VIEW_AS_ROLES = ['admin', 'staff', 'creator', 'business', 'advertiser']

// [VIEW-AS-PERSIST] читаем сохранённый view-as (только для владельца, применяется в AuthProvider)
function readViewAs() {
    try {
        const v = localStorage.getItem('view_as')
        return VIEW_AS_ROLES.includes(v) ? v : null
    } catch { return null }
}

// [VIEW-AS-PERSIST] эффективный юзер: реальная роль owner + view_as → фронт работает в роли view_as,
// JWT и серверные права остаются owner. realRole хранит настоящую роль.
function applyViewAs(user) {
    if (!user) return user
    const viewAs = readViewAs()
    if (user.role === 'owner' && viewAs) {
        return { ...user, realRole: 'owner', role: viewAs }
    }
    return user
}

// Провайдер
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    // [ROLE-SWITCH-FLASH] свежий маркер смены роли → профиль мог не догрузиться,
    // ProtectedRoute в это время показывает спиннер вместо /unauthorized
    const [roleSwitching, setRoleSwitching] = useState(() => {
        const at = Number(localStorage.getItem('role_switch_at') || 0)
        return at > 0 && Date.now() - at < 15000
    })

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
                        setUser(applyViewAs(data.user))
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
                            setUser(applyViewAs(cached))
                            setIsAuthenticated(true)
                        }
                    } catch { /* битый кэш — игнорируем */ }
                }
            }
            setLoading(false)
            // [ROLE-SWITCH-FLASH] профиль применён (сервер или кэш) — роль подтверждена
            localStorage.removeItem('role_switch_at')
            setRoleSwitching(false)
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
        localStorage.removeItem('role_switch_at')
        localStorage.removeItem('view_as')
        setUser(null)
        setIsAuthenticated(false)
    }

    // [VIEW-AS-PERSIST] владелец смотрит приложение глазами роли: фронт-режим, JWT не меняется.
    // role=null/'owner' — выход из режима. Сохраняется в localStorage отдельно от user_profile.
    const setViewAs = (role) => {
        const next = role && role !== 'owner' && VIEW_AS_ROLES.includes(role) ? role : null
        try {
            if (next) localStorage.setItem('view_as', next)
            else localStorage.removeItem('view_as')
        } catch { /* quota — режим просто не переживёт reload */ }
        setUser(prev => {
            if (!prev) return prev
            const real = prev.realRole || prev.role
            if (real !== 'owner') return prev
            return next ? { ...prev, realRole: 'owner', role: next } : { ...prev, role: 'owner', realRole: undefined }
        })
    }

    const updateUser = (updates) => {
        setUser(prev => {
            if (!prev) return prev
            const next = { ...prev, ...updates }
            // [VIEW-AS-PERSIST] в кэш пишем РЕАЛЬНЫЙ профиль (без view-as оверлея),
            // иначе после reload владелец навсегда "превратился" бы в просматриваемую роль
            const real = next.realRole || next.role
            const { realRole, ...cacheable } = next
            localStorage.setItem('user_profile', JSON.stringify({ ...cacheable, role: real }))
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
        <AuthContext.Provider value={{ user, isAuthenticated, loading, roleSwitching, login, register, logout, updateUser, updatePreferences, setViewAs }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext