import { getProviderKey } from '../services/aiService.js'
import User from '../models/User.js'

/**
 * [v9.9.19.7-SOCIAL-CONNECT-RESILIENT]
 * Unified integration status helper. Returns a consistent shape for UI and logs.
 * Never throws — missing keys are reported silently as configured:false.
 */
export async function integrationStatus(name, userId) {
  switch (name) {
    case 'vk': {
      const clientId = await getProviderKey('vk') || process.env.VK_APP_ID || process.env.VK_CLIENT_ID
      const secret = await getProviderKey('vk_secret') || process.env.VK_APP_SECRET || process.env.VK_CLIENT_SECRET
      const configured = !!(clientId && secret)
      let healthy = null
      let reason = null
      if (configured && userId) {
        const user = await User.findById(userId).select('socials.vk vkUserId vkToken').lean()
        const connected = !!(user?.socials?.vk?.userId || user?.vkUserId)
        healthy = connected
        reason = connected ? 'connected' : 'not_connected'
      }
      return { configured, healthy, reason, clientId: configured ? clientId : null }
    }
    case 'telegram': {
      const botToken = await getProviderKey('telegram_bot') || process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_OMEGA_BOT_TOKEN
      const configured = !!botToken
      let healthy = null
      let reason = null
      if (configured && userId) {
        const user = await User.findById(userId).select('telegramId telegramUsername socials.telegram').lean()
        const connected = !!(user?.telegramId || user?.socials?.telegram?.username)
        healthy = connected
        reason = connected ? 'connected' : 'not_connected'
      }
      return { configured, healthy, reason }
    }
    case 'yookassa': {
      const shopId = await getProviderKey('yookassa_shop_id') || process.env.YOOKASSA_SHOP_ID
      const secret = await getProviderKey('yookassa_secret') || process.env.YOOKASSA_SECRET_KEY
      const configured = !!(shopId && secret)
      return { configured, healthy: configured ? true : null, reason: configured ? 'ready' : 'missing_keys' }
    }
    default:
      return { configured: false, healthy: null, reason: 'unknown' }
  }
}
