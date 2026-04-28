'use client';

import { useCallback, useRef } from 'react';

type SoundType = 'pop' | 'send' | 'toggle';

/**
 * useSound — generates micro-sounds via Web Audio API.
 * No external files required. Server-safe (AudioContext is gated behind
 * a browser check so it never runs during SSR).
 */
export function useSound() {
  // Lazily created AudioContext — one per component instance
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: SoundType = 'pop') => {
    if (typeof window === 'undefined') return;

    try {
      // Create or resume context
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext ||
          (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc    = ctx.createOscillator();
      const gain   = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'pop') {
        // Soft, round UI pop — sine wave dropping quickly
        osc.type = 'sine';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'send') {
        // Upward "whoosh" — quick ascending sine
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'toggle') {
        // Double-click feel — two short pops
        [0, 0.06].forEach((offset, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(i === 0 ? 520 : 680, now + offset);
          g.gain.setValueAtTime(0.14, now + offset);
          g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.07);
          o.start(now + offset);
          o.stop(now + offset + 0.07);
        });
      }
    } catch {
      // Silently fail — audio is purely cosmetic
    }
  }, []);

  return { play };
}
