import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// VitePWA injects the precache manifest here
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// [P21] added: cache API responses (Stale-While-Revalidate)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/omega/chat'),
  new StaleWhileRevalidate({
    cacheName: 'omega-chat-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
)

// [P21] added: cache images from Pollinations and other CDNs
registerRoute(
  ({ url }) => url.pathname.match(/\.(?:png|jpg|jpeg|webp|avif|gif|svg)$/),
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })
    ]
  })
)

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

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts' || event.tag === 'sync-messages') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_TRIGGERED', tag: event.tag }))
      })
    )
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  // [P21] added: notification categories
  const categoryStyles = {
    omega: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png' },
    payment: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png' },
    crisis: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png' },
    task: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png' },
  }
  const style = categoryStyles[data.category] || categoryStyles.omega
  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Viral Studio', {
      body: data.body || '',
      icon: style.icon,
      badge: style.badge,
      tag: data.tag || 'default',
      data: data.url || '/',
      requireInteraction: data.category === 'crisis',
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
