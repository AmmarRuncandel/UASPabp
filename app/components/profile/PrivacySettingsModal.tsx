'use client';

/**
 * PrivacySettingsModal — Modal untuk pengaturan privasi
 * ──────────────────────────────────────────────────────
 * • Kontrol siapa yang dapat melihat profil
 * • Kontrol data lokasi
 * • Kontrol pemblokiran pengguna
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

interface PrivacySettingsModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

function ToggleSetting({
  id,
  label,
  description,
  enabled,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
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
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        role="switch"
        aria-checked={enabled}
        className={`toggle-track flex-shrink-0 ml-3 ${enabled ? 'active' : ''} disabled:opacity-50`}
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
}: PrivacySettingsModalProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [isPublic, setIsPublic] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public ?? true);
    }
  }, [profile, isOpen]);

  async function handleSave() {
    if (!profile) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        is_public: isPublic,
      })
      .eq('id', profile.id);

    if (error) {
      toast({
        variant: 'error',
        title: 'Gagal menyimpan',
        description: error.message,
      });
    } else {
      toast({
        variant: 'success',
        title: 'Pengaturan privasi berhasil',
        description: 'Preferensi Anda telah disimpan.',
      });
      onClose();
    }

    setIsLoading(false);
  }

  async function handleDeleteAccount() {
    if (!profile) return;

    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menghapus akun Anda? Tindakan ini tidak dapat dibatalkan.'
    );

    if (!confirmed) return;

    setDeletingAccount(true);

    // Call edge function or delete manually
    const { error } = await supabase.auth.admin.deleteUser(profile.id);

    if (error) {
      toast({
        variant: 'error',
        title: 'Gagal menghapus akun',
        description: error.message,
      });
    } else {
      toast({
        variant: 'success',
        title: 'Akun berhasil dihapus',
        description: 'Akun Anda telah dihapus dari sistem.',
      });
      // Redirect after deletion
      window.location.href = '/login';
    }

    setDeletingAccount(false);
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
              <ToggleSetting
                id="privacy-public-profile"
                label="Profil Publik"
                description="Izinkan teman menemukan profil Anda"
                enabled={isPublic}
                onChange={setIsPublic}
              />

              <ToggleSetting
                id="privacy-share-location"
                label="Bagikan Lokasi"
                description="Teman dapat melihat lokasi Anda di peta"
                enabled={shareLocation}
                onChange={setShareLocation}
                disabled={true}
              />

              <div className="h-px bg-white/5 my-3" />

              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                Akun
              </p>

              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.15)' }}
                  aria-hidden="true"
                >
                  <Trash2 size={18} style={{ color: '#EF4444' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                    Hapus Akun
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Hapus akun dan semua data Anda secara permanen
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div
              className="flex gap-2 p-4"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-primary)',
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-base)',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
