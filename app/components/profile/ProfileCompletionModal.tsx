'use client';

/**
 * ProfileCompletionModal — Dialog untuk melengkapi profil setelah signup
 * ─────────────────────────────────────────────────────────────────────
 * • Minta display_name & avatar_initials
 * • Validasi form
 * • Simpan ke profiles table
 * • Emit event saat selesai
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';

interface ProfileCompletionModalProps {
  userId: string;
  email: string;
  onComplete: () => void;
}

export function ProfileCompletionModal({
  userId,
  email,
  onComplete,
}: ProfileCompletionModalProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarInitials, setAvatarInitials] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Auto-generate avatar initials from display name
  useEffect(() => {
    if (displayName.trim()) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        setAvatarInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
      } else {
        setAvatarInitials(displayName.slice(0, 2).toUpperCase());
      }
    }
  }, [displayName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        variant: 'error',
        title: 'Nama diperlukan',
        description: 'Masukkan nama tampilan Anda.',
      });
      return;
    }

    if (!avatarInitials.trim() || avatarInitials.length > 3) {
      toast({
        variant: 'error',
        title: 'Avatar inisial tidak valid',
        description: 'Gunakan 2-3 karakter.',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        avatar_initials: avatarInitials.toUpperCase(),
      })
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'error',
        title: 'Gagal menyimpan profil',
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    toast({
      variant: 'success',
      title: 'Profil selesai!',
      description: `Halo ${displayName}, selamat datang di Zmayy!`,
    });

    setIsOpen(false);
    onComplete();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="profile-completion-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-overlay)' }}
          aria-modal="true"
          role="dialog"
          aria-label="Lengkapi profil"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="glass rounded-2xl w-full max-w-sm overflow-hidden p-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                Lengkapi Profil Anda
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Mari atur nama dan avatar untuk memulai.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Display Name */}
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Nama Tampilan
                </label>
                <input
                  id="display-name"
                  type="text"
                  placeholder="Contoh: Halo Duniya"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-primary)',
                  }}
                  aria-label="Masukkan nama tampilan Anda"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  Nama yang akan dilihat teman.
                </p>
              </div>

              {/* Avatar Initials */}
              <div>
                <label
                  htmlFor="avatar-initials"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Inisial Avatar (2-3 karakter)
                </label>
                <input
                  id="avatar-initials"
                  type="text"
                  placeholder="HD"
                  value={avatarInitials}
                  onChange={(e) => setAvatarInitials(e.target.value.slice(0, 3))}
                  disabled={isLoading}
                  maxLength={3}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-all text-center font-bold text-lg"
                  style={{
                    background: 'rgba(252, 213, 53, 0.1)',
                    border: '1px solid rgba(252, 213, 53, 0.3)',
                    color: 'var(--color-gold)',
                  }}
                  aria-label="Masukkan inisial avatar Anda"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  Akan ditampilkan dalam lingkaran emas.
                </p>
              </div>

              {/* Preview Avatar */}
              {avatarInitials && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center mt-4"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{
                      background: 'var(--color-gold)',
                      color: 'var(--color-base)',
                    }}
                  >
                    {avatarInitials}
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !displayName.trim()}
                className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-base)',
                }}
                aria-label="Simpan profil"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  <>
                    Lanjutkan
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                Anda dapat mengubah ini nanti di profil.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
