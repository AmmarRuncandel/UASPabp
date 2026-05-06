'use client';

/**
 * PrivacySettingsModal — Modal untuk pengaturan privasi
 * ──────────────────────────────────────────────────────
 * • Toggle is_public terhubung langsung ke Supabase (instant update onChange)
 * • Tidak ada tombol Simpan/Batal — perubahan langsung tersimpan
 * • Hapus Akun: konfirmasi 2 langkah → supabase.rpc('delete_user_account')
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const [isPublic,      setIsPublic]      = useState(true);
  const [savingPublic,  setSavingPublic]  = useState(false);

  // ── Delete account state ───────────────────────────────────────────────────
  // Step 1: show warning; Step 2: require confirmation text
  const [deleteStep,    setDeleteStep]    = useState<0 | 1 | 2>(0);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting,      setDeleting]      = useState(false);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  // Sync initial state from profile prop whenever modal opens
  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public ?? true);
    }
  }, [profile, isOpen]);

  // Reset delete state when modal closes
  useEffect(() => {
    if (!isOpen) { setDeleteStep(0); setDeleteConfirm(''); }
  }, [isOpen]);

  // Focus confirm input when step 2 opens
  useEffect(() => {
    if (deleteStep === 2) setTimeout(() => confirmInputRef.current?.focus(), 80);
  }, [deleteStep]);

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

  // ── Account deletion ───────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteConfirm !== 'HAPUS') return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      // Success: sign out and redirect
      await supabase.auth.signOut();
      toast({ variant: 'success', title: 'Akun dihapus', description: 'Akunmu telah berhasil dihapus secara permanen.' });
      router.replace('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus akun.';
      toast({ variant: 'error', title: 'Gagal menghapus akun', description: msg });
      setDeleting(false);
    }
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

              {/* ── Delete Account — multi-step confirmation ── */}
              <AnimatePresence mode="wait">
                {deleteStep === 0 && (
                  <motion.div
                    key="delete-idle"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/5 cursor-pointer"
                    onClick={() => setDeleteStep(1)}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.12)' }}
                      aria-hidden="true"
                    >
                      <Trash2 size={16} style={{ color: '#EF4444' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Hapus Akun</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Hapus akun dan semua data secara permanen</p>
                    </div>
                  </motion.div>
                )}

                {deleteStep === 1 && (
                  <motion.div
                    key="delete-warn"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="mx-1 px-4 py-4 rounded-xl space-y-3"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                      <p className="text-sm font-bold" style={{ color: '#EF4444' }}>Hapus Akun Secara Permanen?</p>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                      Tindakan ini <span className="font-bold" style={{ color: '#EF4444' }}>tidak dapat dibatalkan</span>. Seluruh data profil, teman, pesan, dan lokasi akan dihapus selamanya.
                    </p>
                    <div className="flex gap-2">
                      <button
                        id="delete-account-cancel-btn"
                        onClick={() => setDeleteStep(0)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
                      >
                        Batal
                      </button>
                      <button
                        id="delete-account-confirm-step1-btn"
                        onClick={() => setDeleteStep(2)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
                      >
                        Lanjutkan
                      </button>
                    </div>
                  </motion.div>
                )}

                {deleteStep === 2 && (
                  <motion.div
                    key="delete-confirm"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="mx-1 px-4 py-4 rounded-xl space-y-3"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.5)' }}
                  >
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
                      Ketik <span className="font-bold" style={{ color: '#EF4444' }}>HAPUS</span> untuk mengonfirmasi:
                    </p>
                    <input
                      ref={confirmInputRef}
                      id="delete-account-confirm-input"
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="HAPUS"
                      className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setDeleteStep(0); setDeleteConfirm(''); }}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
                      >
                        Batal
                      </button>
                      <button
                        id="delete-account-final-btn"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm !== 'HAPUS' || deleting}
                        className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                        style={{ background: '#EF4444', color: '#fff' }}
                      >
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        {deleting ? 'Menghapus…' : 'Hapus Sekarang'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
