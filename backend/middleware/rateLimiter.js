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
    // [CI-FOUNDATION] нормализация: localhost может приходить как ::1 / ::ffff:127.0.0.1;
    // сравниваем по IPv4-форме (равенство по-прежнему точное, whitelist не расширяется)
    const norm = (ip) => String(ip || '').replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1')
    return norm(getClientIp(req)) === norm(ownerIp)
}

// [fix/ratelimit-vpn] нормализация email для ключа лимита
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase()
}

// [fix/ratelimit-vpn] userId из JWT payload БЕЗ верификации — только для бакета rate-limit;
// верификацию выполняет protect дальше по цепочке. Худший случай — атакующий выберет себе бакет.
function userIdFromToken(req) {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) return null
    try {
        const part = auth.slice(7).split('.')[1]
        const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
        return payload.id || payload._id || payload.sub || null
    } catch {
        return null
    }
}

// [fix/ratelimit-vpn] auth-эндпоинты (login/register/forgot-password): ключ = IP + email.
// Общий IP VPN/оператора больше не режет разных пользователей друг друга.
function authKeyGenerator(req) {
    const email = normalizeEmail(req.body?.email)
    return email ? `${getClientIp(req)}|${email}` : getClientIp(req)
}

// [fix/ratelimit-vpn] авторизованные эндпоинты (генерации, тикеты): ключ = userId,
// IP — только fallback для анонимных (для публичных форм — IP + email).
function userKeyGenerator(req) {
    const userId = req.user?.id || req.user?._id || userIdFromToken(req)
    if (userId) return `user:${userId}`
    const email = normalizeEmail(req.body?.email)
    return email ? `${getClientIp(req)}|${email}` : getClientIp(req)
}

// [fix/ratelimit-vpn] 429-ответ: RU/EN + через сколько минут повторить
function retryAfterMinutes(req) {
    const resetTime = req.rateLimit?.resetTime
    if (!resetTime) return null
    return Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 60000))
}

function handler429(routeLabel, ruBase, enBase) {
    return (req, res) => {
        console.warn(`[RateLimit] ${routeLabel} limit exceeded: ${getClientIp(req)}`)
        const mins = retryAfterMinutes(req)
        const retryRu = mins ? ` Повторите через ~${mins} мин.` : ' Попробуйте позже.'
        const retryEn = mins ? ` Try again in ~${mins} min.` : ' Try again later.'
        res.status(429).json({ success: false, error: `${ruBase}${retryRu} / ${enBase}${retryEn}` })
    }
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

// Публичные роуты, которые не должны лимитироваться при загрузке сайта
const PUBLIC_API_ROUTES = [
    '/api/health',
    '/api/launch',
    '/api/owner/legal-info/public',
    '/api/public',
    '/api/public/legal-info',
    '/api/plan-config',
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
    keyGenerator: userKeyGenerator, // [fix/ratelimit-vpn] с токеном — бакет по userId, не по общему IP VPN
    skip: (req) => {
        if (req.path === '/health' || req.path === '/api/health') return true
        return PUBLIC_API_ROUTES.some(route => req.path.startsWith(route))
    },
    handler: handler429('/api', 'Слишком много запросов.', 'Too many requests.'),
})

export const omegaChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKeyGenerator, // [fix/ratelimit-vpn] по userId из токена; IP — fallback
    // [fix/ratelimit-vpn] blockIP (бан IP на 1ч) убран: за общим IP VPN пострадали бы другие пользователи — достаточно 429
    handler: handler429('/api/omega/chat', 'Лимит сообщений исчерпан.', 'Message limit reached.'),
})

export const authLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authKeyGenerator, // [fix/ratelimit-vpn] IP + email
    handler: handler429('login', 'Слишком много попыток входа.', 'Too many login attempts.'),
})

export const authRegisterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authKeyGenerator, // [fix/ratelimit-vpn] IP + email
    handler: handler429('register', 'Слишком много попыток регистрации.', 'Too many registration attempts.'),
})

// [security-hardening Б5-З5] сброс пароля — 5 запросов/час на пару IP+email (anti-abuse почты)
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authKeyGenerator, // [fix/ratelimit-vpn] было голый IP → IP + email
    handler: handler429('password-reset', 'Слишком много запросов на сброс пароля.', 'Too many password reset requests.'),
})

// [security-hardening Б5-З5] создание support-тикетов — 10/15 мин на пользователя (anti-spam)
export const supportTicketLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKeyGenerator, // [fix/ratelimit-vpn] авторизованный — по userId; публичная форма — IP + email
    handler: handler429('support ticket', 'Слишком много обращений в поддержку.', 'Too many support tickets.'),
})

function tokenPresent(req) {
    const auth = req.headers.authorization
    return auth && auth.startsWith('Bearer ')
}

// Autoban middleware: counts requests per IP per minute and blocks if >1000 (anti-DDoS, не сессионная привязка)
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
            await BlockedIP.create({
                ip,
                reason: 'Более 1000 запросов в минуту',
                bannedAt: new Date(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                count: 1000,
            }).catch(err => console.error('[rateLimiter] blockIP failed:', err.message))
            return res.status(403).json({ success: false, error: 'IP заблокирован за DDoS' })
        }
        next()
    } catch (err) {
        next(err)
    }
}
