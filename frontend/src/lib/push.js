export async function requestPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] not supported')
    return null
  }
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing
    const response = await fetch('/api/push/vapid-public-key')
    if (!response.ok) throw new Error('Failed to fetch VAPID key')
    const { publicKey } = await response.json()
    // 🔴 GUARD: если VAPID не настроен — не падаем
    if (!publicKey || publicKey.length < 20) {
      console.warn('[Push] VAPID key not configured')
      return null
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    })
    return subscription
  } catch (err) {
    console.error('[push] subscription failed:', err)
    return null
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Suppress Chrome extension runtime.lastError noise that can break push flows
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('runtime.lastError')) {
      e.preventDefault()
      console.warn('[Push] Chrome extension conflict suppressed')
    }
  })
}
