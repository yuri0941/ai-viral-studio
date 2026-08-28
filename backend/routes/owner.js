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
// [security-hardening Б5-З3] раньше эти маршруты были БЕЗ авторизации — любой аноним читал
// финансы/команду/аудит/подписки владельца. Теперь owner/admin only.
router.get('/overview', protect, authorize('owner', 'admin'), getOverview)
router.get('/finance', protect, authorize('owner', 'admin'), getFinance)
router.get('/team', protect, authorize('owner', 'admin'), getTeam)
router.get('/servers', protect, authorize('owner', 'admin'), getServers)
router.get('/integrations', protect, authorize('owner', 'admin'), getIntegrations)
router.get('/audit', protect, authorize('owner', 'admin'), getAudit)
router.get('/agents', protect, authorize('owner', 'admin'), getAgents)
router.get('/promos', protect, authorize('owner', 'admin'), getPromos)
router.get('/news', protect, authorize('owner', 'admin'), getNews)
router.get('/subscriptions', protect, authorize('owner', 'admin'), getSubscriptions)
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
router.post('/:entity', protect, authorize('owner', 'admin'), createEntity)
router.patch('/:entity/:id', protect, authorize('owner', 'admin'), updateEntity)
router.delete('/:entity/:id', protect, authorize('owner', 'admin'), deleteEntity)

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

// [STAFF-DOP] Создание staff-аккаунта из owner-кабинета (email + временный пароль + роль), без seed-скриптов.
// Только owner: staff/admin не могут создавать privileged-аккаунты (белый список ролей Б3).
router.post('/staff', protect, authorize('owner'), async (req, res) => {
    try {
        const { createManagedUser } = await import('../services/userManager.js')
        const { email, name, password, role } = req.body || {}
        const { user, tempPassword } = await createManagedUser({ email, name, password, role }, `cabinet:${req.user?.email || req.user?._id}`)
        res.status(201).json({
            success: true,
            staff: { id: String(user._id), email: user.email, name: user.name, role: user.role },
            ...(tempPassword ? { tempPassword } : {}),
        })
    } catch (err) {
        console.error('[owner/staff:create]', err.message)
        const msg = err.message || 'Ошибка сервера'
        const status = /уже существует/.test(msg) ? 409 : /Некорректный|Недопустим|Пароль/.test(msg) ? 400 : 500
        res.status(status).json({ success: false, error: msg })
    }
})

// [OWNER-OMEGA] Продление подписки из кабинета — та же обёртка, что и TG «продли email на N дней»
router.post('/control/extend-preview', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { findClientSubscription } = await import('../services/ownerActionsService.js')
        const email = String(req.body?.email || '').trim()
        if (!email) return res.status(400).json({ error: 'Укажите email клиента' })
        const found = await findClientSubscription(email)
        if (!found) return res.status(404).json({ error: 'Клиент не найден' })
        const { user, sub } = found
        res.json({
            success: true,
            client: {
                userId: String(user._id),
                email: user.email,
                name: user.name || '',
                plan: sub?.plan || user.subscription || 'free',
                currentPeriodEnd: sub?.currentPeriodEnd || sub?.endDate || null,
                hasSubscription: !!sub,
            },
        })
    } catch (err) {
        console.error('[owner/control/extend-preview]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// [STAFF-DOP] owner+admin (ТЗ Б4-ДОП З3.4), days может быть отрицательным (сократить тариф) — только из кабинета;
// TG-бот вызывает extendSubscriptionDays без opts и по-прежнему ограничен 1..3660.
router.post('/control/extend-subscription', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { extendSubscriptionDays } = await import('../services/ownerActionsService.js')
        const userId = String(req.body?.userId || '').trim()
        const days = Number(req.body?.days)
        if (!userId) return res.status(400).json({ error: 'Укажите userId' })
        const actor = `cabinet:${req.user?.email || req.user?._id}`
        const r = await extendSubscriptionDays(userId, days, actor, { allowNegative: true })
        if (!r.ok) {
            const status = r.reason === 'not_found' ? 404 : r.reason === 'bad_days' ? 400 : 500
            return res.status(status).json({ error: r.message })
        }
        res.json({ success: true, result: r })
    } catch (err) {
        console.error('[owner/control/extend-subscription]', err.message)
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

// ============ [OWNER-OMEGA] Сбор расходов лайт: AI-usage (факт вызовов) + инфраструктура (ручной ввод) ============

router.get('/expenses/summary', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { getExpensesSummary } = await import('../services/expenseTracker.js')
        res.json({ success: true, summary: await getExpensesSummary() })
    } catch (err) {
        console.error('[owner/expenses/summary]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.put('/expenses/infra', protect, authorize('owner'), async (req, res) => {
    try {
        const { upsertInfraExpense } = await import('../services/expenseTracker.js')
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        const service = String(req.body?.service || '').trim()
        if (!service) return res.status(400).json({ error: 'Укажите сервис (Render, MongoDB, Cloudflare…)' })
        const doc = await upsertInfraExpense(service, req.body?.amountRub, req.body?.note, `cabinet:${req.user?.email || ''}`)
        await logOwnerAction('owner.expense.infra', { service, amountRub: Number(req.body?.amountRub) || 0 }, 'ok', `cabinet:${req.user?.email || ''}`)
        res.json({ success: true, entry: doc })
    } catch (err) {
        console.error('[owner/expenses/infra:put]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.delete('/expenses/infra/:service', protect, authorize('owner'), async (req, res) => {
    try {
        const { deleteInfraExpense } = await import('../services/expenseTracker.js')
        await deleteInfraExpense(decodeURIComponent(req.params.service))
        res.json({ success: true })
    } catch (err) {
        console.error('[owner/expenses/infra:delete]', err.message)
        res.status(500).json({ error: err.message })
    }
})

// ============ [OWNER-OMEGA] Changelog-редактор (модалка обновлений без правки кода) ============

router.get('/changelog', protect, authorize('owner', 'admin'), async (req, res) => {
    try {
        const { default: ChangelogVersion } = await import('../models/ChangelogVersion.js')
        const entries = await ChangelogVersion.find().sort({ createdAt: -1 }).limit(50).lean()
        res.json({ success: true, entries })
    } catch (err) {
        console.error('[owner/changelog:get]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/changelog', protect, authorize('owner'), async (req, res) => {
    try {
        const { default: ChangelogVersion } = await import('../models/ChangelogVersion.js')
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        const version = String(req.body?.version || '').trim()
        if (!version) return res.status(400).json({ error: 'Укажите версию (например 9.9.22)' })
        const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20).map(it => ({
            audience: ['all', 'client', 'owner'].includes(it?.audience) ? it.audience : 'all',
            title: { ru: String(it?.title?.ru || '').slice(0, 200), en: String(it?.title?.en || '').slice(0, 200) },
            body: { ru: String(it?.body?.ru || '').slice(0, 1000), en: String(it?.body?.en || '').slice(0, 1000) },
        })) : []
        const entry = await ChangelogVersion.create({
            version,
            date: String(req.body?.date || '').trim() || new Date().toISOString().slice(0, 10),
            items,
        })
        await logOwnerAction('owner.changelog.create', { version }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true, entry })
    } catch (err) {
        console.error('[owner/changelog:post]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.put('/changelog/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const { default: ChangelogVersion } = await import('../models/ChangelogVersion.js')
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        const patch = {}
        if (req.body?.version !== undefined) patch.version = String(req.body.version).trim()
        if (req.body?.date !== undefined) patch.date = String(req.body.date).trim()
        if (Array.isArray(req.body?.items)) {
            patch.items = req.body.items.slice(0, 20).map(it => ({
                audience: ['all', 'client', 'owner'].includes(it?.audience) ? it.audience : 'all',
                title: { ru: String(it?.title?.ru || '').slice(0, 200), en: String(it?.title?.en || '').slice(0, 200) },
                body: { ru: String(it?.body?.ru || '').slice(0, 1000), en: String(it?.body?.en || '').slice(0, 1000) },
            }))
        }
        const entry = await ChangelogVersion.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true })
        if (!entry) return res.status(404).json({ error: 'Запись не найдена' })
        await logOwnerAction('owner.changelog.update', { id: req.params.id, version: entry.version }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true, entry })
    } catch (err) {
        console.error('[owner/changelog:put]', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.delete('/changelog/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const { default: ChangelogVersion } = await import('../models/ChangelogVersion.js')
        const { logOwnerAction } = await import('../services/ownerActionsService.js')
        const entry = await ChangelogVersion.findByIdAndDelete(req.params.id)
        if (!entry) return res.status(404).json({ error: 'Запись не найдена' })
        await logOwnerAction('owner.changelog.delete', { id: req.params.id, version: entry.version }, 'ok', `cabinet:${req.user?.email || req.user?._id}`)
        res.json({ success: true })
    } catch (err) {
        console.error('[owner/changelog:delete]', err.message)
        res.status(500).json({ error: err.message })
    }
})

export default router
