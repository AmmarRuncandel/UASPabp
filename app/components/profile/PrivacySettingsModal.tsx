'use client';

/**
 * PrivacySettingsModal — Modal untuk pengaturan privasi
 * ──────────────────────────────────────────────────────
 * • Toggle is_public terhubung langsung ke Supabase (instant update onChange)
 * • Tidak ada tombol Simpan/Batal — perubahan langsung tersimpan
 * • Hapus Akun diganti dengan instruksi kontak support (aman di client)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

interface PrivacySettingsModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updated: Partial<Profile>) => void;
}

function ToggleSetting({
  id,
  label,
  description,
  enabled,
  onChange,
  disabled,
  saving,
}: {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5">
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {description}
        </p>
      </div>
      <button
        id={id}
        onClick={() => !saving && onChange(!enabled)}
        disabled={disabled || saving}
        role="switch"
        aria-checked={enabled}
        className={`toggle-track flex-shrink-0 ml-3 ${enabled ? 'active' : ''} disabled:opacity-50 ${saving ? 'opacity-70' : ''}`}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

export function PrivacySettingsModal({
  profile,
  isOpen,
  onClose,
  onUpdate,
}: PrivacySettingsModalProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [isPublic,      setIsPublic]      = useState(true);
  const [savingPublic,  setSavingPublic]  = useState(false);

  // Sync initial state from profile prop whenever modal opens
  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public ?? true);
    }
  }, [profile, isOpen]);

  // ── Instant toggle handlers ────────────────────────────────────────────────
  async function handleTogglePublic(next: boolean) {
    if (!profile) return;
    setIsPublic(next);
    setSavingPublic(true);

    const { error } = await supabase
      .from('profiles')
      .update({ is_public: next })
      .eq('id', profile.id);

    if (error) {
      // Revert optimistic update
      setIsPublic(!next);
      toast({ variant: 'error', title: 'Gagal menyimpan', description: error.message });
    } else {
      onUpdate?.({ is_public: next });
      toast({
        variant: 'success',
        title: next ? 'Profil sekarang publik' : 'Profil sekarang privat',
        description: next
          ? 'Pengguna di sekitar dalam radius 1 km dapat melihat kamu di peta.'
          : 'Hanya teman yang dapat melihat lokasi kamu.',
      });
    }
    setSavingPublic(false);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="privacy-settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-overlay)' }}
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label="Pengaturan privasi"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="glass rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                Privasi &amp; Keamanan
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5"
                style={{ color: 'var(--color-muted)' }}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--color-muted)' }}>
                Visibilitas
              </p>

              <ToggleSetting
                id="privacy-public-profile"
                label="Profil Publik"
                description="Izinkan pengguna di sekitar (±1 km) melihat kamu di peta"
                enabled={isPublic}
                onChange={handleTogglePublic}
                saving={savingPublic}
              />

              <div className="h-px bg-white/5 my-3" />

              <p className="text-xs font-bold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--color-muted)' }}>
                Akun
              </p>

              {/* Safe delete account — no client-side admin call */}
              <div className="flex items-start gap-3 px-3 py-3 rounded-xl">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.12)' }}
                  aria-hidden="true"
                >
                  <Mail size={16} style={{ color: '#EF4444' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                    Hapus Akun
                  </p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    Untuk menghapus akun secara permanen, hubungi{' '}
                    <a
                      href="mailto:support@zmayy.com"
                      className="underline"
                      style={{ color: '#FCD535' }}
                    >
                      support@zmayy.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer — simple close */}
            <div
              className="p-4"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-primary)',
                }}
              >
                Selesai
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
