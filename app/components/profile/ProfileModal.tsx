'use client';

import { X, Eye, EyeOff, LogOut, MapPin, Bell, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileModalProps {
  isGhostMode: boolean;
  onToggleGhost: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileModal({
  isGhostMode,
  onToggleGhost,
  onClose,
  onLogout,
}: ProfileModalProps) {
  return (
    /* Backdrop */
    <motion.div
      key="profile-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'var(--color-overlay)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Profile and settings"
    >
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="glass rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Profile Hero */}
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(252,213,53,0.08) 0%, transparent 60%)' }}
        >
          <button
            id="close-profile-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Close profile modal"
          >
            <X size={18} />
          </button>

          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3 ring-4"
            style={{ background: 'var(--color-gold)', color: 'var(--color-base)', ringColor: 'rgba(252,213,53,0.3)' }}
            aria-hidden="true"
          >
            ZU
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            Zmayy User
          </h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            @zmayy_user · Jakarta, ID
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-6 mt-4">
            {[
              { label: 'Friends', value: '24' },
              { label: 'Nearby', value: '7' },
              { label: 'Chats', value: '12' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-base font-bold" style={{ color: 'var(--color-gold)' }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* Settings */}
        <div className="px-4 py-4 space-y-1">
          {/* Ghost Mode Row */}
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl"
            style={{ background: isGhostMode ? 'rgba(252,213,53,0.06)' : 'transparent' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isGhostMode ? 'rgba(252,213,53,0.15)' : 'rgba(255,255,255,0.05)' }}
              aria-hidden="true"
            >
              {isGhostMode ? (
                <EyeOff size={18} style={{ color: 'var(--color-gold)' }} />
              ) : (
                <Eye size={18} style={{ color: 'var(--color-muted)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: isGhostMode ? 'var(--color-gold)' : 'var(--color-primary)' }}>
                Ghost Mode
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Hide your location from friends
              </p>
            </div>
            {/* Toggle */}
            <button
              id="ghost-mode-toggle"
              onClick={onToggleGhost}
              role="switch"
              aria-checked={isGhostMode}
              aria-label="Toggle ghost mode"
              className={`toggle-track flex-shrink-0 ${isGhostMode ? 'active' : ''}`}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* Location Sharing */}
          <button
            id="profile-location-btn"
            className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors hover:bg-white/5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              aria-hidden="true"
            >
              <MapPin size={18} style={{ color: 'var(--color-muted)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Location Sharing</p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Friends only</p>
            </div>
          </button>

          {/* Notifications */}
          <button
            id="profile-notifications-btn"
            className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors hover:bg-white/5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              aria-hidden="true"
            >
              <Bell size={18} style={{ color: 'var(--color-muted)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Notifications</p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>All enabled</p>
            </div>
          </button>

          {/* Privacy */}
          <button
            id="profile-privacy-btn"
            className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors hover:bg-white/5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              aria-hidden="true"
            >
              <ShieldCheck size={18} style={{ color: 'var(--color-muted)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Privacy & Safety</p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Manage data & blocking</p>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* Logout */}
        <div className="px-4 py-4">
          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-red-500/10 active:scale-98"
            style={{ color: '#EF4444' }}
            aria-label="Log out"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
