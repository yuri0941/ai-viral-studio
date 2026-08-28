import { captureError } from '../config/sentry.js' // [security-hardening Б5-З6]
import { track5xx } from '../services/securityAlerts.js' // [security-hardening Б5-З6]

export const errorHandler = (err, req, res, next) => {
    let error = { ...err }
    error.message = err.message

    // Log error
    console.error(err)

    // [fix/json-parse-400] body-parser: битое JSON-тело → 400 RU/EN + лог эндпоинта и сырого тела,
    // чтобы в прод-логе было видно, КТО прислал невалидный JSON
    if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
        const raw = typeof err.body === 'string' ? err.body.slice(0, 200) : ''
        console.warn(`[400 JSON-PARSE] ${req.method} ${req.originalUrl || req.url} — невалидное тело: ${raw}`)
        return res.status(400).json({
            status: 'error',
            message: 'Некорректный формат данных запроса (JSON). / Invalid request body (malformed JSON).',
        })
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found'
        error = { ...error, message, statusCode: 404 }
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered'
        error = { ...error, message, statusCode: 400 }
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ')
        error = { ...error, message, statusCode: 400 }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token'
        error = { ...error, message, statusCode: 401 }
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired'
        error = { ...error, message, statusCode: 401 }
    }

    // [security-hardening Б5-З6] 5xx → Sentry (без PII) + TG-алерт владельцу при волне (кулдаун 10 мин)
    const statusCode = error.statusCode || 500
    if (statusCode >= 500) {
        track5xx(req.originalUrl || req.url, statusCode)
        captureError(err, { path: req.originalUrl, method: req.method })
    }

    res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
}