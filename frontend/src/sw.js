import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NetworkOnly } from 'workbox-strategies'
import { setCatchHandler } from 'workbox-routing'

// VitePWA injects the precache manifest here
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Fallback to offline.html for navigation requests when network fails
const navigationFallback = new NetworkOnly({
  networkTimeoutSeconds: 3,
})
setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    return caches.match('/offline.html') || Response.error()
  }
  return Response.error()
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Viral Studio', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'default',
      data: data.url || '/',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }))
    })
  )
})
