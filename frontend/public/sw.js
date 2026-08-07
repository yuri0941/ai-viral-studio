const CACHE_NAME = 'v6.6-omega-2026';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
