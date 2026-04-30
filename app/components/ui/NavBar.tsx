'use client';

import { useEffect, useState } from 'react';
import { Users, MessageCircle, User, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/app/components/ui/Toast';

// ── BeforeInstallPromptEvent type ──────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type ActiveSidebar = 'none' | 'friends' | 'chat' | 'profile';

interface NavBarProps {
  activeSidebar: ActiveSidebar;
  onToggle: (panel: ActiveSidebar) => void;
  isGhostMode: boolean;
  pendingCount?: number;
}

const NAV_ITEMS = [
  { id: 'friends', label: 'Teman',   Icon: Users },
  { id: 'chat',    label: 'Obrolan', Icon: MessageCircle },
  { id: 'profile', label: 'Profil',  Icon: User },
] as const;

export function NavBar({ activeSidebar, onToggle, isGhostMode, pendingCount = 0 }: NavBarProps) {
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) {
      toast({
        variant: 'info',
        title: 'Instalasi aplikasi belum siap',
        description: 'Tambahkan manifest dan service worker untuk mengaktifkan instalasi PWA di browser.',
      });
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstallBanner(false);
  }

  return (
    <>
      {/* ── PWA Install Button — bottom-left, above the "nearby" badge ── */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            key="pwa-install"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            /*
             * bottom-28 keeps it above the Leaflet "X friends nearby" badge
             * which sits at bottom-28 left-6 in MapViewInner.
             * We go to bottom-44 so there is a comfortable 16px gap.
             */
            className="fixed bottom-44 left-6 z-30 flex items-center gap-2"
          >
            <motion.button
              id="pwa-install-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={{
                borderColor:    'rgba(252,213,53,0.7)',
                color:          '#FCD535',
                background:     'rgba(11,14,17,0.75)',
                backdropFilter: 'blur(12px)',
                boxShadow:      '0 0 18px rgba(252,213,53,0.25), 0 0 6px rgba(252,213,53,0.12)',
              }}
              aria-label="Pasang aplikasi Zmayy"
            >
              {/* Glowing pulse dot */}
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#FCD535' }}
                />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#FCD535' }} />
              </span>
              <Download size={13} strokeWidth={2.2} />
              Pasang Aplikasi
            </motion.button>

            {/* Dismiss */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowInstallBanner(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-muted)', backdropFilter: 'blur(8px)' }}
              aria-label="Tutup prompt instalasi"
            >
              <X size={11} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Nav Bar ── */}
      <nav
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#181A20]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-2 py-2 flex items-center gap-1"
        aria-label="Navigasi utama"
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeSidebar === id;
          const hasBadge = id === 'friends' && pendingCount > 0;

          return (
            <motion.button
              key={id}
              id={`nav-${id}`}
              onClick={() => onToggle(id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl transition-all"
              style={
                isActive
                  ? { background: 'var(--color-gold)', color: 'var(--color-base)' }
                  : { color: 'var(--color-muted)' }
              }
              aria-label={label}
              aria-pressed={isActive}
            >
              {/* Ghost mode dot on Profile */}
              {id === 'profile' && isGhostMode && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: 'var(--color-gold)', borderColor: 'var(--color-surface)' }}
                  aria-label="Mode hantu aktif"
                />
              )}

              {/* Pending badge on Friends */}
              {hasBadge && !isActive && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border"
                  style={{ background: 'var(--color-gold)', color: 'var(--color-base)', borderColor: 'var(--color-surface)' }}
                  aria-label={`${pendingCount} permintaan pertemanan`}
                >
                  {pendingCount}
                </span>
              )}

              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
