import './config/env.js'

import express from 'express'
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

await connectDB()

if (!isConnected) {
    console.error('❌ Cannot start server without MongoDB connection')
    if (process.env.NODE_ENV === 'production') {
        process.exit(1)
    }
    console.warn('⚠️  Continuing in fallback/demo mode (development only)')
} else {
    try {
        await seedAgents()
        startSelfImprovementCron()
    } catch (err) {
        console.warn('[server] OMEGA init failed:', err.message)
    }
}

// ========== РУЧНОЙ CORS (нативный Node.js) ==========
const allowedOrigin = 'https://ai-viral-studio.pages.dev'

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Vary', 'Origin')

    if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
    }
    next()
})

// Helmet временно отключен — проверим CORS без него
// app.use(helmet())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(compression())

// Rate limiting
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

app.get('/api/public/legal-info', getPublicLegalInfo)

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

app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/users', userRoutes)
app.use('/api/youtube', youtubeRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/owner', ownerRoutes)
app.use('/api/omega', omegaRoutes)
app.use('/api/ad-requests', adRequestRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/owner-requisites', ownerRequisitesRoutes)
app.use('/api/owner/legal-info', ownerLegalInfoRoutes)
app.use('/api/yookassa', yookassaRoutes)
app.use('/api/stripe', stripeRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/admin', adminRoutes)

app.use((err, req, res, next) => {
    rollbar.error(err, req)
    alertOwner(`🚨 ОШИБКА 500!\n📍 ${req.method} ${req.path}\n❌ ${err.message}\n⏰ ${new Date().toLocaleString('ru-RU')}`)
        .catch(() => { })
    errorHandler(err, req, res, next)
})

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