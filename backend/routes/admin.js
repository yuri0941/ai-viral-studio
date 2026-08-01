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
    let provider = await PaymentProvider.findOne({ ownerId: req.user.id }).lean()
    if (!provider) {
      provider = {
        yookassaEnabled: false,
        yookassaShopId: '',
        yookassaSecretKey: '',
        stripeEnabled: false,
        stripeSecretKey: '',
        stripePublishableKey: '',
        stripeWebhookSecret: '',
      }
    }
    res.json({
      success: true,
      provider: {
        ...provider,
        yookassaSecretKey: maskSecret(provider.yookassaSecretKey),
        stripeSecretKey: maskSecret(provider.stripeSecretKey),
        stripeWebhookSecret: maskSecret(provider.stripeWebhookSecret),
      },
    })
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

    let provider = await PaymentProvider.findOne({ ownerId: req.user.id })
    if (!provider) {
      provider = new PaymentProvider({ ownerId: req.user.id })
    }

    provider.yookassaEnabled = !!yookassaEnabled
    if (yookassaShopId !== undefined) provider.yookassaShopId = yookassaShopId
    if (yookassaSecretKey && !yookassaSecretKey.includes('***')) {
      provider.yookassaSecretKey = yookassaSecretKey
    }

    provider.stripeEnabled = !!stripeEnabled
    if (stripeSecretKey && !stripeSecretKey.includes('***')) {
      provider.stripeSecretKey = stripeSecretKey
    }
    if (stripePublishableKey !== undefined) provider.stripePublishableKey = stripePublishableKey
    if (stripeWebhookSecret && !stripeWebhookSecret.includes('***')) {
      provider.stripeWebhookSecret = stripeWebhookSecret
    }

    provider.updatedAt = new Date()
    await provider.save()

    res.json({ success: true, message: 'Настройки сохранены' })
  } catch (err) {
    console.error('[admin:payment-providers:put]', err.message)
    res.status(500).json({ success: false, error: 'Ошибка сервера' })
  }
})

export { emergencyStop }
export default router
