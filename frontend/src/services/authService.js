import { API_URL } from '../config.js'

const AUTH_API_URL = `${API_URL}/auth`

const authService = {
    async register(name, email, password, turnstileToken = '') {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            const response = await fetch(`${AUTH_API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, timezone, turnstileToken }),
            })

            const data = await response.json()

            if (!response.ok) {
                return { success: false, message: data.message || 'Ошибка регистрации' }
            }

            if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
            }

            return { success: true, data }
        } catch (error) {
            console.error('Register error:', error)
            return { success: false, message: 'Ошибка сервера' }
        }
    },

    async login(email, password, turnstileToken = '') {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, timezone, turnstileToken }),
            })

            const data = await response.json()

            if (!response.ok) {
                return { success: false, message: data.message || 'Ошибка входа' }
            }

            if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
            }

            return { success: true, data }
        } catch (error) {
            console.error('Login error:', error)
            return { success: false, message: 'Ошибка сервера' }
        }
    },

    logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    },

    getCurrentUser() {
        const user = localStorage.getItem('user')
        return user ? JSON.parse(user) : null
    },

    getToken() {
        return localStorage.getItem('token')
    }
}

// ИСПРАВЛЕНО: именованный экспорт + дефолтный
export { authService }
export default authService