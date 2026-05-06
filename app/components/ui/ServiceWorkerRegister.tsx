'use client';

/**
 * ServiceWorkerRegister — Registers /sw.js and handles lifecycle events
 * ──────────────────────────────────────────────────────────────────────
 * • Registers the SW on mount (browser-only, SSR-safe)
 * • Polls for updates every 60 s
 * • The controllerchange reload is GATED behind a flag that is only set
 *   when WE triggered a SKIP_WAITING (via the message channel). This
 *   prevents an infinite reload loop on the very first SW install.
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Track whether we sent a SKIP_WAITING so we only reload intentionally
    let skipWaitingPending = false;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered, scope:', registration.scope);

        // Periodic update check (every 60 s) — quietly ignores offline errors
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60_000);

        // When a new SW is found in waiting, send SKIP_WAITING
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version ready — activate it immediately
              skipWaitingPending = true;
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });

    // Only reload when WE triggered SKIP_WAITING, not on initial install
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!skipWaitingPending) return;
      skipWaitingPending = false;
      console.log('[SW] New worker active — reloading for fresh build');
      window.location.reload();
    });
  }, []);

  return null;
}
