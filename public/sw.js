/**
 * Service Worker untuk Zmayy PWA — v2
 * ─────────────────────────────────────
 * • Precache UI shell assets (cache busting: bump CACHE_NAME setiap deploy besar)
 * • Cache-first strategy untuk static assets & _next/static
 * • Network-first untuk API calls (supabase / internal /api)
 * • Navigation fallback: offline → serve cached '/' shell
 * • Offline HTML fallback untuk non-navigasi request
 */

const CACHE_NAME = 'zmayy-v2';

/** Assets yang pasti di-precache saat install */
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/images/zmay_logo.png',
];

// ── Install: cache shell ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(SHELL_URLS).catch((err) => {
        // Non-fatal: some assets might not exist yet
        console.warn('[SW] Some shell assets could not be cached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete stale caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // ── 1. Skip cross-origin requests (Supabase, QR API, Leaflet tiles, etc.)
  if (url.origin !== self.location.origin) return;

  // ── 2. Network-first for internal API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached ?? new Response('Offline — API não disponível', { status: 503 })
          )
        )
    );
    return;
  }

  // ── 3. Cache-first for _next/static (immutable hashed bundles)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── 4. HTML navigation: network-first with '/' shell fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache navigations so root shell is available offline
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Try exact match first, then root shell, then offline page
          const exact  = await caches.match(request);
          if (exact) return exact;
          const shell  = await caches.match('/');
          if (shell) return shell;
          const offline = await caches.match('/offline.html');
          return offline ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // ── 5. Cache-first for everything else (images, fonts, icons…)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => new Response('Offline', { status: 503 }));
    })
  );
});

// ── Message handler (SKIP_WAITING from update prompt) ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
