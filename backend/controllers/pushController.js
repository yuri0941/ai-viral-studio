let subscriptions = []

const FALLBACK_VAPID_PUBLIC_KEY = 'BPneHlBsvXyP8TGOXLjRkywbBff5I1eBX80fCwfRrIjvvwz4Pwd0oVjx5VVJsqKpl2ooN16JqUq_22cU515krIc'
const FALLBACK_VAPID_PRIVATE_KEY = 'gLJxni0ePesaNnYpfiXbpdnp8n6p69gPQGyHNbFePHs'

let vapidKeys = null

try {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY || FALLBACK_VAPID_PRIVATE_KEY,
  }
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn('[push] VAPID keys not set; push notifications disabled')
    vapidKeys = null
  }
} catch (e) {
  console.warn('[push] failed to load VAPID keys:', e.message)
}

export const getVapidPublicKey = (req, res) => {
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
