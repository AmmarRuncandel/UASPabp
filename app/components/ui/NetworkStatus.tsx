'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(window.navigator.onLine);
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0,       opacity: 1 }}
          exit={{    y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2.5 px-4 py-2.5"
          style={{
            background: 'linear-gradient(90deg,rgba(31,10,10,0.97),rgba(24,12,12,0.97))',
            borderBottom: '1px solid rgba(239,68,68,0.25)',
            backdropFilter: 'blur(12px)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: '#EF4444' }}
              animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#EF4444' }} />
          </span>
          <WifiOff size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
          <p className="text-xs font-medium" style={{ color: '#F0F0F0' }}>
            Connection lost.{' '}
            <span style={{ color: 'rgba(252,213,53,0.8)' }}>Showing last known coordinates.</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
