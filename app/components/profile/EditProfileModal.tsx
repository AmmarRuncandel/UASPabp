'use client';

/**
 * EditProfileModal — Modal untuk edit profil pengguna
 * ──────────────────────────────────────────────────
 * • Edit display_name & avatar_initials
 * • Simpan perubahan ke Supabase
 * • Validasi input
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

interface EditProfileModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EditProfileModal({
  profile,
  isOpen,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarInitials, setAvatarInitials] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarInitials(profile.avatar_initials || '');
    }
  }, [profile, isOpen]);

  // Detect changes
  useEffect(() => {
    if (profile) {
      const changed =
        displayName !== (profile.display_name || '') ||
        avatarInitials !== (profile.avatar_initials || '');
      setHasChanges(changed);
    }
  }, [displayName, avatarInitials, profile]);

  // Auto-generate avatar initials from display name
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (value.trim()) {
      const parts = value.trim().split(/\s+/);
      if (parts.length >= 2) {
        setAvatarInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
      } else {
        setAvatarInitials(value.slice(0, 2).toUpperCase());
      }
    }
  };

  async function handleSave(e: React.FormEvent) {
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

    if (!profile) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        avatar_initials: avatarInitials.toUpperCase(),
      })
      .eq('id', profile.id);

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
      title: 'Profil berhasil diperbarui',
      description: 'Perubahan Anda telah disimpan.',
    });

    setIsLoading(false);
    setHasChanges(false);
    onSave();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="edit-profile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-overlay)' }}
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label="Edit profil"
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
                Edit Profil
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

            {/* Form */}
            <form onSubmit={handleSave} className="p-4 space-y-4">
              {/* Display Name */}
              <div>
                <label
                  htmlFor="edit-display-name"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Nama Tampilan
                </label>
                <input
                  id="edit-display-name"
                  type="text"
                  placeholder="Contoh: Halo Duniya"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-primary)',
                  }}
                />
              </div>

              {/* Avatar Initials */}
              <div>
                <label
                  htmlFor="edit-avatar-initials"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Inisial Avatar
                </label>
                <input
                  id="edit-avatar-initials"
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
                />
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

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
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
                  type="submit"
                  disabled={isLoading || !hasChanges}
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
                    <>
                      <Check size={16} />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
