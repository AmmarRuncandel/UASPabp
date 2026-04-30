'use client';

/**
 * ServiceWorkerRegister — Mendaftarkan service worker untuk PWA
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60_000); // Every minute
        })
        .catch((error) => {
          console.warn('[SW] Service Worker registration failed:', error);
        });

      // Handle service worker updates
      let updateCheckTimer: NodeJS.Timeout;
      const checkUpdate = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SKIP_WAITING',
          });
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(updateCheckTimer);
        console.log('[SW] New service worker activated');
      });
    }
  }, []);

  return null;
}
