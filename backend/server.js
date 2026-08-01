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
import { errorHandler } from './middleware/errorHandler.js'
import { seedAgents } from './services/omegaAgents/agentsRegistry.js'
import bot from './services/ownerBot.js'

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
import yookassaRoutes from './routes/yookassa.js'  // ← P10: ЮKassa
import stripeRoutes from './routes/stripe.js'  // ← P10: Stripe (выключено по умолчанию)
import emailRoutes from './routes/email.js'  // ← P10: Email
import pushRoutes from './routes/push.js'  // Push notifications
import whiteLabelRoutes from './routes/whiteLabel.js'  // ← White-Label Agency
import projectWorkspaceRoutes from './routes/projectWorkspace.js'  // ← Multi-Project Workspaces
import omegaAPIRoutes from './routes/api/v1/omegaAPI.js'  // ← B2B2B OMEGA API
import paypalRoutes from './routes/paypal.js'  // ← PayPal
import launchRoutes from './routes/launch.js'  // ← Product Hunt waitlist

const app = express()
app.set('trust proxy', 1)

import http from 'http'
import { initSocket } from './socket.js'
import { startAutopilot } from './services/autoPilot.js'

// Connect to database before starting server
await connectDB()

if (!isConnected) {
    console.error('❌ Cannot start server without MongoDB connection')
    if (process.env.NODE_ENV === 'production') {
        process.exit(1)
    }
    console.warn('⚠️  Continuing in fallback/demo mode (development only)')
}

// Start OMEGA AutoPilot cron (it checks enabled owners internally)
startAutopilot()

// Seed default OMEGA agents after DB connection
if (isConnected) {
    try {
        await seedAgents()
        console.log('🤖 Default OMEGA agents seeded')
    } catch (err) {
        console.warn('[server] seedAgents failed:', err.message)
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

// Telegram webhook handler
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV === 'production') {
    app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, express.json(), (req, res) => {
        if (global.ownerBot && typeof global.ownerBot.processUpdate === 'function') {
            global.ownerBot.processUpdate(req.body)
        }
        res.sendStatus(200)
    })
}

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
app.use('/api/white-label', whiteLabelRoutes)
app.use('/api/workspaces', projectWorkspaceRoutes)
app.use('/api/v1/omega', omegaAPIRoutes)
app.use('/api/paypal', paypalRoutes)
app.use('/api/launch', launchRoutes)

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
