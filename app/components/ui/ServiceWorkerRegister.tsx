'use client';

/**
 * ServiceWorkerRegister — Mendaftarkan service worker untuk PWA
 * • Reload otomatis saat SW baru aktif (seamless update)
 * • Periksa update setiap 60 detik
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);

        // Check for updates periodically (every 60 s)
        const updateInterval = setInterval(() => {
          registration.update().catch(() => {/* offline — ignore */});
        }, 60_000);

        // Cleanup interval when component unmounts (rare but safe)
        return () => clearInterval(updateInterval);
      })
      .catch((error) => {
        console.warn('[SW] Registration failed:', error);
      });

    // When a new SW takes control, reload the page to activate the latest build
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] New service worker activated — reloading page');
      window.location.reload();
    });
  }, []);

  return null;
}
