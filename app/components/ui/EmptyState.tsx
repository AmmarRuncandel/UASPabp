'use client';

import { UserPlus, MessageSquareDashed, MousePointerClick } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Generic EmptyState ────────────────────────────────────────────────────────
interface EmptyStateProps {
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function EmptyState({ Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{    opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center"
    >
      <motion.div
        animate={{
          boxShadow: [
            '0 0 0px rgba(252,213,53,0)',
            '0 0 32px rgba(252,213,53,0.22)',
            '0 0 0px rgba(252,213,53,0)',
          ],
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl p-5"
        style={{ background: 'rgba(252,213,53,0.07)', border: '1px solid rgba(252,213,53,0.15)' }}
      >
        <Icon size={36} style={{ color: '#FCD535', opacity: 0.85 }} strokeWidth={1.4} />
      </motion.div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{title}</p>
        <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>
      </div>
      {action}
    </motion.div>
  );
}

// ── Friends Empty State ───────────────────────────────────────────────────────
export function FriendsEmptyState() {
  return (
    <EmptyState
      Icon={UserPlus}
      title="Belum ada teman."
      subtitle="Cari pengguna lain dan kirim permintaan pertemanan."
    />
  );
}

// ── Chat — no friend selected ─────────────────────────────────────────────────
export function ChatNoFriendState() {
  return (
    <EmptyState
      Icon={MousePointerClick}
      title="Pilih teman untuk mulai chat."
      subtitle="Buka daftar teman dan ketuk nama mereka untuk membuka percakapan."
    />
  );
}

// ── Chat — friend selected but no messages yet ────────────────────────────────
export function ChatEmptyState() {
  return (
    <EmptyState
      Icon={MessageSquareDashed}
      title="Belum ada pesan."
      subtitle="Kirim pesan pertama. Pesan akan terhapus otomatis setelah 10 percakapan."
    />
  );
}
