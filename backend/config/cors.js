// [TG-FREETEXT-HOTFIX+] CORS whitelist: env-first + sane defaults; логируем отклонённый origin
const DEFAULT_ORIGINS = [
    'https://aiviral-studio.ru',
    'https://www.aiviral-studio.ru',
    'https://ai-viral-studio.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000'
]

const FRONTEND_ORIGIN = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null
const CORS_FROM_ENV = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)

export const ALLOWED_ORIGINS = Array.from(new Set([
    ...DEFAULT_ORIGINS,
    ...(FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : []),
    ...CORS_FROM_ENV
]))

export const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true)
        } else {
            console.warn(`[CORS] denied origin: ${origin}`)
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}
