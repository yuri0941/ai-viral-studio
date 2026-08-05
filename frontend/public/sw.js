const CACHE_VERSION = 'v6.4-force-2'

self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    // [v6.4] Clear all caches on activate to force clients to fetch the latest app
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.map((name) => caches.delete(name)))
        ).then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', (event) => {
    // Basic pass-through service worker stub.
    // Cache strategies can be added here later.
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })))
})
