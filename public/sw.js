/**
 * Service Worker — Zmayy PWA v4
 * ─────────────────────────────────────────────────────────────────
 * Strategies:
 *  • install      : precache app shell + self.skipWaiting()
 *  • activate     : prune old caches + self.clients.claim()
 *  • fetch        :
 *      - cross-origin           → passthrough (Supabase, tile CDNs, QR API)
 *      - /api/*                 → network-first, cache on success
 *      - /_next/static/*        → cache-first (immutable hashed bundles)
 *      - HTML navigation        → network-first, offline shell fallback
 *      - everything else        → cache-first, then network, then 503
 *  • message      : SKIP_WAITING on demand (used by update prompt)
 *
 * Bump CACHE_VERSION on every production deploy to bust stale caches.
 */

const CACHE_VERSION = 'zmayy-v4';

/** Minimal app shell — must all respond with 200 at install time */
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
];

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => {
        // addAll is all-or-nothing; we wrap each entry individually so a
        // single missing asset doesn't abort the entire install.
        return Promise.allSettled(
          SHELL_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Could not precache:', url, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete — skipping wait');
        return self.skipWaiting();
      })
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_VERSION)
            .map((name) => {
              console.log('[SW] Removing old cache:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => {
        console.log('[SW] Activate complete — claiming clients');
        return self.clients.claim();
      })
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  const cacheNetworkResponse = async (cacheKey, networkResponse) => {
    const responseToCache = networkResponse.clone();
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(cacheKey, responseToCache);
    return networkResponse;
  };

  // ── 1. Passthrough: cross-origin (Supabase realtime, map tiles, QR API…)
  if (url.origin !== self.location.origin) return;

  // ── 2. Network-first: internal API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          event.waitUntil(cacheNetworkResponse(request, networkResponse));
        }
        return networkResponse;
      } catch {
        const cached = await caches.match(request);
        return cached ?? new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // ── 3. Cache-first: Next.js hashed static bundles (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        event.waitUntil(cacheNetworkResponse(request, networkResponse));
      }
      return networkResponse;
    })());
    return;
  }

  // ── 4. Network-first: HTML navigation — offline shell fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          event.waitUntil(cacheNetworkResponse(request, networkResponse));
        }
        return networkResponse;
      } catch {
        const exact = await caches.match(request);
        if (exact) return exact;

        const shell = await caches.match('/');
        if (shell) return shell;

        return new Response(
          '<!DOCTYPE html><html><head><title>Offline — Zmayy</title></head>' +
          '<body style="background:#0B0E11;color:#FCD535;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
          '<p>Kamu sedang offline. Sambungkan internet dan muat ulang halaman.</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      }
    })());
    return;
  }

  // ── 5. Cache-first: images, fonts, icons, manifests
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        event.waitUntil(cacheNetworkResponse(request, networkResponse));
      }
      return networkResponse;
    } catch {
      return new Response('Offline', { status: 503 });
    }
  })());
});

// ── Message ───────────────────────────────────────────────────────────────────
// Allows the app to trigger SW updates on demand (e.g. after a new deploy).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received — activating new worker');
    self.skipWaiting();
  }
});
