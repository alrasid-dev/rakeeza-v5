/* Rakeeza SW — cache shell only; never touch API/export (avoids empty JSON/PDF via HTML fallback). */
const CACHE = 'rakeeza-v5-cache-v2';
const ASSETS = ['/manifest.json', '/logo.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Same-origin API, Next data, exports, auth — network only
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/documents/') ||
    url.pathname.includes('.')
  ) {
    return; // default browser fetch — no respondWith
  }

  // Navigations: network-first, cache shell as last resort only for document navigations
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match('/login').then((c) => c || caches.match('/manifest.json')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
