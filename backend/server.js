import './config/env.js'

// ============ ИМПОРТЫ ============
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { connectDB, isConnected } from './config/database.js'
import { connectRedis } from './config/redisClient.js' // [P24] fixed: Redis import
import { errorHandler } from './middleware/errorHandler.js'
import { protect } from './middleware/auth.js' // [HOTFIX-2026-08-04] added — protect for fallback routes
import { seedAgents } from './services/omegaAgents/agentsRegistry.js'
import bot from './services/ownerBot.js'
import { initOwnerBot } from './services/ownerBot.js'
import { initOmegaBot } from './services/omegaBot.js'
import { Campaign } from './models/Campaign.js'
import Ticket from './models/Ticket.js'
import User from './models/User.js'

import { detectWhiteLabel, whiteLabelHeaders, getWhiteLabelConfig } from './middleware/whiteLabel.js'

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
import { detectCurrency } from './controllers/geoController.js'  // [PAYMENT-v5.2] added
import yookassaRoutes from './routes/yookassa.js'  // ← P10: ЮKassa
import stripeRoutes from './routes/stripe.js'  // ← P10: Stripe (выключено по умолчанию)
import emailRoutes from './routes/email.js'  // ← P10: Email
import pushRoutes from './routes/push.js'  // Push notifications
import whiteLabelRoutes from './routes/whiteLabel.js'  // ← White-Label Agency
import projectWorkspaceRoutes from './routes/projectWorkspace.js'  // ← Multi-Project Workspaces
import omegaAPIRoutes from './routes/api/v1/omegaAPI.js'  // ← B2B2B OMEGA API
import paypalRoutes from './routes/paypal.js'  // ← PayPal
import launchRoutes from './routes/launch.js'  // ← Product Hunt waitlist
import demoRoutes from './routes/demo.js'  // ← Pre-launch viral demo hooks
import integrationsRoutes from './routes/integrations.js'  // ← External integrations
import plansRoutes from './routes/plans.js'  // [PLANS-SYNC] added
import checkoutRoutes from './routes/checkout.js'  // [PAYMENT-v5.2] added
import qrRoutes from './routes/qr.js'  // ← P11: QR codes
import printRoutes from './routes/print.js'  // ← P11: Print orders
import bookingRoutes from './routes/booking.js'  // ← P11: Studio booking
import franchiseRoutes from './routes/franchise.js'  // ← P11: Franchise generator
import fleetRoutes from './routes/fleet.js'  // ← P11: Fleet dashboard
import qrController from './controllers/qrController.js'  // ← P11: QR redirect
import deliveryRoutes from './routes/delivery.js'  // ← P11: Delivery deep links
import monitoringRoutes from './routes/monitoring.js'  // ← P12: Self-healing + crisis + self-reflection
import gamificationRoutes from './routes/gamification.js'  // ← P13: Gamification + AI vs Human
import boardroomRoutes from './routes/boardroom.js'  // ← P14: AI Boardroom
import businessSpawnerRoutes from './routes/businessSpawner.js'  // ← P14: Business Spawning
import roadmapRoutes from './routes/roadmap.js'  // ← Public roadmap + voting
import adminRoutes from './routes/admin.js'  // Admin + emergency stop
import selfImprovementRoutes from './routes/selfImprovement.js'  // ← P15: Self-improvement + churn + niche intelligence
import neuroSalesRoutes from './routes/neuroSales.js'  // [P18] added: Neuro-Sales psychotypes
import challengeRoutes from './routes/challenges.js'  // [P20] added: OMEGA Challenge
import uploadRoutes from './routes/upload.js'  // [P21] added: image upload optimization
import scheduledPostsRoutes from './routes/scheduledPosts.js'  // [v6.0-fix] added: missing import
import approvalRoutes from './routes/approval.js'  // [v6.5] added: OMEGA approval queue
import repurposingRoutes from './routes/repurposing.js'  // [v6.5] added: content repurposing engine
import devStudioRoutes from './routes/devStudio.js'  // [v6.6] added: OMEGA DevStudio
import swarmRoutes from './routes/swarm.js'  // [v6.6] added: OMEGA Swarm
import autoFixRoutes from './routes/autoFix.js'  // [v6.6] added: AutoFix Agent
import researchRoutes from './routes/research.js'  // [v6.6] added: Web Research Engine
import versionRoutes from './routes/version.js'  // [v6.5.5] added: version API
import fallbackRoutes from './routes/fallbackRoutes.js'  // [v6.0] added: structured fallback routes

// [v6.0-fix] added: fallback routers for expected frontend endpoints without mock data
import analyticsFallbackRoutes from './routes/analyticsRoutes.js'
import ownerFallbackRoutes from './routes/ownerRoutes.js'
import omegaFallbackRoutes from './routes/omegaRoutes.js'
import subscriptionFallbackRoutes from './routes/subscriptionRoutes.js'
import financeFallbackRoutes from './routes/financeRoutes.js'
import invoiceFallbackRoutes from './routes/invoiceRoutes.js'
import quotaFallbackRoutes from './routes/quotaRoutes.js'
import selfImprovementFallbackRoutes from './routes/selfImprovementRoutes.js'

const app = express()
app.set('trust proxy', 1)

import http from 'http'
import cron from 'node-cron'
import { initSocket } from './socket.js'
import { startAutopilot } from './services/autoPilot.js'
import { startAutoReportCron } from './services/autoReportService.js'
import { startFailoverCron } from './services/failoverService.js'
import { startSelfHealing } from './services/selfHealing.js'
import { startSelfReflectionCron } from './services/selfReflection.js'
import { startReflectionCron as startNeuralReflectionCron } from './ai/omega/selfReflection.js'
import { startSelfLearningCrons } from './ai/omega/selfLearningEngine.js'
import { startWebResearchCrons } from './ai/omega/webResearchEngine.js'
import { runEvolutionCron } from './services/templateEvolution.js'
import { resolveABTests } from './services/abAutoLearning.js'
import { createOmegaBackend } from './ai/omega/index.js'
import { startSubscriptionCron } from './services/subscriptionCron.js'
import { startAutoPublisher } from './services/autoPublisher.js'  // [SOCIAL-v5.1] added

// Connect to database before starting server
await connectDB()
await connectRedis() // [P24] fixed: connect Redis with in-memory fallback

// [MASTER-v5.6-CONT] init Telegram bots after DB connect
initOwnerBot()
initOmegaBot()

// [MASTER-v5.0] added: auto-audit after DB connect
if (isConnected) {
    try {
        const { autoAuditSystem } = await import('./services/autoAudit.js')
        await autoAuditSystem()
    } catch (err) {
        console.warn('[server] auto-audit failed:', err.message)
    }
}

if (!isConnected) {
    console.error('❌ Cannot start server without MongoDB connection')
    if (process.env.NODE_ENV === 'production') {
        process.exit(1)
    }
    console.warn('⚠️  Continuing in fallback mode (development only)')
}

// Start OMEGA AutoPilot cron (it checks enabled owners internally)
startAutopilot()
startAutoReportCron()
startFailoverCron()
startSelfHealing()
startSelfReflectionCron()
startNeuralReflectionCron()
startSelfLearningCrons()
startWebResearchCrons()

// P15: Self-improvement crons
if (isConnected) {
    // Daily at 03:00 — analyze template CTR, archive losers, promote proven
    cron.schedule('0 3 * * *', async () => {
        try {
            const result = await runEvolutionCron()
            console.log('[cron] templateEvolution:', result)
        } catch (err) {
            console.error('[cron] templateEvolution failed:', err.message)
        }
    })

    // Every 6 hours — resolve finished A/B tests and learn from results
    cron.schedule('0 */6 * * *', async () => {
        try {
            const result = await resolveABTests()
            console.log('[cron] abAutoLearning:', result)
        } catch (err) {
            console.error('[cron] abAutoLearning failed:', err.message)
        }
    })

    console.log('🧠 Self-improvement crons scheduled')
}

// [MASTER-v5.0] added: subscription lifecycle cron
startSubscriptionCron()

// [SOCIAL-v5.1] added: auto-publishing cron
startAutoPublisher()

// Seed default OMEGA agents after DB connection
if (isConnected) {
    try {
        await seedAgents()
        console.log('🤖 Default OMEGA agents seeded')
    } catch (err) {
        console.warn('[server] seedAgents failed:', err.message)
    }

    // Initialize OMEGA backend core (autonomy services are owner-requested only)
    try {
        const omegaCore = await createOmegaBackend()
        // [v5.9-CONT] removed: do not auto-start autonomy services for non-owner
        // omegaCore.startAutonomyServices()
        global.omegaCore = omegaCore
        console.log('🧠 OMEGA core initialized (autonomy services require owner start)')
    } catch (err) {
        console.warn('[server] OMEGA core init failed:', err.message)
    }
}

// CORS must be first — before any route or body parser
// CORS: explicit origins + dynamic Cloudflare Pages subdomains
// [HOTFIX-2026-08-04] added — include aiviral-studio.ru, PATCH, explicit headers
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://ai-viral-studio.pages.dev',
            'https://aiviral-studio.ru',
            process.env.FRONTEND_URL,
        ].filter(Boolean)
        // Allow requests with no origin (curl, server-to-server, mobile apps)
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        // Allow any *.pages.dev subdomain
        if (/^https:\/\/[^/]+\.pages\.dev$/.test(origin)) return callback(null, true)
        callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}

app.use(cors(corsOptions))

// Preflight for all routes
app.options('*', cors(corsOptions))

// Helmet after CORS so security headers apply without blocking preflight
app.use(helmet())

// Body parsing — BEFORE routes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(compression())

// Telegram webhook handlers
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV === 'production') {
    app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, express.json(), (req, res) => {
        if (global.ownerBot && typeof global.ownerBot.processUpdate === 'function') {
            global.ownerBot.processUpdate(req.body)
        }
        res.sendStatus(200)
    })
}

app.post('/webhook/owner', express.json(), (req, res) => {
    if (global.ownerBot && typeof global.ownerBot.processUpdate === 'function') {
        global.ownerBot.processUpdate(req.body)
    }
    res.sendStatus(200)
})

app.post('/webhook/omega', express.json(), (req, res) => {
    if (global.omegaBot && typeof global.omegaBot.processUpdate === 'function') {
        global.omegaBot.processUpdate(req.body)
    }
    res.sendStatus(200)
})

// Rate limiting (relaxed in development)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 10000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/', limiter)

// White-label detection — applies to all requests so custom branding can be detected
app.use(detectWhiteLabel)
app.use(whiteLabelHeaders)

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

// [PAYMENT-v5.2] added: geo-currency detection
app.get('/api/geo/currency', detectCurrency)

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
app.use('/api/omega', devStudioRoutes)  // [v6.6] added: OMEGA DevStudio
app.use('/api/omega', swarmRoutes)  // [v6.6] added: OMEGA Swarm
app.use('/api/omega', autoFixRoutes)  // [v6.6] added: AutoFix Agent
app.use('/api/omega', researchRoutes)  // [v6.6] added: Web Research Engine
app.use('/api/ad-requests', adRequestRoutes)  // ← НОВОЕ: AdRequests / Client chat
app.use('/api/subscriptions', subscriptionRoutes)  // ← P10: Подписки
app.use('/api/invoices', invoiceRoutes)  // ← P10: Счета
app.use('/api/owner-requisites', ownerRequisitesRoutes)  // ← P10: Реквизиты
app.use('/api/owner/legal-info', ownerLegalInfoRoutes)  // ← Legal Shield: Owner legal info
app.use('/api/yookassa', yookassaRoutes)  // ← P10: ЮKassa
app.use('/api/stripe', stripeRoutes)  // ← P10: Stripe (выключено по умолчанию)
app.use('/api/email', emailRoutes)  // ← P10: Email
app.use('/api/push', pushRoutes)  // Push notifications
app.use('/api/white-label', whiteLabelRoutes)
app.use('/api/workspaces', projectWorkspaceRoutes)
app.use('/api/v1/omega', omegaAPIRoutes)
app.use('/api/paypal', paypalRoutes)
app.use('/api/launch', launchRoutes)
app.use('/api/demo', demoRoutes)
app.use('/api/integrations', integrationsRoutes)
app.use('/api/plans', plansRoutes)  // [PLANS-SYNC] added
app.use('/api/checkout', checkoutRoutes)  // [PAYMENT-v5.2] added
app.use('/api/qr', qrRoutes)
app.use('/api/print', printRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/franchise', franchiseRoutes)
app.use('/api/fleet', fleetRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/monitoring', monitoringRoutes)
app.use('/api/gamification', gamificationRoutes)
app.use('/api/boardroom', boardroomRoutes)
app.use('/api/business-spawner', businessSpawnerRoutes)
app.use('/api/neuro-sales', neuroSalesRoutes)  // [P18] added: Neuro-Sales API
app.use('/api/challenges', challengeRoutes)  // [P20] added: OMEGA Challenge API
app.use('/api/upload', uploadRoutes)  // [P21] added: image upload optimization
app.use('/api/roadmap', roadmapRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/self-improvement', selfImprovementRoutes)
app.use('/api/scheduled-posts', scheduledPostsRoutes)
app.use('/api/approvals', approvalRoutes)  // [v6.5] added: OMEGA approval queue
app.use('/api/repurposing', repurposingRoutes)  // [v6.5] added: content repurposing engine
app.use('/api/version', versionRoutes)  // [v6.5.5] added: version API

// [v6.0-fix] added: fallback routers for expected frontend endpoints (real empty structures, no mock)
app.use('/api/analytics', analyticsFallbackRoutes)
app.use('/api/owner', ownerFallbackRoutes)
app.use('/api/omega', omegaFallbackRoutes)
app.use('/api/subscriptions', subscriptionFallbackRoutes)
app.use('/api/finance', financeFallbackRoutes)
app.use('/api/invoices', invoiceFallbackRoutes)
app.use('/api/users', quotaFallbackRoutes)
app.use('/api/self-improvement', selfImprovementFallbackRoutes)

// [v6.0] added: structured fallback routes for expected frontend endpoints
app.use('/api', fallbackRoutes)

// [MASTER-v5.0] added: real data routes for dashboards
app.get('/api/admin/users', protect, async (req, res) => {
    try {
        const users = await User.find().select('name email role status posts createdAt').lean()
        res.json({ status: 'success', data: users })
    } catch (err) {
        console.error('[admin:users]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

app.get('/api/campaigns', protect, async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id
        const campaigns = await Campaign.find({ $or: [{ ownerId: userId }, { clientId: userId }] }).lean()
        res.json({ status: 'success', data: campaigns })
    } catch (err) {
        console.error('[campaigns]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

app.get('/api/tickets', protect, async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 }).lean()
        res.json({ status: 'success', data: tickets })
    } catch (err) {
        console.error('[tickets]', err.message)
        res.status(500).json({ status: 'error', error: err.message })
    }
})

// Public QR short-link redirect (must be outside /api rate limiting)
app.get('/qr/:shortCode', qrController.redirectScan)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' })
})

const server = http.createServer(app)
initSocket(server)

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});

// Graceful shutdown — Render шлёт SIGTERM при деплое
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Closing server...`);
  server.close(() => {
    console.log('Server closed');
    if (global.ownerBot && typeof global.ownerBot.stopPolling === 'function') {
      global.ownerBot.stopPolling();
      console.log('Telegram polling stopped');
    }
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Retry с лимитом (Render иногда не освобождает порт сразу)
let retryCount = 0;
const MAX_RETRIES = 15;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    retryCount++;
    if (retryCount > MAX_RETRIES) {
      console.error(`❌ Port ${PORT} still in use after ${MAX_RETRIES} retries. Exiting...`);
      process.exit(1);
    }
    console.error(`❌ Port ${PORT} in use. Retrying ${retryCount}/${MAX_RETRIES} in 5s...`);
    setTimeout(() => {
      server.close(() => {
        server.listen(PORT);
      });
    }, 5000);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
