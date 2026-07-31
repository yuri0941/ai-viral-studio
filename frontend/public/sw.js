self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    // Basic pass-through service worker stub.
    // Cache strategies can be added here later.
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })))
})
