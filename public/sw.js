/* PWA Service Worker - Modo Bunker (offline-first) */
const APP_CACHE = 'calculatu-app-v2';
const RUNTIME_CACHE = 'calculatu-runtime-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(APP_CACHE);
        await cache.addAll(CORE_ASSETS);
        self.skipWaiting();
      } catch (err) {
        console.error('SW install error:', err);
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name !== APP_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        );
        await self.clients.claim();
      } catch (err) {
        console.error('SW activate error:', err);
      }
    })()
  );
});

// Cache strategy: Network first, fallback to cache (modo bunker)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip external resources (CDNs, etc) - only cache same-origin
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          // Cache successful responses
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone()).catch(() => {
            // Ignore cache errors
          });
        }
        return networkResponse;
      } catch (err) {
        // Network failed - try cache (modo bunker)
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If no cache, try app cache for fallback (HTML only)
        if (request.mode === 'navigate') {
          const appCache = await caches.open(APP_CACHE);
          const fallback = await appCache.match('/index.html');
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })()
  );
});
