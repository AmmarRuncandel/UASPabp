'use client';

/**
 * ProfileModal — Tampilan profil pengguna nyata dari Supabase
 * ─────────────────────────────────────────────────────────────
 * • Mengambil data pengguna dari auth.getUser() + tabel profiles
 * • QR code fungsional via api.qrserver.com
 * • Tombol Keluar memanggil supabase.auth.signOut()
 * • Semua teks dalam Bahasa Indonesia
 */

import { useEffect, useState } from 'react';
import {
  X, Eye, EyeOff, LogOut, MapPin, Bell, ShieldCheck, Nfc,
  ScanLine, Settings, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast }        from '@/app/components/ui/Toast';
import { useSound }        from '@/app/hooks/useSound';
import { createClient }    from '@/utils/supabase/client';
import type { Profile }    from '@/utils/supabase/types';

type NFCWriter = {
  write: (data: string) => Promise<void>;
};

type NFCWindow = Window & {
  NDEFReader?: new () => NFCWriter;
};

interface ProfileModalProps {
  isGhostMode: boolean;
  onToggleGhost: () => void;
  onClose: () => void;
  onLogout: () => void;
}

// ── Setting Row ───────────────────────────────────────────────────────────────
function SettingRow({
  id, Icon, title, subtitle, trailing, onClick,
}: {
  id: string;
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors hover:bg-white/5"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.05)' }}
        aria-hidden="true"
      >
        <Icon size={18} style={{ color: 'var(--color-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{title}</p>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>
      </div>
      {trailing}
    </button>
  );
}

// ── ProfileModal ──────────────────────────────────────────────────────────────
export function ProfileModal({
  isGhostMode,
  onToggleGhost,
  onClose,
  onLogout,
}: ProfileModalProps) {
  const supabase   = createClient();
  const router     = useRouter();
  const { toast }  = useToast();
  const { play }   = useSound();

  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [email,         setEmail]         = useState<string | null>(null);
  const [userId,        setUserId]        = useState<string | null>(null);
  const [loadingUser,   setLoadingUser]   = useState(true);
  const [loggingOut,    setLoggingOut]    = useState(false);
  const [isOnlineNow,   setIsOnlineNow]   = useState(false);

  function lastSeenText(updatedAt: string | null | undefined) {
    if (!updatedAt) return '—';
    const then = new Date(updatedAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - then) / 1000));
    if (diff < 60) return 'Online sekarang';
    if (diff < 3600) return `Terakhir aktif ${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `Terakhir aktif ${Math.floor(diff / 3600)} jam lalu`;
    return `Terakhir aktif ${Math.floor(diff / 86400)} hari lalu`;
  }

  // ── Fetch real user data ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchUser() {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingUser(false); return; }

      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data as Profile);
      setLoadingUser(false);
    }
    fetchUser();
  }, [supabase]);

  // ── Derived display values ─────────────────────────────────────────────────
  const displayName = profile?.display_name ?? profile?.username ?? email?.split('@')[0] ?? 'Pengguna';
  const username    = profile?.username ?? email?.split('@')[0] ?? '—';
  const initials    = profile?.avatar_initials
    ?? username.slice(0, 2).toUpperCase();

  const qrData = userId
    ? `https://zmayy.com/u/${userId}`
    : 'https://zmayy.com';
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=0B0E11&margin=4`;

  useEffect(() => {
    // compute online-now based on profile.updated_at; refresh every 30s
    function updateOnline() {
      const updated = profile?.updated_at ?? null;
      if (!updated) { setIsOnlineNow(false); return; }
      const then = new Date(updated).getTime();
      setIsOnlineNow(Date.now() - then < 60_000);
    }
    updateOnline();
    const iv = setInterval(updateOnline, 30_000);
    return () => clearInterval(iv);
  }, [profile?.updated_at]);

  // ── Ghost mode toggle ──────────────────────────────────────────────────────
  function handleToggleGhost() {
    const next = !isGhostMode;
    onToggleGhost();
    play('toggle');
    toast(
      next
        ? { variant: 'warning', title: 'Mode Hantu Aktif',    description: 'Lokasimu sekarang tersembunyi dari teman.' }
        : { variant: 'info',    title: 'Mode Hantu Nonaktif', description: 'Lokasimu kini terlihat oleh teman.' }
    );
  }

    async function handleShareViaNfc() {
      const targetUrl = qrData;

      try {
        if (typeof window !== 'undefined' && 'NDEFReader' in window && (window as NFCWindow).NDEFReader) {
          const reader = new (window as NFCWindow).NDEFReader!();
          await reader.write(targetUrl);
          toast({
            variant: 'success',
            title: 'NFC siap digunakan',
            description: 'Tempelkan perangkat ke tag NFC untuk menulis tautan profil.',
          });
          return;
        }

        if (navigator.share) {
          await navigator.share({
            title: 'Profil Zmayy',
            text: `Lihat profil ${displayName}`,
            url: targetUrl,
          });
          return;
        }

        await navigator.clipboard.writeText(targetUrl);
        toast({
          variant: 'info',
          title: 'Tautan profil disalin',
          description: 'Perangkat ini belum mendukung NFC, jadi tautan profil disalin ke clipboard.',
        });
      } catch {
        try {
          await navigator.clipboard.writeText(targetUrl);
          toast({
            variant: 'warning',
            title: 'NFC tidak tersedia',
            description: 'Tautan profil disalin sebagai cadangan.',
          });
        } catch {
          toast({
            variant: 'error',
            title: 'Gagal membagikan profil',
            description: 'Coba lagi di browser yang mendukung Web NFC atau gunakan QR code.',
          });
        }
      }
    }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    onLogout();
    router.replace('/login');
  }

  return (
    <motion.div
      key="profile-modal-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'var(--color-overlay)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Profil dan pengaturan"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0    }}
        exit={{    opacity: 0, scale: 0.92, y: 20   }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="glass rounded-2xl w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Profile Hero ── */}
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(252,213,53,0.08) 0%, transparent 60%)' }}
        >
          <button
            id="close-profile-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Tutup modal profil"
          >
            <X size={18} />
          </button>

          {/* Avatar */}
          <AnimatePresence mode="wait">
            {loadingUser ? (
              <motion.div
                key="avatar-loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(252,213,53,0.1)' }}
              >
                <Loader2 size={24} className="animate-spin" style={{ color: '#FCD535' }} />
              </motion.div>
            ) : (
              <motion.div
                key="avatar"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3"
                style={{ background: 'var(--color-gold)', color: 'var(--color-base)', boxShadow: '0 0 0 4px rgba(252,213,53,0.3)' }}
                aria-hidden="true"
              >
                {initials}
              </motion.div>
            )}
          </AnimatePresence>

          <h3 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            {loadingUser ? '—' : displayName}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {loadingUser ? '—' : `@${username}`}
          </p>
          {email && !loadingUser && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{email}</p>
          )}

          {/* Last seen / Online */}
          <p className="text-xs mt-1" style={{ color: isOnlineNow ? '#2ECC71' : 'var(--color-muted)' }}>
            {loadingUser ? '—' : lastSeenText(profile?.updated_at)}
          </p>
        </div>

        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* ── Settings ── */}
        <div className="px-4 py-4 space-y-1">
          {/* Ghost Mode — custom toggle row */}
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl"
            style={{ background: isGhostMode ? 'rgba(252,213,53,0.06)' : 'transparent' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isGhostMode ? 'rgba(252,213,53,0.15)' : 'rgba(255,255,255,0.05)' }}
              aria-hidden="true"
            >
              {isGhostMode
                ? <EyeOff size={18} style={{ color: 'var(--color-gold)' }} />
                : <Eye    size={18} style={{ color: 'var(--color-muted)' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: isGhostMode ? 'var(--color-gold)' : 'var(--color-primary)' }}>
                Mode Hantu
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Sembunyikan lokasi dari teman
              </p>
            </div>
            <button
              id="ghost-mode-toggle"
              onClick={handleToggleGhost}
              role="switch"
              aria-checked={isGhostMode}
              aria-label="Aktifkan mode hantu"
              className={`toggle-track flex-shrink-0 ${isGhostMode ? 'active' : ''}`}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          <SettingRow
            id="profile-location-btn"
            Icon={MapPin}
            title="Berbagi Lokasi"
            subtitle="Hanya teman"
            onClick={() => toast({ variant: 'info', title: 'Berbagi lokasi', description: 'Pengaturan ini akan aktif setelah logika privasi lokasi selesai dihubungkan.' })}
          />
          <SettingRow
            id="profile-notifications-btn"
            Icon={Bell}
            title="Notifikasi"
            subtitle="Semua aktif"
            onClick={() => toast({ variant: 'info', title: 'Notifikasi', description: 'Panel pengaturan notifikasi sedang disiapkan.' })}
          />
          <SettingRow
            id="profile-privacy-btn"
            Icon={ShieldCheck}
            title="Privasi &amp; Keamanan"
            subtitle="Kelola data &amp; pemblokiran"
            onClick={() => toast({ variant: 'info', title: 'Privasi & keamanan', description: 'Pengaturan detail privasi akan menyusul setelah lapisan data siap.' })}
          />
          <SettingRow
            id="profile-settings-btn"
            Icon={Settings}
            title="Pengaturan"
            subtitle="Bahasa, tema, dan lainnya"
            onClick={() => toast({ variant: 'info', title: 'Pengaturan', description: 'Menu pengaturan lengkap belum dibuka, jadi row ini menampilkan status saat ini.' })}
          />
        </div>

        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* ── QR Code ── */}
        <div className="px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
            <ScanLine size={13} />
            Pindai untuk Terhubung
          </p>

          <div className="flex items-center gap-4">
            {/* Real QR via free API */}
            <div
              aria-label="Kode QR Zmayy"
              style={{
                width: 90, height: 90,
                borderRadius: 10,
                background: '#FFFFFF',
                flexShrink: 0,
                overflow: 'hidden',
                boxShadow: '0 0 16px rgba(252,213,53,0.22)',
              }}
            >
              {userId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="Kode QR profil Zmayy"
                  width={90}
                  height={90}
                  style={{ display: 'block' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin" style={{ color: '#0B0E11' }} />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                @{username}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Pindai dengan{' '}
                <span style={{ color: '#FCD535' }}>Zmayy Mobile</span>{' '}
                atau ketuk ponsel melalui{' '}
                <span style={{ color: '#FCD535' }}>NFC</span>.
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer select-none"
                style={{ background: 'rgba(252,213,53,0.10)', border: '1px solid rgba(252,213,53,0.3)', color: '#FCD535' }}
                aria-label="Ketuk untuk berbagi via NFC"
                onClick={handleShareViaNfc}
              >
                <Nfc size={12} />
                Bagikan via NFC
              </motion.button>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* ── Logout ── */}
        <div className="px-4 py-4">
          <button
            id="logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-red-500/10 disabled:opacity-60"
            style={{ color: '#EF4444' }}
            aria-label="Keluar"
          >
            {loggingOut
              ? <Loader2 size={16} className="animate-spin" />
              : <LogOut  size={16} />
            }
            {loggingOut ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
