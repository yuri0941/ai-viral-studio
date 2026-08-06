const CACHE_NAME = 'v6.6-kill-cache-2026';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(n => Promise.all(n.map(c => caches.delete(c)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
