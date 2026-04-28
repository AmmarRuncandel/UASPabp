'use client';

import { MapPin, Navigation, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'framer-motion';

// Simulated map pins for nearby friends
const MAP_PINS = [
  { id: 'p1', label: 'RP', top: '30%', left: '38%' },
  { id: 'p2', label: 'BS', top: '55%', left: '62%' },
  { id: 'p3', label: 'SW', top: '45%', left: '25%' },
  { id: 'p4', label: 'DP', top: '20%', left: '70%' },
];

interface MapViewProps {
  isGhostMode: boolean;
}

export function MapView({ isGhostMode }: MapViewProps) {
  return (
    <div className="map-bg relative w-full h-full overflow-hidden" aria-label="Map view">
      {/* Dummy road-like overlays are in CSS */}

      {/* Subtle city glow spots */}
      <div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ width: 400, height: 400, top: '10%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(30,50,80,0.4) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Friend map pins */}
      {MAP_PINS.map((pin, i) => (
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.12 + 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ top: pin.top, left: pin.left }}
          aria-label={`Friend ${pin.label} on map`}
        >
          <div className="relative">
            <div className="pulse-ring absolute inset-0 rounded-full" style={{ animationDelay: `${i * 0.5}s` }} />
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 shadow-lg cursor-pointer hover:scale-110 transition-transform"
              style={{ background: 'var(--color-surface)', color: 'var(--color-gold)', ringColor: 'var(--color-gold)' }}
            >
              {pin.label}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Current User Pin (center) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1"
        aria-label="Your location"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="relative"
        >
          {!isGhostMode && (
            <div
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: 'rgba(252,213,53,0.4)', transform: 'scale(1.5)' }}
              aria-hidden="true"
            />
          )}
          <div className="map-pin">
            <div className="map-pin-inner" />
          </div>
        </motion.div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: isGhostMode ? 'rgba(132,142,156,0.2)' : 'rgba(252,213,53,0.15)', color: isGhostMode ? 'var(--color-muted)' : 'var(--color-gold)' }}
        >
          {isGhostMode ? '👻 Ghost Mode' : 'You'}
        </span>
      </div>

      {/* Ghost Mode Overlay */}
      {isGhostMode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(11,14,17,0.3)', backdropFilter: 'blur(1px)' }}
          aria-label="Ghost mode active — location hidden"
        />
      )}

      {/* Map Controls (top-right) */}
      <div
        className="absolute top-6 right-6 flex flex-col gap-2 z-10"
        aria-label="Map controls"
      >
        {[
          { Icon: Navigation, id: 'map-recenter', label: 'Recenter map' },
          { Icon: Layers,     id: 'map-layers',   label: 'Switch map layer' },
          { Icon: ZoomIn,     id: 'map-zoom-in',  label: 'Zoom in' },
          { Icon: ZoomOut,    id: 'map-zoom-out', label: 'Zoom out' },
        ].map(({ Icon, id, label }) => (
          <motion.button
            key={id}
            id={id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="glass w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-muted)' }}
            aria-label={label}
          >
            <Icon size={17} />
          </motion.button>
        ))}
      </div>

      {/* Nearby count badge (bottom-left) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="glass absolute bottom-28 left-6 z-10 flex items-center gap-2 px-3 py-2 rounded-xl"
        aria-live="polite"
        aria-label="Nearby friends count"
      >
        <MapPin size={14} style={{ color: 'var(--color-gold)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          {isGhostMode ? '—' : '4'} friends nearby
        </span>
      </motion.div>
    </div>
  );
}
