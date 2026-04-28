'use client';

import { Users, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

type ActiveSidebar = 'none' | 'friends' | 'chat' | 'profile';

interface NavBarProps {
  activeSidebar: ActiveSidebar;
  onToggle: (panel: ActiveSidebar) => void;
  isGhostMode: boolean;
  pendingCount?: number;
}

const NAV_ITEMS = [
  { id: 'friends',  label: 'Friends', Icon: Users },
  { id: 'chat',    label: 'Chat',    Icon: MessageCircle },
  { id: 'profile', label: 'Profile', Icon: User },
] as const;

export function NavBar({ activeSidebar, onToggle, isGhostMode, pendingCount = 2 }: NavBarProps) {
  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 glass rounded-2xl px-2 py-2 flex items-center gap-1"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeSidebar === id;
        const hasBadge = id === 'friends' && pendingCount > 0;

        return (
          <motion.button
            key={id}
            id={`nav-${id}`}
            onClick={() => onToggle(id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="relative flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl transition-all"
            style={
              isActive
                ? { background: 'var(--color-gold)', color: 'var(--color-base)' }
                : { color: 'var(--color-muted)' }
            }
            aria-label={label}
            aria-pressed={isActive}
          >
            {/* Ghost mode indicator on profile */}
            {id === 'profile' && isGhostMode && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: 'var(--color-gold)', borderColor: 'var(--color-surface)' }}
                aria-label="Ghost mode active"
              />
            )}

            {/* Pending badge on friends */}
            {hasBadge && !isActive && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border"
                style={{ background: 'var(--color-gold)', color: 'var(--color-base)', borderColor: 'var(--color-surface)' }}
                aria-label={`${pendingCount} friend requests`}
              >
                {pendingCount}
              </span>
            )}

            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">{label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
