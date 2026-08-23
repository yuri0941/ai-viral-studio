import express from 'express'
import {
    getOverview,
    getFinance,
    getTeam,
    getServers,
    getIntegrations,
    getAudit,
    getAgents,
    getPromos,
    getNews,
    getSubscriptions,
    createEntity,
    updateEntity,
    deleteEntity,
} from '../controllers/ownerController.js'
import { protect, authorize } from '../middleware/auth.js'
import { getProviderStatus, toggleProvider } from '../controllers/aiProviderController.js'
import { getAdPricing, updateAdPricing } from '../controllers/adPricingController.js'
import { updatePlanPrice } from '../controllers/subscriptionController.js'
import {
    trackAdSpend,
    getRevenueShareDashboard,
    updateCampaignRoi,
} from '../services/revenueShareService.js'
import { generateNicheReport, getPricing } from '../services/dataIntelligenceService.js'

import { getOwnerSettings, updateOwnerSettings } from '../controllers/ownerSettingsController.js'
import { ApiKey } from '../models/index.js'
import { invalidateApiKeysCache } from '../services/aiService.js'
import PlanConfig from '../models/PlanConfig.js'
import PriceChangeLog from '../models/PriceChangeLog.js'
import AdPricing from '../models/AdPricing.js'
import { analyzePricing, marginAfter } from '../services/pricingAnalysis.js'
import { invalidatePlanCache } from '../middleware/enforceQuota.js'

const router = express.Router()

// Owner dashboard data
router.get('/overview', getOverview)
router.get('/finance', getFinance)
router.get('/team', getTeam)
router.get('/servers', getServers)
router.get('/integrations', getIntegrations)
router.get('/audit', getAudit)
router.get('/agents', getAgents)
router.get('/promos', getPromos)
router.get('/news', getNews)
router.get('/subscriptions', getSubscriptions)
router.patch('/subscription-plans/:planId', protect, authorize('owner', 'admin'), (req, res, next) => {
    req.body = { ...req.body, planId: req.params.planId }
    return updatePlanPrice(req, res, next)
})

// Owner settings (OMEGA features toggles)
// [HOTFIX-2026-08-04] added — generic settings for all authenticated users, owner-specific for owner/admin
router.get('/settings', protect, async (req, res) => {
    try {
        if (req.user?.role === 'owner' || req.user?.role === 'admin') {
            return getOwnerSettings(req, res)
        }
        res.json({ settings: { theme: 'dark', language: 'ru', notifications: true, sidebarExpanded: true } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})
router.put('/settings', protect, authorize('owner', 'admin'), updateOwnerSettings)

// AI Provider toggles & real status
router.get('/ai-providers/status', protect, authorize('owner', 'admin'), getProviderStatus)
router.post('/ai-providers/:id/toggle', protect, authorize('owner', 'admin'), toggleProvider)

// Ad pricing
router.get('/ad-pricing', protect, authorize('owner', 'admin'), getAdPricing)
router.put('/ad-pricing', protect, authorize('owner', 'admin'), updateAdPricing)

// [P20] added: revenue share dashboard for advertisers/owners
router.get('/revenue-share', protect, authorize('owner', 'admin', 'advertiser'), async (req, res) => {
    try {
        const ownerId = req.user.role === 'advertiser' ? req.user.id : null
        const data = await getRevenueShareDashboard(ownerId)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/revenue-share/spend', protect, authorize('owner', 'admin', 'advertiser'), async (req, res) => {
    try {
        const { campaignId, amount } = req.body || {}
        const result = await trackAdSpend(campaignId, amount)
        res.json(result)
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message })
    }
})

router.patch('/revenue-share/roi/:campaignId', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const campaign = await updateCampaignRoi(req.params.campaignId, req.body.roi)
        res.json({ status: 'success', data: campaign })
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message })
    }
})

// [P20] added: data intelligence reports
router.get('/reports/pricing', protect, authorize('owner', 'admin', 'business'), async (req, res) => {
    try {
        res.json({ status: 'success', data: getPricing() })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

router.post('/reports/intelligence', protect, authorize('owner', 'admin', 'business'), async (req, res) => {
    try {
        const { niche = 'all', period = 'month', format = 'json' } = req.body || {}
        const result = await generateNicheReport(niche, period, format)
        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/json')
            return res.json(result)
        }
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
})

// Generic CRUD for owner entities
router.post('/:entity', createEntity)
router.patch('/:entity/:id', updateEntity)
router.delete('/:entity/:id', deleteEntity)

// [P17] added: owner-scoped API key storage
router.patch('/api-keys/:provider', protect, authorize('owner', 'admin'), async (req, res) => {
    const { provider } = req.params
    const ownerId = req.user?._id
    const { keyValue } = req.body || {}
    if (!keyValue || keyValue.length < 4) return res.status(400).json({ success: false, message: 'Invalid key' })
    try {
        await ApiKey.findOneAndUpdate(
            { ownerId, provider },
            { ownerId, provider, keyValue, key: keyValue, label: provider.toUpperCase(), isActive: true, updatedAt: new Date() },
            { upsert: true, new: true }
        )
        invalidateApiKeysCache?.()
        res.json({ success: true })
    } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// [25-TARIFF-GATES] Pricing management
router.get('/pricing', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const plans = await PlanConfig.getAll()
        const adPricing = await AdPricing.findOne().lean() || { cpm: 0, cpc: 0, cpa: 0, fixedMonth: 0 }
        res.json({ success: true, data: { plans, adPricing } })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/pricing/analysis', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { what } = req.query
        if (!what) return res.status(400).json({ success: false, error: 'what_required' })
        const analysis = await analyzePricing(what)
        res.json({ success: true, data: analysis })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post('/pricing/change', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { what, newPrice, reason = '' } = req.body || {}
        if (!what || typeof newPrice !== 'number') {
            return res.status(400).json({ success: false, error: 'what_and_newPrice_required' })
        }

        const analysis = await marginAfter(what, newPrice)
        const [type, target, field] = what.split('.')
        let oldPrice = 0

        if (type === 'tariff') {
            const plan = await PlanConfig.findOne({ plan: target })
            oldPrice = plan?.price || 0
            if (!plan) return res.status(404).json({ success: false, error: 'plan_not_found' })
            plan.price = newPrice
            await plan.save()
        } else if (type === 'ad' && target === 'channel') {
            const pricing = await AdPricing.findOne()
            oldPrice = pricing?.[field] || 0
            if (!pricing) {
                await AdPricing.create({ ownerId: req.user.id, [field]: newPrice })
            } else {
                pricing[field] = newPrice
                await pricing.save()
            }
        } else {
            return res.status(400).json({ success: false, error: 'unsupported_what' })
        }

        invalidatePlanCache()

        await PriceChangeLog.create({
            what,
            oldPrice,
            newPrice,
            source: 'cabinet',
            analysisSnapshot: analysis,
            reason,
            changedBy: req.user.id,
        })

        res.json({ success: true, data: { what, oldPrice, newPrice, analysis } })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// [PLANCONFIG-ADMIN] AI-советчик тарифов: реальные данные + рекомендации OMEGA (только совет)
router.get('/pricing/advisor', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { getAdvisorReport } = await import('../services/planAdvisorService.js')
        const report = await getAdvisorReport()
        res.json({ success: true, data: report })
    } catch (err) {
        console.error('[owner:pricing/advisor]', err.message)
        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/pricing/history', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const history = await PriceChangeLog.find().sort({ createdAt: -1 }).limit(50).lean()
        res.json({ success: true, data: history })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// AI Provider health check (used by OMEGA Core tab)
router.get('/omega/health', (req, res) => {
    const provider = req.query.provider || 'groq'
    const keyVar = `${provider.toUpperCase()}_API_KEY`
    const enabledVar = `${provider.toUpperCase()}_ENABLED`
    const hasKey = !!process.env[keyVar]
    const enabled = process.env[enabledVar] === 'true'

    res.json({
        status: 'success',
        data: {
            provider,
            status: hasKey && enabled ? 'ok' : 'disabled',
            hasKey,
            enabled,
        },
    })
})

// ============ [OWNER-REMOTE-CONTROL] рубильники / метрики / возврат / смена TG владельца ============
// Единый источник истины — OwnerSettings; те же данные/обёртки, что у TG-бота (ownerActionsService).

router.get('/control/flags', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { getOwnerFlags } = await import('../models/OwnerSettings.js')
        res.json({ success: true, flags: await getOwnerFlags() })
    } catch (err) {
        console.error('[owner/control/flags]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.put('/control/flags', protect, authorize('owner'), async (req, res) => {
    try {
        const { setOwnerFlag } = await import('../models/OwnerSettings.js')
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        const actor = `cabinet:${req.user?.email || req.user?._id}`
        const out = {}
        if (typeof req.body?.maintenanceMode === 'boolean') {
            Object.assign(out, await setOwnerFlag('maintenanceMode', req.body.maintenanceMode))
            await logOwnerAction(req.body.maintenanceMode ? 'owner.maintenance.on' : 'owner.maintenance.off', {}, 'ok', actor)
        }
        if (typeof req.body?.registrationEnabled === 'boolean') {
            Object.assign(out, await setOwnerFlag('registrationEnabled', req.body.registrationEnabled))
            await logOwnerAction(req.body.registrationEnabled ? 'owner.registration.on' : 'owner.registration.off', {}, 'ok', actor)
        }
        if (!Object.keys(out).length) return res.status(400).json({ error: 'Нечего обновлять' })
        res.json({ success: true, flags: out })
    } catch (err) {
        console.error('[owner/control/flags:put]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.get('/control/metrics', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { getOwnerMetricsWidget } = await import('../services/ownerActionsService.js')
        res.json({ success: true, metrics: await getOwnerMetricsWidget() })
    } catch (err) {
        console.error('[owner/control/metrics]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// Кнопка «Возврат платежа» в кабинете — та же обёртка, что и TG «верни платёж»
router.post('/control/refund', protect, authorize('owner'), async (req, res) => {
    try {
        const { findRefundablePayment, refundByPaymentId } = await import('../services/ownerActionsService.js')
        const identifier = String(req.body?.identifier || '').trim()
        if (!identifier) return res.status(400).json({ error: 'Укажите email клиента или id платежа' })
        const payment = await findRefundablePayment(identifier)
        if (!payment) return res.status(404).json({ error: 'Платёж не найден' })
        const actor = `cabinet:${req.user?.email || req.user?._id}`
        const r = await refundByPaymentId(payment.yookassaPaymentId, actor)
        if (!r.ok) {
            const status = r.reason === 'already_refunded' ? 409 : r.reason === 'not_found' ? 404 : 502
            return res.status(status).json({ error: r.message })
        }
        res.json({ success: true, message: r.message })
    } catch (err) {
        console.error('[owner/control/refund]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ---- Смена Telegram владельца (код 6 цифр, 10 минут, 3 попытки, rate-limit 1/мин) ----
const tgChangeState = global.ownerTgChangeState || new Map()
global.ownerTgChangeState = tgChangeState

function maskChatId(id) {
    const s = String(id || '')
    return s.length > 4 ? `•••${s.slice(-4)}` : (s ? '••••' : '')
}

router.get('/telegram-owner', protect, authorize('owner'), async (req, res) => {
    try {
        const { getOwnerChatId } = await import('../models/OwnerSettings.js')
        const current = await getOwnerChatId(true)
        res.json({ success: true, chatIdMasked: maskChatId(current), configured: !!current })
    } catch (err) {
        console.error('[owner/telegram-owner]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/telegram-owner/send-code', protect, authorize('owner'), async (req, res) => {
    try {
        const chatId = String(req.body?.chatId || '').trim()
        if (!/^-?\d{5,15}$/.test(chatId)) {
            return res.status(400).json({ error: 'Некорректный chat_id. Узнайте его командой «мой id» в боте.' })
        }
        const ownerKey = String(req.user?._id || req.user?.id)
        const now = Date.now()
        const prev = tgChangeState.get(ownerKey)
        if (prev?.lastSentAt && now - prev.lastSentAt < 60 * 1000) {
            return res.status(429).json({ error: 'Код уже отправлен. Повторите через минуту.' })
        }
        const code = String(Math.floor(100000 + Math.random() * 900000))
        const { getOwnerBot } = await import('../services/ownerBot.js')
        const bot = getOwnerBot()
        if (!bot || typeof bot.sendMessage !== 'function') {
            return res.status(503).json({ error: 'TG-бот владельца не запущен' })
        }
        await bot.sendMessage(chatId,
            `🔐 <b>AI Viral Studio</b>\n\nКод привязки Telegram владельца: <code>${code}</code>\n\nКод действует 10 минут. Если вы не запрашивали привязку — проигнорируйте.`,
            { parse_mode: 'HTML' })
        tgChangeState.set(ownerKey, { code, chatId, expiresAt: now + 10 * 60 * 1000, attempts: 3, lastSentAt: now })
        res.json({ success: true, message: 'Код отправлен в новый Telegram' })
    } catch (err) {
        console.error('[owner/telegram-owner/send-code]', err.message)
        res.status(500).json({ error: `Не удалось отправить код: ${err.message}. Новый аккаунт должен сначала написать боту.` })
    }
})

router.post('/telegram-owner/confirm', protect, authorize('owner'), async (req, res) => {
    try {
        const ownerKey = String(req.user?._id || req.user?.id)
        const pending = tgChangeState.get(ownerKey)
        if (!pending || Date.now() > pending.expiresAt) {
            tgChangeState.delete(ownerKey)
            return res.status(400).json({ error: 'Код истёк. Отправьте новый.' })
        }
        if (pending.attempts <= 0) {
            tgChangeState.delete(ownerKey)
            return res.status(429).json({ error: 'Попытки исчерпаны. Отправьте новый код.' })
        }
        const code = String(req.body?.code || '').trim()
        if (code !== pending.code) {
            pending.attempts -= 1
            return res.status(400).json({ error: `Неверный код. Осталось попыток: ${pending.attempts}` })
        }
        const newChatId = pending.chatId
        tgChangeState.delete(ownerKey)

        const { getOwnerChatId, invalidateOwnerChatIdCache } = await import('../models/OwnerSettings.js')
        const oldChatId = await getOwnerChatId(true)

        const { OwnerSettings } = await import('../models/OwnerSettings.js')
        await OwnerSettings.findOneAndUpdate(
            { ownerId: req.user?._id || req.user?.id },
            { $set: { ownerTelegramChatId: newChatId } },
            { upsert: true, new: true }
        )
        invalidateOwnerChatIdCache()

        const { getOwnerBot } = await import('../services/ownerBot.js')
        const bot = getOwnerBot()
        if (bot && typeof bot.sendMessage === 'function') {
            const text = '✅ <b>AI Viral Studio</b>\n\nTelegram владельца обновлён. Все алерты и отчёты теперь приходят сюда.'
            if (oldChatId && String(oldChatId) !== String(newChatId)) {
                bot.sendMessage(oldChatId, 'ℹ️ <b>AI Viral Studio</b>\n\nTelegram владельца изменён из кабинета. Алерты больше не будут приходить в этот аккаунт.', { parse_mode: 'HTML' }).catch(() => {})
            }
            bot.sendMessage(newChatId, text, { parse_mode: 'HTML' }).catch(() => {})
        }

        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        await logOwnerAction('owner.telegram.change', { old: maskChatId(oldChatId), new: maskChatId(newChatId) }, 'ok', `cabinet:${req.user?.email || ''}`)

        res.json({ success: true, message: 'Telegram владельца обновлён', chatIdMasked: maskChatId(newChatId) })
    } catch (err) {
        console.error('[owner/telegram-owner/confirm]', err.message)
        res.status(500).json({ error: err.message })
    }
})

export default router
