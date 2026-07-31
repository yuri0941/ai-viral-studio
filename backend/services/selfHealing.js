import cron from 'node-cron'
import axios from 'axios'
import { alertOwner } from './ownerBot.js'
import { chatWithAI } from './aiService.js'

let healingJob = null
let consecutiveErrors = 0
const MAX_ERRORS = 2
let preferredProvider = 'groq'

const BASE_URL = process.env.SELF_HEALING_BASE_URL || `http://localhost:${process.env.PORT || 5000}`

async function checkHealth() {
  try {
    const res = await axios.get(`${BASE_URL}/api/health`, { timeout: 10000 })
    if (res.status === 200 && res.data?.status === 'ok') {
      consecutiveErrors = 0
      return true
    }
    throw new Error(`Unexpected status ${res.status}`)
  } catch (err) {
    consecutiveErrors++
    console.error(`[selfHealing] health check failed #${consecutiveErrors}:`, err.message)
    return false
  }
}

async function checkAIProviders() {
  const providers = ['groq', 'openrouter', 'deepseek']
  for (const provider of providers) {
    try {
      const messages = [
        { role: 'system', content: 'You are a health check assistant. Reply with OK.' },
        { role: 'user', content: 'OK?' },
      ]
      const result = await chatWithAI('OK?', messages)
      if (result?.success && result?.provider === provider) {
        if (preferredProvider !== provider) {
          preferredProvider = provider
          await alertOwner(`🔄 Self-Healing: переключён AI-провайдер на ${provider}`).catch(() => {})
        }
        return
      }
    } catch (err) {
      console.warn(`[selfHealing] provider ${provider} check failed:`, err.message)
    }
  }
}

async function runHealingTick() {
  const healthy = await checkHealth()

  if (!healthy && consecutiveErrors >= MAX_ERRORS) {
    await alertOwner(`🚨 Self-Healing: обнаружены ${consecutiveErrors} ошибки подряд. Сервер будет перезапущен.`).catch(() => {})
    console.error('[selfHealing] max errors reached, restarting process...')
    process.exit(1)
  }

  await checkAIProviders().catch(err => console.error('[selfHealing] AI provider check failed:', err.message))
}

export function startSelfHealing() {
  if (healingJob) return
  healingJob = cron.schedule('*/5 * * * *', runHealingTick)
  console.log('[selfHealing] cron started (every 5 min)')
}

export function stopSelfHealing() {
  if (healingJob) {
    healingJob.stop()
    healingJob = null
  }
}

export function getPreferredProvider() {
  return preferredProvider
}

export default { startSelfHealing, stopSelfHealing, getPreferredProvider }
