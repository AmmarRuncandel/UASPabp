'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Radar, Home } from 'lucide-react';

// ── Radar ring ───────────────────────────────────────────────────────────────
function RadarRing({ delay, size }: { delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{
        width: size,
        height: size,
        borderColor: 'rgba(252,213,53,0.35)',
      }}
      animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeOut',
        delay,
      }}
    />
  );
}

// ── Spinning radar sweep ──────────────────────────────────────────────────────
function RadarSweep() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Ping rings */}
      <RadarRing size={80}  delay={0}   />
      <RadarRing size={130} delay={0.5} />
      <RadarRing size={180} delay={1.0} />

      {/* Outer circle */}
      <div
        className="absolute rounded-full"
        style={{
          width: 120,
          height: 120,
          border: '2px solid rgba(252,213,53,0.18)',
          background: 'rgba(252,213,53,0.04)',
        }}
      />

      {/* Spinning radar sweep line */}
      <motion.div
        className="absolute"
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, rgba(252,213,53,0.0) 0%, rgba(252,213,53,0.35) 30%, rgba(252,213,53,0.0) 60%)',
          transformOrigin: 'center',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
      />

      {/* Center icon */}
      <div
        className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          background: 'rgba(252,213,53,0.12)',
          border: '1.5px solid rgba(252,213,53,0.4)',
          boxShadow: '0 0 24px rgba(252,213,53,0.3)',
        }}
      >
        <Radar size={22} style={{ color: '#FCD535' }} />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function NotFoundClient() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center"
      style={{ background: '#0B0E11' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(252,213,53,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden="true"
      />

      {/* Animated radar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
      >
        <RadarSweep />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="flex flex-col gap-3"
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.3em]"
          style={{ color: 'rgba(252,213,53,0.6)' }}
        >
          Error 404
        </p>
        <h1
          className="text-3xl font-black tracking-tight"
          style={{ color: '#F0F0F0' }}
        >
          Coordinate Lost.
        </h1>
        <p
          className="text-sm max-w-xs leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          This location doesn't exist on the Zmayy map. The signal dropped before we could find it.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45 }}
      >
        <Link href="/">
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm cursor-pointer"
            style={{
              background: '#FCD535',
              color: '#0B0E11',
              boxShadow: '0 0 20px rgba(252,213,53,0.35)',
            }}
          >
            <Home size={16} />
            Return to Base
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}
