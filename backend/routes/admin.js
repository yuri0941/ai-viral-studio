import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import PaymentProvider from '../models/PaymentProvider.js'
import {
  listClients, getClientDetails, deleteClientAccount, blockClient, unblockClient, getClientStats
} from '../services/userManager.js'
import { requestRefund, processRefund, listRefunds, getRefundStats } from '../services/refundService.js'
import { addIncome, addExpense, getMonthlyReport, getYearlyForecast, getTaxReminder } from '../services/financeService.js'
import { queryMesh } from '../services/cognitiveMesh.js'
import CognitiveNode from '../models/CognitiveNode.js'

const router = express.Router()

// In-memory emergency stop flag (NOT process.env)
let emergencyStop = false
const EMERGENCY_PIN = process.env.EMERGENCY_PIN || '0000'

router.post('/emergency-stop', protect, authorize('owner'), (req, res) => {
  emergencyStop = true
  console.log('[EMERGENCY STOP] activated by', req.user.email)
  res.json({ success: true, message: 'Emergency Stop активирован. Все AI-операции, публикации и AutoPilot остановлены.' })
})

router.post('/emergency-resume', protect, authorize('owner'), (req, res) => {
  const { pin } = req.body || {}
  if (pin !== EMERGENCY_PIN) {
    return res.status(403).json({ success: false, message: 'Неверный PIN-код' })
  }
  emergencyStop = false
  console.log('[EMERGENCY STOP] resumed by', req.user.email)
  res.json({ success: true, message: 'Emergency Stop снят' })
})

router.get('/emergency-status', protect, authorize('owner', 'admin'), (req, res) => {
  res.json({ success: true, emergencyStop })
})

function maskSecret(str) {
  if (!str || str.length < 8) return ''
  return str.slice(0, 4) + '...***'
}

router.get('/payment-providers', protect, authorize('owner'), async (req, res) => {
  try {
    const providers = await PaymentProvider.find().lean()
    const yookassa = providers.find(p => p.name === 'yookassa') || {}
    const stripe = providers.find(p => p.name === 'stripe') || {}

    const provider = {
      yookassaEnabled: yookassa.isActive || false,
      yookassaShopId: yookassa.config?.shopId || '',
      yookassaSecretKey: maskSecret(yookassa.config?.secretKey || ''),
      stripeEnabled: stripe.isActive || false,
      stripeSecretKey: maskSecret(stripe.config?.secretKey || ''),
      stripePublishableKey: stripe.config?.publicKey || '',
      stripeWebhookSecret: maskSecret(stripe.config?.webhookSecret || ''),
    }

    res.json({ success: true, provider })
  } catch (err) {
    console.error('[admin:payment-providers:get]', err.message)
    res.status(500).json({ success: false, error: 'Ошибка сервера' })
  }
})

router.put('/payment-providers', protect, authorize('owner'), async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    const {
      yookassaEnabled,
      yookassaShopId,
      yookassaSecretKey,
      stripeEnabled,
      stripeSecretKey,
      stripePublishableKey,
      stripeWebhookSecret,
    } = req.body

    if (yookassaEnabled !== undefined) {
      const update = {
        name: 'yookassa',
        displayName: 'ЮKassa',
        isActive: !!yookassaEnabled,
        supportedCountries: ['RU', 'KZ', 'BY'],
        defaultCurrency: 'RUB',
        commissionPercent: 3.5,
      }
      if (yookassaShopId !== undefined) update['config.shopId'] = yookassaShopId
      if (yookassaSecretKey && !yookassaSecretKey.includes('***')) update['config.secretKey'] = yookassaSecretKey
      await PaymentProvider.findOneAndUpdate({ name: 'yookassa' }, update, { upsert: true, new: true })
    }

    if (stripeEnabled !== undefined) {
      const update = {
        name: 'stripe',
        displayName: 'Stripe',
        isActive: !!stripeEnabled,
        supportedCountries: ['US', 'EU', 'GB'],
        defaultCurrency: 'USD',
        commissionPercent: 2.9,
      }
      if (stripeSecretKey && !stripeSecretKey.includes('***')) update['config.secretKey'] = stripeSecretKey
      if (stripePublishableKey !== undefined) update['config.publicKey'] = stripePublishableKey
      if (stripeWebhookSecret && !stripeWebhookSecret.includes('***')) update['config.webhookSecret'] = stripeWebhookSecret
      await PaymentProvider.findOneAndUpdate({ name: 'stripe' }, update, { upsert: true, new: true })
    }

    res.json({ success: true, message: 'Настройки сохранены' })
  } catch (err) {
    console.error('[admin:payment-providers:put]', err.message)
    res.status(500).json({ success: false, error: 'Ошибка сервера' })
  }
})

// === Users management (owner/admin only) ===
router.get('/users', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const clients = await listClients(req.user.id || req.user._id, req.query)
    res.json({ success: true, clients, count: clients.length })
  } catch (err) {
    console.error('[admin:users:list]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/users/stats/overview', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    res.json({ success: true, stats: await getClientStats() })
  } catch (err) {
    console.error('[admin:users:stats]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/users/:id', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const client = await getClientDetails(req.params.id, req.user.id || req.user._id)
    res.json({ success: true, client })
  } catch (err) {
    console.error('[admin:users:details]', err.message)
    res.status(err.message === 'Client not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

router.post('/users/:id/delete', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const result = await deleteClientAccount(req.params.id, req.user.id || req.user._id, req.body.reason)
    res.json(result)
  } catch (err) {
    console.error('[admin:users:delete]', err.message)
    res.status(err.message === 'Client not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

router.post('/users/:id/block', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const result = await blockClient(req.params.id, req.user.id || req.user._id, req.body.reason)
    res.json(result)
  } catch (err) {
    console.error('[admin:users:block]', err.message)
    res.status(err.message === 'Client not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

router.post('/users/:id/unblock', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const result = await unblockClient(req.params.id, req.user.id || req.user._id)
    res.json(result)
  } catch (err) {
    console.error('[admin:users:unblock]', err.message)
    res.status(err.message === 'Client not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

// === Refunds ===
router.get('/refunds', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    res.json({ success: true, refunds: listRefunds(req.query.status), stats: getRefundStats() })
  } catch (err) {
    console.error('[admin:refunds:list]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/refunds', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const refund = await requestRefund(req.body.userId, req.body.amount, req.body.reason, req.body.paymentId)
    res.json({ success: true, refund })
  } catch (err) {
    console.error('[admin:refunds:create]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/refunds/:id/process', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const yookassaEnabled = !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY)
    const refund = await processRefund(req.params.id, req.user.id || req.user._id, yookassaEnabled)
    res.json({ success: true, refund })
  } catch (err) {
    console.error('[admin:refunds:process]', err.message)
    res.status(err.message === 'Refund not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

// === Finance (taxes, income, expenses, forecast) ===
router.post('/finance/income', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const entry = await addIncome(req.body, req.user.id || req.user._id)
    res.json({ success: true, entry })
  } catch (err) {
    console.error('[admin:finance:income]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/finance/expense', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const entry = await addExpense(req.body, req.user.id || req.user._id)
    res.json({ success: true, entry })
  } catch (err) {
    console.error('[admin:finance:expense]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/finance/report', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { year, month } = req.query
    const report = getMonthlyReport(parseInt(year), parseInt(month), req.user.id || req.user._id)
    res.json({ success: true, report })
  } catch (err) {
    console.error('[admin:finance:report]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/finance/forecast', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    res.json({ success: true, forecast: getYearlyForecast(req.user.id || req.user._id) })
  } catch (err) {
    console.error('[admin:finance:forecast]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/finance/tax-reminder', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    res.json({ success: true, reminder: getTaxReminder() })
  } catch (err) {
    console.error('[admin:finance:tax-reminder]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// === Telegram bot stats from cognitive mesh ===
router.get('/telegram-bot-stats', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const nodes = await CognitiveNode.find({ source: 'telegram_bot', createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    const total = nodes.length
    const errors = nodes.filter(n => n.type === 'error' || /error|ошибка|fail/i.test(n.content)).length
    const successful = nodes.filter(n => n.metadata?.outcome === 'success' || n.confidence > 0.8).length
    const successRate = total > 0 ? (successful / total) : 0

    res.json({
      success: true,
      stats: { total, errors, successful, successRate },
      recentMessages: nodes.slice(0, 10).map(n => ({
        id: n._id,
        content: n.content?.slice(0, 200),
        type: n.type,
        confidence: n.confidence,
        createdAt: n.createdAt,
      })),
    })
  } catch (err) {
    console.error('[admin:telegram-bot-stats]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export { emergencyStop }
export default router
