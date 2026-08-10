import { getProviderKey } from '../services/aiService.js'

let subscriptions = []

const FALLBACK_VAPID_PUBLIC_KEY = 'BPneHlBsvXyP8TGOXLjRkywbBff5I1eBX80fCwfRrIjvvwz4Pwd0oVjx5VVJsqKpl2ooN16JqUq_22cU515krIc'
const FALLBACK_VAPID_PRIVATE_KEY = 'gLJxni0ePesaNnYpfiXbpdnp8n6p69gPQGyHNbFePHs'

// [v9.9.19-MASTER-AUDIT] hot-reload: VAPID-ключи резолвятся в момент вызова (env → cache → MongoDB → fallback)
async function resolveVapidKeys() {
  try {
    const publicKey = (await getProviderKey('vapid_public')) || FALLBACK_VAPID_PUBLIC_KEY
    const privateKey = (await getProviderKey('vapid_private')) || FALLBACK_VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) return null
    return { publicKey, privateKey }
  } catch (e) {
    console.warn('[push] failed to resolve VAPID keys:', e.message)
    return { publicKey: FALLBACK_VAPID_PUBLIC_KEY, privateKey: FALLBACK_VAPID_PRIVATE_KEY }
  }
}

export const getVapidPublicKey = async (req, res) => {
  const vapidKeys = await resolveVapidKeys()
  if (!vapidKeys?.publicKey) {
    return res.status(503).json({ status: 'error', message: 'Push not configured' })
  }
  res.json({ publicKey: vapidKeys.publicKey })
}

export const subscribe = (req, res) => {
  const subscription = req.body
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ status: 'error', message: 'Invalid subscription' })
  }
  if (!subscriptions.some((s) => s.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription)
  }
  res.json({ status: 'ok' })
}

export const unsubscribe = (req, res) => {
  const { endpoint } = req.body
  subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint)
  res.json({ status: 'ok' })
}

export async function sendPush({ title, body, url = '/', tag = 'alert', category = 'omega', route = '/' }) {
  const vapidKeys = await resolveVapidKeys()
  if (!vapidKeys || subscriptions.length === 0) return
  let webPush
  try {
    webPush = await import('web-push')
    webPush.default.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@ai-viral-studio.pages.dev',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    )
  } catch (e) {
    console.warn('[push] web-push not installed:', e.message)
    return
  }

  const payload = JSON.stringify({ title, body, url, tag, category, route })
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.default.sendNotification(sub, payload)
      } catch (err) {
        console.error('[push] send failed:', err.statusCode, err.message)
        if (err.statusCode === 404 || err.statusCode === 410) {
          subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint)
        }
      }
    })
  )
}
