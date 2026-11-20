const CACHE = 'ny-staff-offline-v1';
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.add('/staff-offline.html'))); self.skipWaiting();});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ny-staff-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));});
// Staff pages and records always come from the server. Only the generic offline page is cached.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/staff-offline.html').then(response => response || Response.error())));
});
