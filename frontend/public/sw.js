const CACHE_NAME = 'v9.9.14';

self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
  )).then(() => self.clients.claim()).then(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
    });
  }));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
