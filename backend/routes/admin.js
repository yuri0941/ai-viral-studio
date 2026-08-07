import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import PaymentProvider from '../models/PaymentProvider.js'

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

export { emergencyStop }
export default router
