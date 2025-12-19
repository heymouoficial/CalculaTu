/* Minimal PWA service worker (no plugin) */
const APP_CACHE = 'calculatu-app-v1';
const RUNTIME_CACHE = 'calculatu-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(['/', '/index.html', '/manifest.webmanifest', '/icon.svg']);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => ![APP_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k)));
      self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.status === 200) cache.put(request, resp.clone());
  return resp;
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const resp = await fetch(request);
    if (resp && resp.status === 200) cache.put(request, resp.clone());
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache API calls
  if (url.pathname.startsWith('/api/')) return;

  // HTML navigations: network-first for freshness, fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Assets + CDN resources: cache-first (opaque responses are fine)
  event.respondWith(cacheFirst(req));
});



