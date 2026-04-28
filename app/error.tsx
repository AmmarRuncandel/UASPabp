'use client'; // Error boundaries MUST be Client Components

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  /** Next.js 16: use unstable_retry() to re-fetch and re-render the segment. */
  unstable_retry: () => void;
}

// ── Glitch scanline ───────────────────────────────────────────────────────────
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 pointer-events-none"
      style={{ height: 2, background: 'rgba(252,213,53,0.08)' }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    />
  );
}

// ── Digit glitch ─────────────────────────────────────────────────────────────
function GlitchText({ text }: { text: string }) {
  return (
    <motion.span
      animate={{
        x: [0, -2, 2, -1, 1, 0],
        opacity: [1, 0.85, 1, 0.9, 1],
      }}
      transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3.5 }}
      className="inline-block"
      style={{ color: '#FCD535' }}
    >
      {text}
    </motion.span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ErrorPage({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    // In production, pipe to your error reporting service here
    console.error('[Zmayy Error Boundary]', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center relative overflow-hidden"
      style={{ background: '#0B0E11' }}
    >
      {/* Animated scan line */}
      <ScanLine />

      {/* Ambient red-gold glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, rgba(252,213,53,0.04) 40%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden="true"
      />

      {/* Icon cluster */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 220 }}
        className="relative flex items-center justify-center"
        style={{ width: 100, height: 100 }}
      >
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}
          animate={{ scale: [1, 1.18], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            background: 'rgba(239,68,68,0.10)',
            border: '1.5px solid rgba(239,68,68,0.35)',
            boxShadow: '0 0 24px rgba(239,68,68,0.2)',
          }}
        >
          <AlertTriangle size={28} style={{ color: '#EF4444' }} />
        </div>
      </motion.div>

      {/* Text block */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="flex flex-col gap-3"
      >
        {/* Badge */}
        <div className="flex items-center justify-center gap-2">
          <Wifi size={13} style={{ color: 'rgba(239,68,68,0.7)' }} />
          <p
            className="text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: 'rgba(239,68,68,0.7)' }}
          >
            System Glitch Detected
          </p>
        </div>

        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#F0F0F0' }}>
          <GlitchText text="Connection" /> Failed.
        </h1>

        <p
          className="text-sm max-w-xs leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          A critical signal error occurred. The Zmayy grid lost synchronization.
          {error.digest && (
            <>
              {' '}
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>
                ref: {error.digest}
              </span>
            </>
          )}
        </p>
      </motion.div>

      {/* Retry CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.45 }}
        className="flex flex-col items-center gap-3"
      >
        <motion.button
          id="error-retry-btn"
          onClick={unstable_retry}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm"
          style={{
            background: 'rgba(252,213,53,0.12)',
            border: '1.5px solid rgba(252,213,53,0.35)',
            color: '#FCD535',
            boxShadow: '0 0 16px rgba(252,213,53,0.15)',
          }}
          aria-label="Retry connection"
        >
          <RefreshCw size={15} />
          Retry Connection
        </motion.button>

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          If this persists, check your network and try again.
        </p>
      </motion.div>
    </div>
  );
}
