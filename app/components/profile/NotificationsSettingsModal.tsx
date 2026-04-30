'use client';

/**
 * NotificationsSettingsModal — Modal untuk pengaturan notifikasi
 * ───────────────────────────────────────────────────────────────
 * • Toggle untuk berbagai tipe notifikasi
 * • Simpan preferensi ke database
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/app/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

interface NotificationsSettingsModalProps {
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

export function NotificationsSettingsModal({
  profile,
  isOpen,
  onClose,
}: NotificationsSettingsModalProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [friendRequests, setFriendRequests] = useState(true);
  const [messages, setMessages] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setNotificationsEnabled(profile.notifications_enabled ?? true);
    }
  }, [profile, isOpen]);

  async function handleSave() {
    if (!profile) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        notifications_enabled: notificationsEnabled,
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
        title: 'Pengaturan notifikasi berhasil',
        description: 'Preferensi Anda telah disimpan.',
      });
      onClose();
    }

    setIsLoading(false);
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
              <ToggleSetting
                id="notifications-main-toggle"
                label="Aktifkan Notifikasi"
                description="Terima semua notifikasi"
                enabled={notificationsEnabled}
                onChange={setNotificationsEnabled}
              />

              {notificationsEnabled && (
                <>
                  <div className="h-px bg-white/5 my-3" />

                  <ToggleSetting
                    id="notifications-friend-requests"
                    label="Permintaan Teman"
                    description="Saat seseorang mengirim permintaan pertemanan"
                    enabled={friendRequests}
                    onChange={setFriendRequests}
                    disabled={true}
                  />

                  <ToggleSetting
                    id="notifications-messages"
                    label="Pesan"
                    description="Pesan chat baru dari teman"
                    enabled={messages}
                    onChange={setMessages}
                    disabled={true}
                  />

                  <ToggleSetting
                    id="notifications-sound"
                    label="Suara Notifikasi"
                    description="Putar suara saat ada notifikasi baru"
                    enabled={soundEnabled}
                    onChange={setSoundEnabled}
                  />
                </>
              )}
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
