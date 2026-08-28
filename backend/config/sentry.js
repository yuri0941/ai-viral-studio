// [security-hardening Б5-З6] Sentry для backend. Без SENTRY_DSN — молча выключен.
// beforeSend вырезает PII и секреты: authorization/cookie-заголовки, тела запросов, ключи.
import * as Sentry from '@sentry/node'

let enabled = false

const SENSITIVE_KEYS = /password|token|secret|key|authorization|cookie|session/i

function scrub(value, depth = 0) {
    if (value == null || depth > 5) return value
    if (typeof value === 'string') return value.length > 500 ? value.slice(0, 500) + '…' : value
    if (Array.isArray(value)) return value.map(v => scrub(v, depth + 1))
    if (typeof value === 'object') {
        const out = {}
        for (const [k, v] of Object.entries(value)) {
            out[k] = SENSITIVE_KEYS.test(k) ? '[Filtered]' : scrub(v, depth + 1)
        }
        return out
    }
    return value
}

export function initSentry() {
    const dsn = (process.env.SENTRY_DSN || '').trim()
    if (!dsn) return false // молча off
    try {
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            sendDefaultPii: false,
            beforeSend(event) {
                if (event.request) {
                    delete event.request.cookies
                    if (event.request.headers) {
                        for (const h of Object.keys(event.request.headers)) {
                            if (SENSITIVE_KEYS.test(h)) event.request.headers[h] = '[Filtered]'
                        }
                    }
                    if (event.request.data) event.request.data = scrub(event.request.data)
                }
                if (event.user) event.user = { id: event.user.id } // только id, без email/username
                return event
            },
        })
        enabled = true
        console.log('[Sentry] backend инициализирован (DSN из env)')
        return true
    } catch (err) {
        console.warn('[Sentry] init failed, продолжаем без него:', err.message)
        return false
    }
}

export function sentryErrorHandler(app) {
    if (!enabled) return
    Sentry.setupExpressErrorHandler(app)
}

export function captureError(err, context = {}) {
    if (!enabled) return
    Sentry.withScope(scope => {
        for (const [k, v] of Object.entries(context)) scope.setExtra(k, typeof v === 'string' ? v : JSON.stringify(v)?.slice(0, 300))
        Sentry.captureException(err)
    })
}

export function sentryEnabled() { return enabled }
