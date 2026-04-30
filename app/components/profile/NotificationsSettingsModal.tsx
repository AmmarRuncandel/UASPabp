'use client';

/**
 * NotificationsSettingsModal — Modal untuk pengaturan notifikasi
 * ───────────────────────────────────────────────────────────────
 * • Semua toggle terhubung langsung ke Supabase (instant update onChange)
 * • Kolom: notify_global, notify_requests, notify_messages, notify_sound
 * • Tidak ada tombol Simpan/Batal — perubahan langsung tersimpan
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

interface NotificationsSettingsModalProps {
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
    <div className={`flex items-center justify-between px-3 py-3 rounded-xl ${!disabled ? 'hover:bg-white/5' : 'opacity-50'}`}>
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
        onClick={() => !saving && !disabled && onChange(!enabled)}
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

export function NotificationsSettingsModal({
  profile,
  isOpen,
  onClose,
  onUpdate,
}: NotificationsSettingsModalProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [notifyGlobal,   setNotifyGlobal]   = useState(true);
  const [notifyRequests, setNotifyRequests] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifySound,    setNotifySound]    = useState(true);

  // Track which toggle is currently saving to prevent double-tap
  const [saving, setSaving] = useState<string | null>(null);

  // Sync initial state from profile prop whenever modal opens
  useEffect(() => {
    if (profile) {
      // notify_global falls back to legacy notifications_enabled
      setNotifyGlobal(profile.notify_global ?? profile.notifications_enabled ?? true);
      setNotifyRequests(profile.notify_requests ?? true);
      setNotifyMessages(profile.notify_messages ?? true);
      setNotifySound(profile.notify_sound ?? true);
    }
  }, [profile, isOpen]);

  // ── Generic instant-save helper ───────────────────────────────────────────
  async function handleToggle<K extends keyof Profile>(
    key: K,
    next: boolean,
    localSetter: (v: boolean) => void,
    savingKey: string,
    successMsg: string,
  ) {
    if (!profile) return;
    localSetter(next);
    setSaving(savingKey);

    const { error } = await supabase
      .from('profiles')
      .update({ [key]: next })
      .eq('id', profile.id);

    if (error) {
      // Revert optimistic update
      localSetter(!next);
      toast({ variant: 'error', title: 'Gagal menyimpan', description: error.message });
    } else {
      onUpdate?.({ [key]: next } as Partial<Profile>);
      toast({ variant: 'success', title: successMsg, description: '' });
    }
    setSaving(null);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="notifications-settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-overlay)' }}
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label="Pengaturan notifikasi"
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
                Notifikasi
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
              {/* Master toggle */}
              <ToggleSetting
                id="notifications-main-toggle"
                label="Aktifkan Notifikasi"
                description="Aktifkan atau matikan semua notifikasi"
                enabled={notifyGlobal}
                saving={saving === 'notify_global'}
                onChange={(next) =>
                  handleToggle(
                    'notify_global',
                    next,
                    setNotifyGlobal,
                    'notify_global',
                    next ? 'Notifikasi diaktifkan' : 'Notifikasi dimatikan',
                  )
                }
              />

              {notifyGlobal && (
                <>
                  <div className="h-px bg-white/5 my-3" />
                  <p className="text-xs font-bold uppercase tracking-widest px-3 mb-1" style={{ color: 'var(--color-muted)' }}>
                    Jenis Notifikasi
                  </p>

                  <ToggleSetting
                    id="notifications-friend-requests"
                    label="Permintaan Teman"
                    description="Saat seseorang mengirim permintaan pertemanan"
                    enabled={notifyRequests}
                    saving={saving === 'notify_requests'}
                    onChange={(next) =>
                      handleToggle(
                        'notify_requests',
                        next,
                        setNotifyRequests,
                        'notify_requests',
                        next ? 'Notifikasi permintaan teman aktif' : 'Notifikasi permintaan teman dimatikan',
                      )
                    }
                  />

                  <ToggleSetting
                    id="notifications-messages"
                    label="Pesan"
                    description="Pesan chat baru dari teman"
                    enabled={notifyMessages}
                    saving={saving === 'notify_messages'}
                    onChange={(next) =>
                      handleToggle(
                        'notify_messages',
                        next,
                        setNotifyMessages,
                        'notify_messages',
                        next ? 'Notifikasi pesan aktif' : 'Notifikasi pesan dimatikan',
                      )
                    }
                  />

                  <div className="h-px bg-white/5 my-3" />
                  <p className="text-xs font-bold uppercase tracking-widest px-3 mb-1" style={{ color: 'var(--color-muted)' }}>
                    Suara
                  </p>

                  <ToggleSetting
                    id="notifications-sound"
                    label="Suara Notifikasi"
                    description="Putar suara saat ada notifikasi baru"
                    enabled={notifySound}
                    saving={saving === 'notify_sound'}
                    onChange={(next) =>
                      handleToggle(
                        'notify_sound',
                        next,
                        setNotifySound,
                        'notify_sound',
                        next ? 'Suara notifikasi aktif' : 'Suara notifikasi dimatikan',
                      )
                    }
                  />
                </>
              )}
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
