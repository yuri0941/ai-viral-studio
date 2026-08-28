import './config/env.js'
import { CLIENT_BOT_TOKEN, OWNER_BOT_TOKEN } from './config/bots.js'

// ============ ИМПОРТЫ ============
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { connectDB, isConnected } from './config/database.js'
import { connectRedis } from './config/redisClient.js' // [P24] fixed: Redis import
import { errorHandler } from './middleware/errorHandler.js'
import { protect } from './middleware/auth.js' // [HOTFIX-2026-08-04] added — protect for fallback routes
import { apiLimiter, omegaChatLimiter, authLoginLimiter, authRegisterLimiter, checkBlockedIP, autoBanMiddleware } from './middleware/rateLimiter.js'  // [v7.0-PART2] rate limiting v2
import { seedAgents } from './services/omegaAgents/agentsRegistry.js'
import { initOwnerBot, sendOwnerAlert, alertOwner } from './services/ownerBot.js'
import { initOmegaBot } from './services/omegaBot.js'
import { loadApiKeysToMemory } from './services/aiService.js'
import { getTaxReminder } from './services/financeService.js'
import ChannelConfig from './models/ChannelConfig.js'
import { publishToChannel, getChannelStats } from './services/channelPublisher.js'
import { generateDiscountPost, publishDiscountToChannel } from './services/discountService.js'
import { publishVideoPromo } from './services/videoPromoService.js'
import { checkInactiveClients } from './services/retentionEngine.js'
import { createNode } from './services/cognitiveMesh.js'
import { Campaign } from './models/Campaign.js'
import Ticket from './models/Ticket.js'
import User from './models/User.js'
import './models/CognitiveNode.js' // [v9.6.1-OMEGA-FIX] ensure schema is registered before cognitiveMesh uses it

import { detectWhiteLabel, whiteLabelHeaders, getWhiteLabelConfig } from './middleware/whiteLabel.js'

// Routes
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import analyticsRoutes from './routes/analytics.js'
import schedulerRoutes from './routes/scheduler.js'
import userRoutes from './routes/users.js'
import youtubeRoutes from './routes/youtube.js'  // ← НОВОЕ: YouTube API
import paymentRoutes from './routes/payments.js'  // ← НОВОЕ: Платежи
import metricsRoutes from './routes/metrics.js'  // [P1.5-METRICS] beacon воронки (публичный, rate-limited)
import testimonialsRoutes from './routes/testimonials.js'  // [P1.6-PREP] отзывы лендинга
import planConfigRoutes from './routes/planConfig.js'  // [P1.6-PREP] PlanConfig: публичный GET + owner PUT лимитов/фич
import { maintenanceMode } from './middleware/maintenanceMode.js'  // [OWNER-REMOTE-CONTROL]
import ownerRoutes from './routes/owner.js'  // ← НОВОЕ: Owner Dashboard API
import auditRoutes from './routes/audit.js'  // ← v6.6-HOTFIX-EXPORT: audit CSV export
import omegaRoutes from './routes/omega.js'  // ← НОВОЕ: OMEGA Core API
import adRequestRoutes from './routes/adRequests.js'  // ← НОВОЕ: AdRequests / Client chat
import subscriptionRoutes from './routes/subscriptions.js'  // ← P10: Подписки
import invoiceRoutes from './routes/invoices.js'  // ← P10: Счета
import addonsRoutes from './routes/addons.js'  // [v7.0-PART2] addon marketplace
import downloadsRoutes from './routes/downloads.js'  // [v7.0] added: download center
import ownerRequisitesRoutes from './routes/ownerRequisites.js'  // ← P10: Реквизиты
import omegaFinanceRoutes from './routes/omegaFinance.js'  // [v7.1-PART2] OMEGA Finance
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
// [PLANCONFIG-ADMIN] routes/plans.js удалён (legacy in-memory цены); источник истины — /api/plan-config
import videoRoutes from './routes/video.js'  // [v8.0-PART1] AI Video Creator
import voiceRoutes from './routes/voice.js'  // [v8.0-PART1] TTS/STT
import neuroSalesRoutes from './routes/neuroSales.js'  // [v8.0-PART1] Neuro-Sales
import externalApiKeysRoutes from './routes/externalApiKeys.js'  // [v8.1-PART1] External API keys manager
import omegaSupremeRoutes from './routes/omegaSupreme.js'  // [v9.0-ARCH] OMEGA Supreme
import apiKeyRoutes from './routes/apiKeys.js'  // [v9.9.15-REAL] owner API keys
import projectFactoryRoutes from './routes/projectFactory.js'  // [v9.2-SELF-CODING] Project Factory: cognitive mesh, swarm, memory, scaler, wallet
import personalityRoutes from './routes/personality.js'  // [v9.1-PERSONALITY] Digital Twin, Voice Clone, Dream Mode
import predictionRoutes from './routes/prediction.js'  // [v9.3-PREDICTION] Trend Engine, Investment Scout, Boardroom
import telegramRoutes from './routes/telegram.js'  // [v9.5-TELEGRAM-AUTO] Telegram channel manager + bot
import vkRoutes from './routes/vk.js'  // [v9.9.19] VK OAuth + status
import channelManagerRoutes from './routes/channelManager.js'  // [v9.9.20] Channel manager
import salesAutopilotRoutes from './routes/salesAutopilot.js'  // [v9.9.20] Sales autopilot
import advertiserSuiteRoutes from './routes/advertiserSuite.js'  // [v9.9.20] Advertiser suite
import conciergeRoutes from './routes/concierge.js'  // [v9.9.20] Concierge
import growthLoopRoutes from './routes/growthLoop.js'  // [v9.9.20] Growth loop
import businessDevRoutes from './routes/businessDev.js'  // [v9.9.20] Business development
import freeToPaidRoutes from './routes/freeToPaid.js'  // [v9.9.20] Free to paid bridge
// [PLANCONFIG-ADMIN] routes/checkout.js удалён (мёртвый legacy-флоу с ценами не из PlanConfig)
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
import selfOptimizeRoutes from './routes/selfOptimize.js'  // [v9.6-SELF-OPTIMIZE] self-reflection, prompt tuning, healing, performance
import publicRoutes from './routes/public.js'  // [v9.9-LAUNCH] public landing, payments, referrals, waitlist
import challengeRoutes from './routes/challenges.js'  // [P20] added: OMEGA Challenge
import uploadRoutes from './routes/upload.js'  // [P21] added: image upload optimization
import scheduledPostsRoutes from './routes/scheduledPosts.js'  // [v6.0-fix] added: missing import
import approvalRoutes from './routes/approval.js'  // [v6.5] added: OMEGA approval queue
import repurposingRoutes from './routes/repurposing.js'  // [v6.5] added: content repurposing engine
import devStudioRoutes from './routes/devStudio.js'  // [v6.6] added: OMEGA DevStudio
import swarmRoutes from './routes/swarm.js'  // [v6.6] added: OMEGA Swarm
import autoFixRoutes from './routes/autoFix.js'  // [v6.6] added: AutoFix Agent
import researchRoutes from './routes/research.js'  // [v6.6] added: Web Research Engine
import adRoutes from './routes/ads.js'  // [v6.6] Advertiser ads API
import creatorRoutes from './routes/creator.js'  // [v6.6-PART2] Creator analytics
import versionRoutes from './routes/version.js'  // [v6.5.5] added: version API
import supportRoutes from './routes/support.js'  // [v9.9.2-MASTER-FIX] unified support tickets
import channelRoutes from './routes/channel.js'  // [v9.9.5-TELEGRAM-UNIFIED]
import adOrderRoutes from './routes/adOrders.js'  // [v9.9.5-TELEGRAM-UNIFIED]
import discountRoutes from './routes/discounts.js'  // [v9.9.5-TELEGRAM-UNIFIED]
import salesMetricsRoutes from './routes/salesMetrics.js'  // [v9.9.8-SALES-OMEGA]
import desktopUpdateRoutes from './routes/desktopUpdate.js'  // [v7.0] added: Tauri desktop updater
import mediaRoutes from './routes/media.js'  // [v9.9.19.6] media publisher
import { startBackupCron } from './services/disasterRecovery.js'  // [v7.0-PART2] added: disaster recovery
import disasterRoutes from './routes/disaster.js'  // [v7.0-PART2] added: disaster recovery API
import { startMonitoringCron, monitoringMiddleware } from './services/monitoringService.js'  // [v7.0-PART2] added: monitoring
import { startResourceManagerCron } from './services/omegaResourceManager.js'  // [v7.0-PART2] added: resource manager
import { PROVIDER_CHAIN } from './services/aiService.js'  // [v9.9.15-BETA-LAUNCH] provider status for health
import { startHealthMonitor } from './services/healthMonitor.js'  // [v9.9.17-ANTI-FAIL]
import { sendDailyReport } from './services/dailyReport.js'  // [v9.9.17-ANTI-FAIL]
import feedbackRoutes from './routes/feedback.js'  // [v9.9.17-ANTI-FAIL]
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
import { startSelfReflectionCron, analyzeDailyPerformance } from './services/selfReflection.js'
import { getPromptStats, tunePrompt } from './services/promptTuner.js'
import { analyzeErrors } from './services/selfHealing.js'
import { startReflectionCron as startNeuralReflectionCron } from './ai/omega/selfReflection.js'
import { startSelfLearningCrons } from './ai/omega/selfLearningEngine.js'
import { startWebResearchCrons } from './ai/omega/webResearchEngine.js'
import { runEvolutionCron } from './services/templateEvolution.js'
import { resolveABTests } from './services/abAutoLearning.js'
import { createOmegaBackend } from './ai/omega/index.js'
import { startSubscriptionCron } from './services/subscriptionCron.js'
import { startAutoPublisher } from './services/autoPublisher.js'  // [SOCIAL-v5.1] added
import { runAutoImprovement } from './services/autoImprovement.js'  // [v9.9.14-OMEGA-AUTONOMY]
import { runSmoke } from './scripts/smoke.js'  // [v9.9.19.12] post-deploy health check

// Connect to database before starting server
await connectDB()
await connectRedis() // [P24] fixed: connect Redis with in-memory fallback

// [HOTFIX-v9.9.19] load API keys into memory for hot-reload
loadApiKeysToMemory().catch(err => console.warn('[server] loadApiKeysToMemory failed:', err.message))

// [PLANCONFIG-ADMIN] прогрев синхронного кэша PlanConfig (canUse/usageQuota читают лимиты синхронно)
const { refreshPlanCache } = await import('./services/planConfigCache.js')
refreshPlanCache().catch(err => console.warn('[server] refreshPlanCache failed:', err.message))

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
startBackupCron()
startMonitoringCron()
startResourceManagerCron()
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
        // [v9.9.19.14] 1.7 backup всех 12 слоёв памяти раз в 6 часов (существующий cron, не новый файл)
        try {
            const { backupMemoryLayers } = await import('./services/memoryLayerService.js')
            await backupMemoryLayers()
        } catch (err) {
            console.error('[cron] memory backup failed:', err.message)
        }
    })

    // [v9.9.19.14] 7.3 self-diagnosis памяти раз в час: восстановление из бэкапа, здоровая структура 12 слоёв
    cron.schedule('17 * * * *', async () => {
        try {
            const { memorySelfDiagnosis } = await import('./services/memoryLayerService.js')
            await memorySelfDiagnosis()
        } catch (err) {
            console.error('[cron] memory self-diagnosis failed:', err.message)
        }
    })

    console.log('🧠 Self-improvement crons scheduled')
}

// [v9.5.2-CLIENT-MANAGER] Daily tax reminder for self-employed NPD (20th-25th)
cron.schedule('0 20 * * *', async () => {
    try {
        const reminder = getTaxReminder()
        if (reminder.urgent) {
            console.log(`[TAX REMINDER] ${reminder.message}`)
            try { await sendOwnerAlert(`🧾 ${reminder.message}`, 'warning') } catch (e) {}
            try { await createNode({ type: 'system', content: reminder.message, confidence: 1, source: 'tax_reminder', metadata: { type: 'tax_due' } }) } catch (e) {}
        }
    } catch (err) {
        console.error('[cron] tax reminder failed:', err.message)
    }
})

// [v9.6-SELF-OPTIMIZE] Auto self-reflection, healing and prompt tuning every 6h
cron.schedule('0 */6 * * *', async () => {
    console.log('[SELF-OPTIMIZE] Running auto-reflection...')
    try {
        const owner = await User.findOne({ role: 'owner' }).lean()
        const ownerId = owner?._id?.toString() || process.env.OWNER_USER_ID
        if (ownerId) {
            await analyzeDailyPerformance(ownerId)
            await analyzeErrors(ownerId)
            const prompts = getPromptStats().filter(p => p.successRate < 0.6)
            for (const p of prompts.slice(0, 2)) {
                await tunePrompt(p.name, ownerId)
            }
        } else {
            console.warn('[SELF-OPTIMIZE] No owner found; skipping auto-reflection')
        }
    } catch (e) {
        console.error('[SELF-OPTIMIZE] Auto-reflection failed:', e.message)
    }
})

// [MASTER-v5.0] added: subscription lifecycle cron
startSubscriptionCron()

// [SOCIAL-v5.1] added: auto-publishing cron
startAutoPublisher()

// [v9.9.14-OMEGA-AUTONOMY] Auto-improvement loop every 6 hours
setInterval(() => {
  runAutoImprovement()
    .then(r => console.log('[Auto-Improvement]', new Date().toISOString(), r))
    .catch(e => console.error('[Auto-Improvement]', e.message));
}, 6 * 60 * 60 * 1000);

// [v9.9.5-TELEGRAM-UNIFIED] Channel auto-posts, discounts, videos, briefing
if (isConnected) {
    // Автопубликация контента каждый час
    cron.schedule('0 * * * *', async () => {
        const now = new Date()
        try {
            const configs = await ChannelConfig.find({ active: true, nextPostAt: { $lte: now } })
            for (const config of configs) {
                try {
                    const res = await publishToChannel(config._id)
                    if (res.success) alertOwner(`📢 Авто-пост в ${config.channelUsername}\n<b>${res.post.title}</b>`, { parse_mode: 'HTML' })
                    else alertOwner(`⚠️ Ошибка публикации ${config.channelUsername}: ${res.error}`)
                } catch (e) { console.error('Channel cron error:', e) }
            }
        } catch (e) { console.error('[cron] channel auto-post failed:', e.message) }
    })

    // Авто-скидки каждые 3 дня в 12:00
    cron.schedule('0 12 */3 * *', async () => {
        try {
            const configs = await ChannelConfig.find({ active: true })
            for (const c of configs) {
                try {
                    const discount = await generateDiscountPost('pro', [20, 30, 50][Math.floor(Math.random() * 3)])
                    await publishDiscountToChannel(discount._id, c._id)
                    alertOwner(`💰 Авто-скидка опубликована: ${discount.promoCode}`)
                } catch (e) { console.error('Discount cron error:', e) }
            }
        } catch (e) { console.error('[cron] discount auto-post failed:', e.message) }
    })

    // Авто-видео по субботам 11:00
    cron.schedule('0 11 * * 6', async () => {
        try {
            const configs = await ChannelConfig.find({ active: true })
            for (const c of configs) {
                try {
                    const topics = ['Как взлететь в TikTok за 7 дней', 'AI vs человек в SMM', 'Топ-5 хуков для Reels', 'Зачем нужен контент-план']
                    const topic = topics[Math.floor(Math.random() * topics.length)]
                    await publishVideoPromo(c._id, topic, c.niche)
                    alertOwner(`🎬 Авто-видео пост: ${topic}`)
                } catch (e) { console.error('Video cron error:', e) }
            }
        } catch (e) { console.error('[cron] video auto-post failed:', e.message) }
    })

    // Утренний брифинг 09:00
    cron.schedule('0 9 * * *', async () => {
        try {
            const configs = await ChannelConfig.find({ active: true })
            for (const c of configs) {
                try {
                    const stats = await getChannelStats(c._id)
                    alertOwner(`📊 Утренний брифинг: ${c.channelUsername}\n👥 Подписчики: ${stats?.subscribers || 0}\n📝 Постов за 7д: ${stats?.weekPosts || 0}\n👁 Охват: ${stats?.totalViews?.toLocaleString('ru-RU') || 0}`)
                } catch (e) { console.error('Briefing cron error:', e) }
            }
        } catch (e) { console.error('[cron] morning briefing failed:', e.message) }
    })

    console.log('📱 Telegram unified channel crons scheduled')

    // [v9.9.19.2-v4-CHANNEL-AUTO] OMEGA ведёт канал сама: автопосты 08/14/20 MSK, голосования, статистика
    try {
        const { startChannelAutonomy } = await import('./services/telegramChannelManager.js')
        startChannelAutonomy()
    } catch (e) { console.warn('[CHANNEL-AUTO] start failed:', e.message) }

    // [v9.9.8-SALES-OMEGA] Retention: реактивация inactive клиентов каждые 3 дня в 14:00
    cron.schedule('0 14 */3 * *', async () => {
        try { await checkInactiveClients(); }
        catch (e) { console.error('Retention cron error:', e); }
    });
}

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

    // [v9.9.19.6] Dream Mode: ночное самообучение (02:00-06:00) + утренний отчёт (08:00) — всегда активен
    try {
        const { default: dreamMode } = await import('./ai/omega/dreamMode.js')
        dreamMode.start()
    } catch (err) {
        console.warn('[server] Dream Mode start failed:', err.message)
    }

    // [v9.9.19.6] Восстановление состояния из MongoDB: навыки, команды, очередь, нейрограф
    try {
        const { recoverCommandsOnBoot } = await import('./services/commandExecutor.js')
        const { default: SkillNode } = await import('./models/SkillNode.js')
        const { hydrateFromDB } = await import('./ai/omega/neuralGraph.js')
        const rec = await recoverCommandsOnBoot()
        const skillsCount = await SkillNode.countDocuments()
        await hydrateFromDB()
        console.log(`[OMEGA] State restored: ${skillsCount} skills, ${rec.total} commands, ${rec.queued} queued`)
    } catch (err) {
        console.warn('[server] OMEGA state restore failed:', err.message)
    }

    // [v9.9.19.14] Восстановление 12 слоёв памяти из MongoDB (лог "[OMEGA] Memory restored: ...")
    try {
        const { restoreMemoryLayers } = await import('./services/memoryLayerService.js')
        await restoreMemoryLayers()
    } catch (err) {
        console.warn('[server] Memory layers restore failed:', err.message)
    }
}

import { corsOptions } from './config/cors.js'

app.use(cors(corsOptions))

// Preflight for all routes
app.options('*', cors(corsOptions))

// [TG-FREETEXT-HOTFIX+] CORS-ошибки → 403 JSON, а не стандартный Express 500 HTML
app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS', message: 'Origin not allowed' })
    }
    next(err)
})

// Helmet after CORS so security headers apply without blocking preflight
app.use(helmet())

// Body parsing — BEFORE routes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(compression())
app.use(monitoringMiddleware)  // [v7.0-PART2] track API latency and errors

// Telegram webhook handlers
// [security-hardening Б5-З2.1] верификация X-Telegram-Bot-Api-Secret-Token (если TELEGRAM_WEBHOOK_SECRET задан)
import { verifyTgWebhookSecret } from './utils/tgWebhookSecret.js'
if (process.env.NODE_ENV === 'production') {
    // [BOT-ROUTING-FIX] client token → omegaBot, owner token → ownerBot
    if (CLIENT_BOT_TOKEN) {
        app.post(`/bot${CLIENT_BOT_TOKEN}`, express.json(), verifyTgWebhookSecret, (req, res) => {
            if (global.omegaBot && typeof global.omegaBot.processUpdate === 'function') {
                global.omegaBot.processUpdate(req.body)
            }
            res.sendStatus(200)
        })
    }
    if (OWNER_BOT_TOKEN && OWNER_BOT_TOKEN !== CLIENT_BOT_TOKEN) {
        app.post(`/bot${OWNER_BOT_TOKEN}`, express.json(), verifyTgWebhookSecret, (req, res) => {
            if (global.ownerBot && typeof global.ownerBot.processUpdate === 'function') {
                global.ownerBot.processUpdate(req.body)
            }
            res.sendStatus(200)
        })
    }
}

app.post('/webhook/owner', express.json(), verifyTgWebhookSecret, (req, res) => {
    if (global.ownerBot && typeof global.ownerBot.processUpdate === 'function') {
        global.ownerBot.processUpdate(req.body)
    }
    res.sendStatus(200)
})

app.post('/webhook/omega', express.json(), verifyTgWebhookSecret, (req, res) => {
    if (global.omegaBot && typeof global.omegaBot.processUpdate === 'function') {
        global.omegaBot.processUpdate(req.body)
    }
    res.sendStatus(200)
})

// Rate limiting v2 — DDoS autoban + whitelist + per-route limits
app.use(autoBanMiddleware)
app.use('/api/omega/chat', omegaChatLimiter)
app.use('/api/auth/register', authRegisterLimiter)
app.use('/api/auth/login', authLoginLimiter)
app.use('/api/', checkBlockedIP, apiLimiter)
// [OWNER-REMOTE-CONTROL] рубильник техработ: 503 { maintenance: true } для не-владельцев
app.use('/api/', maintenanceMode)

app.use('/uploads', express.static('uploads'))

// White-label detection — applies to all requests so custom branding can be detected
app.use(detectWhiteLabel)
app.use(whiteLabelHeaders)

// Health check
app.get('/health', (req, res) => {
    const activeProviders = (PROVIDER_CHAIN || []).filter(p => {
        if (p.id === 'pollinations') return true
        return !!process.env[p.id.toUpperCase().replace(/-/g, '_') + '_API_KEY'] ||
               !!process.env[p.id.toUpperCase() + '_API_KEY']
    }).map(p => p.id)
    res.status(200).json({
        status: 'ok',
        service: 'AI Viral Studio API',
        version: '9.9.20',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()) + 's',
        providers: activeProviders
    })
})

// [HOTFIX-2026-08-08] Mobile-friendly health check under /api
app.get('/api/health', (req, res) => {
    const activeProviders = (PROVIDER_CHAIN || []).filter(p => {
        if (p.id === 'pollinations') return true
        return !!process.env[p.id.toUpperCase().replace(/-/g, '_') + '_API_KEY'] ||
               !!process.env[p.id.toUpperCase() + '_API_KEY']
    }).map(p => p.id)
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'production',
        mobile: true,
        version: '9.9.20',
        providers: activeProviders
    })
})

// [v9.9.19.15.1] telemetry sink: avoids 404 from frontend/health pings
app.post('/api/telemetry', (req, res) => {
    try {
        const { event, payload, screen, error } = req.body || {}
        console.log('[telemetry]', JSON.stringify({ event, screen, error: error?.message || error, timestamp: new Date().toISOString() }))
        res.json({ ok: true })
    } catch (err) {
        res.status(400).json({ ok: false, error: 'invalid_payload' })
    }
})

// Health-check для UptimeRobot, cron-job.org и keep-alive
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'AI Viral Studio API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
})

// Public legal info endpoint (for privacy policy, terms, footer)
app.get('/api/public/legal-info', getPublicLegalInfo)

// [v9.9-LAUNCH] Public landing routes: plans, waitlist, payments, referrals
app.use('/api/public', publicRoutes)

// [PAYMENT-v5.2] added: geo-currency detection
app.get('/api/geo/currency', detectCurrency)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/users', userRoutes)
app.use('/api/user', userRoutes)  // [v9.9.19-MASTER-AUDIT] alias: /api/user/telegram-status для клиентского Telegram Connect
app.use('/api/support', supportRoutes)  // [v9.9.2-MASTER-FIX] unified support tickets
app.use('/api/channel', channelRoutes)  // [v9.9.5-TELEGRAM-UNIFIED]
app.use('/api/ad-orders', adOrderRoutes)  // [v9.9.5-TELEGRAM-UNIFIED]
app.use('/api/discounts', discountRoutes)  // [v9.9.5-TELEGRAM-UNIFIED]
app.use('/api/admin/sales-metrics', salesMetricsRoutes)  // [v9.9.8-SALES-OMEGA]
app.use('/api/youtube', youtubeRoutes)  // ← НОВОЕ: YouTube роуты
app.use('/api/payments', paymentRoutes)  // ← НОВОЕ: Платежи
app.use('/api/metrics', metricsRoutes)  // [P1.5-METRICS] POST /api/metrics/visit
app.use('/api/testimonials', testimonialsRoutes)  // [P1.6-PREP] отзывы лендинга
app.use('/api/plan-config', planConfigRoutes)  // [P1.6-PREP] живые тарифы (PlanConfig)
app.use('/api/owner', ownerRoutes)  // ← НОВОЕ: Owner Dashboard API
app.use('/api/api-keys', apiKeyRoutes)  // [v9.9.19-HOTFIX] owner-managed API keys (hot-reload)
app.use('/api/owner/apikeys', apiKeyRoutes)  // [v9.9.15-REAL] legacy owner API keys
app.use('/api/feedback', feedbackRoutes)  // [v9.9.17-ANTI-FAIL] feedback 👍/👎
app.use('/api/owner/omega-finance', omegaFinanceRoutes)  // [v7.1-PART2] OMEGA Finance
app.use('/api/audit', auditRoutes)  // ← v6.6-HOTFIX-EXPORT: audit CSV export
app.use('/api/omega', omegaRoutes)  // ← НОВОЕ: OMEGA Core API
app.use('/api/omega', devStudioRoutes)  // [v6.6] added: OMEGA DevStudio
app.use('/api/omega', swarmRoutes)  // [v6.6] added: OMEGA Swarm
app.use('/api/omega', autoFixRoutes)  // [v6.6] added: AutoFix Agent
app.use('/api/omega', researchRoutes)  // [v6.6] added: Web Research Engine
app.use('/api/ad-requests', adRequestRoutes)  // ← НОВОЕ: AdRequests / Client chat
app.use('/api/ads', protect, adRoutes)  // [v6.6] Advertiser campaigns + approval flow
app.use('/api/creator', protect, creatorRoutes)  // [v6.6-PART2] Creator analytics (no 401 for valid token)
app.use('/api/subscriptions', subscriptionRoutes)  // ← P10: Подписки
app.use('/api/subscriptions', addonsRoutes)  // [v7.0-PART2] addon marketplace
app.use('/api/video', videoRoutes)  // [v8.0-PART1] AI Video Creator
app.use('/api/voice', voiceRoutes)  // [v8.0-PART1] TTS/STT
app.use('/api/analytics/neuro-sales', neuroSalesRoutes)  // [v8.0-PART1] Neuro-Sales
app.use('/api/admin/external-keys', externalApiKeysRoutes)  // [v8.1-PART1] External API keys manager
app.use('/api/omega-supreme', omegaSupremeRoutes)  // [v9.0-ARCH] OMEGA Supreme
app.use('/api/omega-supreme', personalityRoutes)  // [v9.1-PERSONALITY] Digital Twin, Voice Clone, Dream Mode
app.use('/api/project-factory', projectFactoryRoutes)  // [v9.2-SELF-CODING] Project Factory
app.use('/api/prediction', predictionRoutes)  // [v9.3-PREDICTION] Trend Engine, Investment Scout, Boardroom
app.use('/api', telegramRoutes)  // [v9.5-TELEGRAM-AUTO] Telegram channel manager + bot
app.use('/api', vkRoutes)  // [v9.9.19] VK OAuth + status
app.use('/api/channel-manager', channelManagerRoutes)  // [v9.9.19-HOTFIX] Channel manager routes
app.use('/api/channel', channelManagerRoutes)  // [v9.9.20] legacy channel manager routes
app.use('/api/sales-autopilot', salesAutopilotRoutes)  // [v9.9.20] Sales autopilot
app.use('/api/advertiser-suite', advertiserSuiteRoutes)  // [v9.9.20] Advertiser suite
app.use('/api/concierge', conciergeRoutes)  // [v9.9.20] Concierge
app.use('/api/growth-loop', growthLoopRoutes)  // [v9.9.20] Growth loop
app.use('/api/business-dev', businessDevRoutes)  // [v9.9.20] Business development
app.use('/api/free-to-paid', freeToPaidRoutes)  // [v9.9.20] Free to paid bridge
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
// [PLANCONFIG-ADMIN] /api/plans и /api/checkout удалены (legacy), единый источник — /api/plan-config
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
app.use('/api/challenges', challengeRoutes)  // [P20] added: OMEGA Challenge API
app.use('/api/upload', uploadRoutes)  // [P21] added: image upload optimization
app.use('/api/roadmap', roadmapRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/self-improvement', selfImprovementRoutes)
app.use('/api/self-optimize', selfOptimizeRoutes)  // [v9.6-SELF-OPTIMIZE] self-optimize API
app.use('/api/scheduled-posts', scheduledPostsRoutes)
app.use('/api/approvals', approvalRoutes)  // [v6.5] added: OMEGA approval queue
app.use('/api/repurposing', repurposingRoutes)  // [v6.5] added: content repurposing engine
app.use('/api/version', versionRoutes)  // [v6.5.5] added: version API
app.use('/api/desktop', desktopUpdateRoutes)  // [v7.0] added: Tauri desktop updater
app.use('/api/media', mediaRoutes)  // [v9.9.19.6] media publisher
app.use('/api/downloads', downloadsRoutes)  // [v7.0] added: download center
app.use('/api/admin', disasterRoutes)  // [v7.0-PART2] added: disaster recovery
app.use('/api/admin', monitoringRoutes)  // [v7.0-PART2] added: monitoring API

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

// [v9.9.19.12] smoke test: first run 2 minutes after boot, then every 15 minutes
setTimeout(() => {
  runSmoke().catch(e => console.error('[smoke] initial run failed:', e.message))
}, 2 * 60 * 1000)
setInterval(() => {
  runSmoke().catch(e => console.error('[smoke] scheduled run failed:', e.message))
}, 15 * 60 * 1000)

// [v9.9.17-ANTI-FAIL] start health monitor + daily report
startHealthMonitor();

function scheduleDailyReport() {
  const now = new Date();
  const msk = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  const target = new Date(msk);
  target.setHours(8, 0, 0, 0);
  if (target <= msk) target.setDate(target.getDate() + 1);
  const delay = target - msk;

  setTimeout(() => {
    sendDailyReport();
    setInterval(sendDailyReport, 24 * 60 * 60 * 1000);
  }, delay);
}
scheduleDailyReport();
console.log('📊 Daily Report scheduled at 08:00 MSK');

// [v9.9.15-BETA-LAUNCH] self-ping keep-alive for Render free tier + provider count
const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://aiviral-backend.onrender.com';
setInterval(() => {
  fetch(`${SELF_URL}/health`)
    .then(async r => {
      const data = await r.json().catch(() => ({}))
      console.debug(`[Keep-Alive] ${new Date().toISOString()} — ${r.status}, providers: ${data.providers?.length || 0}`)
    })
    .catch(e => console.error('[Keep-Alive] Failed:', e.message));
}, 10 * 60 * 1000);

// Graceful shutdown — Render шлёт SIGTERM при деплое
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Closing server...`);
  // [v9.9.19.14] 1.6 Render шлёт SIGTERM при каждом деплое — слои памяти обязаны сохраниться
  import('./services/memoryLayerService.js')
    .then(m => m.saveAllLayers())
    .catch(() => {})
    .finally(() => {
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
