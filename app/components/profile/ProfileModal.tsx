'use client';

/**
 * ProfileModal — Tampilan profil pengguna nyata dari Supabase
 * • lastSeenText: green Online jika < 5 menit, otherwise relative time
 * • Settings row dihapus
 * • Copy Profile Link di bawah QR code
 * ─────────────────────────────────────────────────────────────
 * • Mengambil data pengguna dari auth.getUser() + tabel profiles
 * • Avatar inisial dihasilkan dari kata pertama & terakhir display_name
 * • QR code fungsional via api.qrserver.com (zmayy.com/u/:userId)
 * • "Berbagi Lokasi" subtitle dinamis berdasarkan ghost mode & is_public
 * • Ghost Mode activation → null-kan last_lat / last_lng di DB
 * • Tombol Keluar memanggil supabase.auth.signOut()
 * • Semua teks dalam Bahasa Indonesia
 */

import { useEffect, useState } from 'react';
import {
  X, Eye, EyeOff, LogOut, MapPin, Bell, ShieldCheck, Nfc,
  ScanLine, Loader2, Edit2, Copy, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast }        from '@/app/components/ui/Toast';
import { useSound }        from '@/app/hooks/useSound';
import { EditProfileModal } from '@/app/components/profile/EditProfileModal';
import { NotificationsSettingsModal } from '@/app/components/profile/NotificationsSettingsModal';
import { PrivacySettingsModal } from '@/app/components/profile/PrivacySettingsModal';
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

// ── Helper: derive initials from display name ──────────────────────────────────
function deriveInitials(displayName: string | null, username: string | null): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }
  if (username && username.trim()) {
    return username.slice(0, 2).toUpperCase();
  }
  return '??';
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
  const [isEditOpen,    setIsEditOpen]    = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [togglingGhost, setTogglingGhost] = useState(false);
  const [linkCopied,    setLinkCopied]    = useState(false);
  const [mounted,       setMounted]       = useState(false);

  // Ensure we are mounted (client-side) before reading window.location
  useEffect(() => { setMounted(true); }, []);

  function lastSeenText(updatedAt: string | null | undefined): { text: string; online: boolean } {
    if (!updatedAt) return { text: '—', online: false };
    const diff = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000));
    if (diff < 300) return { text: '🟢 Online', online: true };  // within 5 minutes
    if (diff < 3600) return { text: `Aktif ${Math.floor(diff / 60)} menit lalu`, online: false };
    if (diff < 86400) return { text: `Aktif ${Math.floor(diff / 3600)} jam lalu`, online: false };
    return { text: `Aktif ${Math.floor(diff / 86400)} hari lalu`, online: false };
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

  // Avatar: always derive from display_name words (first + last initial), then username
  const initials = deriveInitials(profile?.display_name ?? null, profile?.username ?? null);

  // QR code pointing to real profile URL — uses runtime origin so it works on any deployment
  const profileUrl = mounted && userId
    ? `${window.location.origin}/u/${userId}`
    : null;
  const qrData = profileUrl ?? (mounted ? window.location.origin : 'https://zmayy.com');
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=0B0E11&margin=4`;

  // ── "Berbagi Lokasi" dynamic subtitle ─────────────────────────────────────
  function getLocationSubtitle(): string {
    if (isGhostMode) return 'Disembunyikan';
    if (profile?.is_public) return 'Teman & Sekitar (1km)';
    return 'Hanya Teman';
  }

  useEffect(() => {
    // Recompute online status every 30 s (threshold: 5 minutes)
    function updateOnline() {
      const updated = profile?.updated_at ?? null;
      if (!updated) { setIsOnlineNow(false); return; }
      setIsOnlineNow(Date.now() - new Date(updated).getTime() < 300_000);
    }
    updateOnline();
    const iv = setInterval(updateOnline, 30_000);
    return () => clearInterval(iv);
  }, [profile?.updated_at]);

  async function handleCopyLink() {
    if (!userId || !mounted) return;
    const url = `${window.location.origin}/u/${userId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({ variant: 'success', title: 'Tautan disalin!', description: 'Tautan profil berhasil disalin ke clipboard.' });
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      toast({ variant: 'error', title: 'Gagal menyalin', description: 'Browser tidak mendukung clipboard.' });
    }
  }

  // ── Ghost mode toggle ──────────────────────────────────────────────────────
  async function handleToggleGhost() {
    if (!userId) return;

    setTogglingGhost(true);
    const next = !isGhostMode;

    // Build the update payload — when activating ghost, wipe coordinates
    const updatePayload: Record<string, unknown> = { is_ghost_mode: next };
    if (next) {
      updatePayload.last_lat = null;
      updatePayload.last_lng = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'error',
        title: 'Gagal mengubah mode',
        description: error.message,
      });
      setTogglingGhost(false);
      return;
    }

    setTogglingGhost(false);
    onToggleGhost();
    play('toggle');
    toast(
      next
        ? { variant: 'warning', title: 'Mode Hantu Aktif',    description: 'Lokasimu sekarang tersembunyi. Jejak koordinat telah dihapus.' }
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

          {/* Zmayy Logo (bulat) */}
          <motion.div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-gold)' }}
            whileHover={{ scale: 1.08 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/zmay_logo.png"
              alt="Zmayy"
              width={48}
              height={48}
              className="w-12 h-12 object-cover rounded-full"
            />
          </motion.div>

          {/* Avatar — derived initials */}
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
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3 relative"
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
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {loadingUser ? '—' : `@${username}`}
            </p>
            {!loadingUser && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: 'var(--color-gold)' }}
                aria-label="Edit profil"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          {email && !loadingUser && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{email}</p>
          )}

          {/* Last seen / Online */}
          <p className="text-xs mt-1" style={{ color: isOnlineNow ? '#2ECC71' : 'var(--color-muted)' }}>
            {loadingUser ? '—' : lastSeenText(profile?.updated_at).text}
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
              disabled={togglingGhost}
              role="switch"
              aria-checked={isGhostMode}
              aria-label="Aktifkan mode hantu"
              className={`toggle-track flex-shrink-0 ${isGhostMode ? 'active' : ''} disabled:opacity-50`}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* Berbagi Lokasi — visual indicator, no click action */}
          <SettingRow
            id="profile-location-btn"
            Icon={MapPin}
            title="Berbagi Lokasi"
            subtitle={getLocationSubtitle()}
          />
          <SettingRow
            id="profile-notifications-btn"
            Icon={Bell}
            title="Notifikasi"
            subtitle={
              (profile?.notify_global ?? profile?.notifications_enabled ?? true)
                ? 'Semua aktif'
                : 'Dimatikan'
            }
            onClick={() => setIsNotificationsOpen(true)}
          />
          <SettingRow
            id="profile-privacy-btn"
            Icon={ShieldCheck}
            title="Privasi & Keamanan"
            subtitle="Kelola data & pemblokiran"
            onClick={() => setIsPrivacyOpen(true)}
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
            {/* Real QR via free API — size=150x150 */}
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
              {/* Copy Profile Link */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 mb-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer select-none"
                style={{ background: linkCopied ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', color: linkCopied ? '#2ECC71' : 'var(--color-muted)' }}
                aria-label="Salin tautan profil"
                id="copy-profile-link-btn"
              >
                {linkCopied ? <Check size={11} /> : <Copy size={11} />}
                {linkCopied ? 'Disalin!' : 'Salin Tautan Profil'}
              </motion.button>
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        profile={profile}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={({ display_name, avatar_initials }) => {
          // Optimistic update — no refetch needed
          setProfile((p) =>
            p ? { ...p, display_name, avatar_initials } : p
          );
        }}
      />

      {/* Notifications Settings Modal */}
      <NotificationsSettingsModal
        profile={profile}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUpdate={(updated) => setProfile((p) => p ? { ...p, ...updated } : p)}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        profile={profile}
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onUpdate={(updated) => setProfile((p) => p ? { ...p, ...updated } : p)}
      />
    </motion.div>
  );
}
