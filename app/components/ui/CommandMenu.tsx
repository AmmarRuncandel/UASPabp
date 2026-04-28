'use client';

/**
 * CommandMenu — Ctrl+K palette backed by real Supabase profiles
 * Searches profiles by username/display_name and lets users
 * open a chat or view a friend on the map.
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageCircle, MapPin } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

export function CommandMenu() {
  const supabase = createClient();

  const [open,    setOpen]   = useState(false);
  const [query,   setQuery]  = useState('');
  const [active,  setActive] = useState(0);
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcut ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setResults([]); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_initials, last_lat, last_lng')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(8);
      setResults((data ?? []) as Profile[]);
      setActive(0);
      setLoading(false);
    }, 280);

    return () => clearTimeout(t);
  }, [query, supabase]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((v) => Math.min(v + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((v) => Math.max(v - 1, 0)); }
    if (e.key === 'Enter' && results[active]) setOpen(false);
  }

  function getInitials(p: Profile) {
    return p.avatar_initials ?? p.username?.slice(0, 2).toUpperCase() ?? '??';
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div key="cmd-bd"
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(11,14,17,0.75)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)} />

          {/* Palette */}
          <motion.div key="cmd-palette"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{    opacity: 0, scale: 0.96, y: -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="fixed z-[201] left-1/2 top-[18%] w-full max-w-md -translate-x-1/2 rounded-2xl overflow-hidden"
            style={{ background: '#181A20', border: '1px solid rgba(252,213,53,0.18)', boxShadow: '0 0 60px rgba(0,0,0,0.7), 0 0 24px rgba(252,213,53,0.08)' }}
            role="dialog" aria-label="Command menu">

            {/* Search bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <Search size={16} style={{ color: 'rgba(252,213,53,0.7)', flexShrink: 0 }} />
              <input ref={inputRef} id="command-menu-input" type="text"
                placeholder="Cari pengguna, teman…"
                value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onKeyDown}
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#F0F0F0' }}
                aria-label="Command search" />
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>ESC</kbd>
              <button onClick={() => setOpen(false)} style={{ color: 'rgba(255,255,255,0.3)' }} aria-label="Close"><X size={14} /></button>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto py-2" role="listbox">
              {loading ? (
                <p className="text-center text-xs py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Mencari…</p>
              ) : results.length === 0 && query ? (
                <p className="text-center text-xs py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Pengguna tidak ditemukan untuk "{query}"</p>
              ) : results.length === 0 ? (
                <p className="text-center text-xs py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Ketik untuk mencari pengguna</p>
              ) : results.map((p, i) => (
                <motion.button key={p.id}
                  whileHover={{ background: 'rgba(252,213,53,0.06)' }}
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                  style={{ background: active === i ? 'rgba(252,213,53,0.08)' : 'transparent', borderLeft: active === i ? '2px solid #FCD535' : '2px solid transparent' }}
                  onMouseEnter={() => setActive(i)}
                  role="option" aria-selected={active === i}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#FCD535', color: '#0B0E11' }}>
                    {getInitials(p)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#F0F0F0' }}>
                      {p.display_name ?? p.username ?? 'User'}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      @{p.username} · {p.last_lat !== null ? 'Aktif baru-baru ini' : 'Tidak aktif'}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(252,213,53,0.7)' }} title="Pesan">
                      <MessageCircle size={12} />
                    </span>
                    <span className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(252,213,53,0.7)' }} title="Lihat di peta">
                      <MapPin size={12} />
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
              <span><kbd className="font-mono">↑↓</kbd> navigasi</span>
              <span><kbd className="font-mono">↵</kbd> pilih</span>
              <span className="ml-auto">Ctrl+K untuk buka/tutup</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
