import rateLimit from 'express-rate-limit'
import { BlockedIP } from '../models/BlockedIP.js'

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for']
    if (forwarded) return String(forwarded).split(',')[0].trim()
    return req.ip || 'unknown'
}

function isWhitelisted(req) {
    const ownerIp = process.env.OWNER_IP
    if (!ownerIp) return false
    return getClientIp(req) === ownerIp
}

export async function checkBlockedIP(req, res, next) {
    try {
        if (isWhitelisted(req)) return next()
        const ip = getClientIp(req)
        const blocked = await BlockedIP.findOne({ ip, expiresAt: { $gt: new Date() } }).lean()
        if (blocked) {
            console.warn(`[RateLimit] Blocked IP: ${ip}`)
            return res.status(403).json({ success: false, error: 'IP заблокирован', reason: blocked.reason })
        }
        next()
    } catch (err) {
        next(err)
    }
}

async function blockIP(ip, reason = 'Превышен лимит запросов') {
    try {
        await BlockedIP.create({
            ip,
            reason,
            bannedAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            count: 1000,
        })
    } catch (err) {
        console.error('[rateLimiter] blockIP failed:', err.message)
    }
}

function tokenPresent(req) {
    const auth = req.headers.authorization
    return auth && auth.startsWith('Bearer ')
}

// Публичные роуты, которые не должны лимитироваться при загрузке сайта
const PUBLIC_API_ROUTES = [
    '/api/health',
    '/api/launch',
    '/api/owner/legal-info/public',
    '/api/public',
    '/api/public/legal-info',
    '/api/plans',
    '/api/geo/currency',
]

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
        if (isWhitelisted(req)) return 100000
        if (tokenPresent(req)) return 1000
        return 10000 // [HOTFIX-2026-08-09] было 100 — слишком мало для загрузки страницы
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    skip: (req) => {
        if (req.path === '/health' || req.path === '/api/health') return true
        return PUBLIC_API_ROUTES.some(route => req.path.startsWith(route))
    },
    handler: async (req, res, next) => {
        console.warn(`[RateLimit] /api limit exceeded: ${getClientIp(req)} ${req.method} ${req.path}`)
        res.status(429).json({ success: false, error: 'Слишком много запросов. Попробуйте позже.' })
    },
})

export const omegaChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    handler: async (req, res, next) => {
        const ip = getClientIp(req)
        console.warn(`[RateLimit] /api/omega/chat limit exceeded: ${ip}`)
        await blockIP(ip, 'Превышен лимит /api/omega/chat')
        res.status(429).json({ success: false, error: 'Лимит сообщений исчерпан. Попробуйте позже.' })
    },
})

export const authLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    handler: (req, res) => {
        console.warn(`[RateLimit] login limit exceeded: ${getClientIp(req)}`)
        res.status(429).json({ success: false, error: 'Слишком много попыток входа. Попробуйте позже.' })
    },
})

export const authRegisterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    handler: (req, res) => {
        console.warn(`[RateLimit] register limit exceeded: ${getClientIp(req)}`)
        res.status(429).json({ success: false, error: 'Слишком много попыток регистрации. Попробуйте позже.' })
    },
})

// Autoban middleware: counts requests per IP per minute and blocks if >1000
const ipMinCounter = new Map()
setInterval(() => {
    const cutoff = Date.now() - 60 * 1000
    for (const [ip, data] of ipMinCounter.entries()) {
        if (data.windowStart < cutoff) ipMinCounter.delete(ip)
    }
}, 60 * 1000)

export async function autoBanMiddleware(req, res, next) {
    try {
        if (isWhitelisted(req)) return next()
        const ip = getClientIp(req)
        const now = Date.now()
        const entry = ipMinCounter.get(ip) || { windowStart: now, count: 0 }
        if (now - entry.windowStart > 60 * 1000) {
            entry.windowStart = now
            entry.count = 0
        }
        entry.count++
        ipMinCounter.set(ip, entry)
        if (entry.count > 1000) {
            await blockIP(ip, 'Более 1000 запросов в минуту')
            return res.status(403).json({ success: false, error: 'IP заблокирован за DDoS' })
        }
        next()
    } catch (err) {
        next(err)
    }
}
