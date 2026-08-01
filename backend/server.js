import './config/env.js'

// ============ ИМПОРТЫ ============
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { connectDB, isConnected } from './config/database.js'
import { errorHandler } from './middleware/errorHandler.js'

// Routes
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import analyticsRoutes from './routes/analytics.js'
import schedulerRoutes from './routes/scheduler.js'
import userRoutes from './routes/users.js'
import youtubeRoutes from './routes/youtube.js'  // ← НОВОЕ: YouTube API
import paymentRoutes from './routes/payments.js'  // ← НОВОЕ: Платежи
import ownerRoutes from './routes/owner.js'  // ← НОВОЕ: Owner Dashboard API
import omegaRoutes from './routes/omega.js'  // ← НОВОЕ: OMEGA Core API
import adRequestRoutes from './routes/adRequests.js'  // ← НОВОЕ: AdRequests / Client chat
import subscriptionRoutes from './routes/subscriptions.js'  // ← P10: Подписки
import invoiceRoutes from './routes/invoices.js'  // ← P10: Счета
import ownerRequisitesRoutes from './routes/ownerRequisites.js'  // ← P10: Реквизиты
import ownerLegalInfoRoutes from './routes/ownerLegalInfo.js'  // ← Legal Shield: Owner legal info
import { getPublicLegalInfo } from './controllers/ownerLegalInfoController.js'  // ← Public legal info
import yookassaRoutes from './routes/yookassa.js'  // ← P10: ЮKassa
import stripeRoutes from './routes/stripe.js'  // ← P10: Stripe (выключено по умолчанию)
import emailRoutes from './routes/email.js'  // ← P10: Email
import pushRoutes from './routes/push.js'  // Push notifications

const app = express()
app.set('trust proxy', 1)
const PORT = parseInt(process.env.PORT) || 10000

// Connect to database before starting server
await connectDB()

if (!isConnected) {
    console.error('❌ Cannot start server without MongoDB connection')
    if (process.env.NODE_ENV === 'production') {
        process.exit(1)
    }
    console.warn('⚠️  Continuing in fallback/demo mode (development only)')
}

// CORS must be first — before any route or body parser
// CORS: explicit origins + dynamic Cloudflare Pages subdomains
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ai-viral-studio.pages.dev',
    process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (curl, server-to-server, mobile apps)
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        // Allow any *.pages.dev subdomain
        if (/^https:\/\/[^/]+\.pages\.dev$/.test(origin)) return callback(null, true)
        callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}))

// Preflight for all routes
app.options('*', cors())

// Helmet after CORS so security headers apply without blocking preflight
app.use(helmet())

// Body parsing — BEFORE routes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(compression())

// Rate limiting (relaxed in development)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 10000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/', limiter)

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Слишком много попыток регистрации. Попробуйте позже.',
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/auth/register', registerLimiter)

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Слишком много попыток входа. Попробуйте позже.',
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/auth/login', loginLimiter)

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        version: '1.0.0'
    })
})

// Public legal info endpoint (for privacy policy, terms, footer)
app.get('/api/public/legal-info', getPublicLegalInfo)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/users', userRoutes)
app.use('/api/youtube', youtubeRoutes)  // ← НОВОЕ: YouTube роуты
app.use('/api/payments', paymentRoutes)  // ← НОВОЕ: Платежи
app.use('/api/owner', ownerRoutes)  // ← НОВОЕ: Owner Dashboard API
app.use('/api/omega', omegaRoutes)  // ← НОВОЕ: OMEGA Core API
app.use('/api/ad-requests', adRequestRoutes)  // ← НОВОЕ: AdRequests / Client chat
app.use('/api/subscriptions', subscriptionRoutes)  // ← P10: Подписки
app.use('/api/invoices', invoiceRoutes)  // ← P10: Счета
app.use('/api/owner-requisites', ownerRequisitesRoutes)  // ← P10: Реквизиты
app.use('/api/owner/legal-info', ownerLegalInfoRoutes)  // ← Legal Shield: Owner legal info
app.use('/api/yookassa', yookassaRoutes)  // ← P10: ЮKassa
app.use('/api/stripe', stripeRoutes)  // ← P10: Stripe (выключено по умолчанию)
app.use('/api/email', emailRoutes)  // ← P10: Email
app.use('/api/push', pushRoutes)  // Push notifications

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' })
})

const server = app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`)
    console.log(`✅ MongoDB connected: ${isConnected ? 'Yes' : 'No'}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔑 JWT Secret loaded: ${process.env.JWT_SECRET ? '✅ Yes' : '❌ No'}`)
    console.log(`🤖 AI Providers: Groq=${process.env.GROQ_ENABLED}, OpenRouter=${process.env.OPENROUTER_ENABLED}, DeepSeek=${process.env.DEEPSEEK_ENABLED}`)
    console.log(`📺 YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅ Connected' : '❌ No key'}`)
})

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    server.close(() => {
        console.log('Process terminated')
        process.exit(0)
    })
})

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully')
    server.close(() => {
        console.log('Process terminated')
        process.exit(0)
    })
})
