// [OWNER-REMOTE-CONTROL] рубильник техработ: не-владельцам API отдаёт 503 { maintenance: true }.
// Владелец и админ НЕУЯЗВИМЫ (проверка по JWT + роли в БД). Флаг — OwnerSettings.maintenanceMode,
// hot-reload с кэшем ≤60 сек (getOwnerFlags), без redeploy.
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { getOwnerFlags } from '../models/OwnerSettings.js'

// Пути, которые работают даже в техработах:
// - логин (владельцу нужно войти), health, webhook'и платежей (ЮKassa должна выставлять подписки)
const EXEMPT_PREFIXES = [
    '/api/auth/login',
    '/api/health',
    '/api/yookassa/webhook',
    '/api/payments/webhook',
]

async function resolveRequestRole(req) {
    try {
        const header = req.headers.authorization || ''
        if (!header.startsWith('Bearer ')) return null
        const token = header.slice(7)
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        const userId = payload?.id || payload?.userId || payload?._id
        if (!userId) return null
        const user = await User.findById(userId).select('role').lean()
        return user?.role || null
    } catch {
        return null
    }
}

export async function maintenanceMode(req, res, next) {
    try {
        const { maintenanceMode: on } = await getOwnerFlags()
        if (!on) return next()

        if (EXEMPT_PREFIXES.some(p => req.path === p || req.path.startsWith(`${p}/`))) return next()

        const role = await resolveRequestRole(req)
        if (role === 'owner' || role === 'admin') return next()

        return res.status(503).json({
            success: false,
            maintenance: true,
            code: 'maintenance',
            error: 'Технические работы, скоро вернёмся',
        })
    } catch (e) {
        // Сбой чтения флага НЕ должен заблокировать сервис
        console.warn('[maintenanceMode] flag check failed:', e.message)
        return next()
    }
}

export default maintenanceMode
