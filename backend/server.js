import './config/env.js'

// ============ ИМПОРТЫ ============
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { connectDB, isConnected } from './config/database.js'
import { errorHandler } from './middleware/errorHandler.js'
import { rollbar } from './services/rollbarService.js'
import { alertOwner } from './services/ownerBot.js'
import {
    registerLimiter,
    loginLimiter,
    omegaLimiter,
    usersLimiter,
    adminLimiter,
    generalLimiter
} from './middleware/rateLimiter.js'

// Routes
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import analyticsRoutes from './routes/analytics.js'
import schedulerRoutes from './routes/scheduler.js'
import userRoutes from './routes/users.js'
import youtubeRoutes from './routes/youtube.js'
import paymentRoutes from './routes/payments.js'
import ownerRoutes from './routes/owner.js'
import omegaRoutes from './routes/omega.js'
import adRequestRoutes from './routes/adRequests.js'
import subscriptionRoutes from './routes/subscriptions.js'
import invoiceRoutes from './routes/invoices.js'
import ownerRequisitesRoutes from './routes/ownerRequisites.js'
import ownerLegalInfoRoutes from './routes/ownerLegalInfo.js'
import { getPublicLegalInfo } from './controllers/ownerLegalInfoController.js'
import yookassaRoutes from './routes/yookassa.js'
import stripeRoutes from './routes/stripe.js'
import emailRoutes from './routes/email.js'
import adminRoutes from './routes/admin.js'
import { seedAgents } from './services/omegaAgents/agentsRegistry.js'
import { startSelfImprovementCron } from './services/omegaBrain/selfImprovement.js'
import { startAutopilot, stopAutopilot } from './services/autoPilot.js'
import { startSelfHealing, stopSelfHealing } from './services/selfHealing.js'

const app = express()
const PORT = parseInt(process.env.PORT) || 5000

// Connect to database before starting server
await connectDB()

if (!isConnected) {
    console.error('❌ Cannot start server without MongoDB connection')
    if (process.env.NODE_ENV === 'production') {
        process.exit(1)
    }
    console.warn('⚠️  Continuing in fallback/demo mode (development only)')
} else {
    // Seed OMEGA agents and start self-improvement loop
    try {
        await seedAgents()
        startSelfImprovementCron()
    } catch (err) {
        console.warn('[server] OMEGA init failed:', err.message)
    }
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

// Rate limiting (middleware/rateLimiter.js)
app.use('/api/omega', omegaLimiter)
app.use('/api/users', usersLimiter)
app.use('/api/admin', adminLimiter)
app.use('/api/', generalLimiter)
app.use('/api/auth/register', registerLimiter)
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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    })
})

// Public legal info endpoint (for privacy policy, terms, footer)
app.get('/api/public/legal-info', getPublicLegalInfo)

// AI providers status (for Owner Dashboard API Keys tab)
app.get('/api/admin/ai-providers/status', (req, res) => {
    res.json({
        groq: !!process.env.GROQ_API_KEY,
        openrouter: !!process.env.OPENROUTER_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        hf: !!(process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY),
        cloudflare: !!(process.env.CLOUDFLARE_API_KEY && process.env.CLOUDFLARE_ACCOUNT_ID),
        pollinations: true,
    })
})

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
app.use('/api/admin', adminRoutes)

// Error handling
app.use((err, req, res, next) => {
    rollbar.error(err, req)
    alertOwner(`🚨 ОШИБКА 500!\n📍 ${req.method} ${req.path}\n❌ ${err.message}\n⏰ ${new Date().toLocaleString('ru-RU')}`)
        .catch(() => {})
    errorHandler(err, req, res, next)
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' })
})

app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`)
    console.log(`✅ MongoDB connected: ${isConnected ? 'Yes' : 'No'}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔑 JWT Secret loaded: ${process.env.JWT_SECRET ? '✅ Yes' : '❌ No'}`)
    console.log('🤖 AI ENV CHECK:', {
        groq: !!process.env.GROQ_API_KEY,
        openrouter: !!process.env.OPENROUTER_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        github: !!process.env.GITHUB_API_KEY,
        huggingface: !!process.env.HUGGINGFACE_API_KEY,
        cloudflare: !!process.env.CLOUDFLARE_API_KEY,
        fireworks: !!process.env.FIREWORKS_API_KEY,
        mistral: !!process.env.MISTRAL_API_KEY,
        cohere: !!process.env.COHERE_API_KEY,
    })
    console.log(`🤖 AI Providers enabled: Groq=${process.env.GROQ_ENABLED}, OpenRouter=${process.env.OPENROUTER_ENABLED}, DeepSeek=${process.env.DEEPSEEK_ENABLED}`)
    console.log(`📺 YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅ Connected' : '❌ No key'}`)

    // Start background services
    if (isConnected) {
        try {
            startAutopilot()
            startSelfHealing()
            console.log('🤖 AutoPilot cron started')
            console.log('🛡️ Self-Healing cron started')
        } catch (err) {
            console.warn('[server] failed to start background services:', err.message)
        }
    }
})

process.on('SIGTERM', () => {
    stopAutopilot()
    stopSelfHealing()
    process.exit(0)
})

process.on('SIGINT', () => {
    stopAutopilot()
    stopSelfHealing()
    process.exit(0)
})
