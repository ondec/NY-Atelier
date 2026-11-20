const CACHE = 'ny-studio-offline-v1';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.add('/studio-offline.html'))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ny-studio-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
// Never cache customer records, API responses, POST requests, or authenticated pages.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/studio-offline.html').then(response => response || Response.error())));
});
