'use client';

import { useState } from 'react';
import { X, Search, UserPlus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ───────────────────────────────────────────────────────────────────
export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'nearby';
  distance?: string;
  mutualCount?: number;
  isPending?: boolean;
}

// ── Dummy data ───────────────────────────────────────────────────────────────
const MUTUALS: Friend[] = [
  { id: 'f1', name: 'Rina Permata',  avatar: 'RP', status: 'online',  mutualCount: 5 },
  { id: 'f2', name: 'Budi Santoso',  avatar: 'BS', status: 'nearby',  distance: '0.8 km', mutualCount: 3 },
  { id: 'f3', name: 'Sari Wijaya',   avatar: 'SW', status: 'nearby',  distance: '2.1 km', mutualCount: 8 },
  { id: 'f4', name: 'Dimas Pratama', avatar: 'DP', status: 'online',  mutualCount: 2 },
];

const REQUESTS: Friend[] = [
  { id: 'r1', name: 'Aulia Fitri',   avatar: 'AF', status: 'nearby', distance: '3.4 km', isPending: true, mutualCount: 4 },
  { id: 'r2', name: 'Kevin Huang',   avatar: 'KH', status: 'online', isPending: true,   mutualCount: 1 },
];

// ── FriendCard ───────────────────────────────────────────────────────────────
interface FriendCardProps {
  friend: Friend;
  onStartChat?: (friend: Friend) => void;
}

function FriendCard({ friend, onStartChat }: FriendCardProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-white/5 group cursor-pointer"
      onClick={() => !friend.isPending && onStartChat?.(friend)}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
          aria-hidden="true"
        >
          {friend.avatar}
        </div>
        {/* Status dot */}
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
          style={{
            background: friend.status === 'online' ? '#2ECC71' : 'var(--color-gold)',
            borderColor: 'var(--color-surface)',
          }}
          aria-label={friend.status}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-primary)' }}>
          {friend.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
          {friend.status === 'online' ? '🟢 Online' : `📍 ${friend.distance}`}
          {friend.mutualCount ? ` · ${friend.mutualCount} mutuals` : ''}
        </p>
      </div>

      {/* Actions */}
      {friend.isPending ? (
        <button
          id={`accept-friend-${friend.id}`}
          onClick={(e) => { e.stopPropagation(); setAccepted(true); }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={
            accepted
              ? { background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }
              : { background: 'var(--color-gold)', color: 'var(--color-base)' }
          }
          aria-label={accepted ? 'Request accepted' : `Accept friend request from ${friend.name}`}
        >
          {accepted ? <CheckCircle2 size={13} /> : <UserPlus size={13} />}
          {accepted ? 'Accepted' : 'Accept'}
        </button>
      ) : (
        <button
          id={`chat-friend-${friend.id}`}
          onClick={(e) => { e.stopPropagation(); onStartChat?.(friend); }}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all"
          style={{ background: 'rgba(252,213,53,0.15)', color: 'var(--color-gold)' }}
          aria-label={`Chat with ${friend.name}`}
        >
          Chat
        </button>
      )}
    </motion.div>
  );
}

// ── FriendsPanel ─────────────────────────────────────────────────────────────
interface FriendsPanelProps {
  onClose: () => void;
  onStartChat: (friend: Friend) => void;
}

export function FriendsPanel({ onClose, onStartChat }: FriendsPanelProps) {
  const [activeTab, setActiveTab] = useState<'mutuals' | 'requests'>('mutuals');
  const [search, setSearch] = useState('');

  const list = activeTab === 'mutuals' ? MUTUALS : REQUESTS;
  const filtered = list.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.aside
      key="friends-panel"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="glass fixed top-0 left-0 h-full flex flex-col z-30"
      style={{ width: 'clamp(300px, 360px, 100vw)' }}
      aria-label="Friends panel"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>
          Friends
        </h2>
        <button
          id="close-friends-panel"
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Close friends panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)' }}
        >
          <Search size={15} style={{ color: 'var(--color-muted)' }} />
          <input
            id="friends-search"
            type="text"
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent"
            aria-label="Search friends"
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex mx-4 mb-2 rounded-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}
        role="tablist"
      >
        {(['mutuals', 'requests'] as const).map((tab) => (
          <button
            key={tab}
            id={`friends-tab-${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-xs font-semibold capitalize rounded-xl transition-all"
            style={
              activeTab === tab
                ? { background: 'var(--color-gold)', color: 'var(--color-base)' }
                : { color: 'var(--color-muted)' }
            }
          >
            {tab}
            {tab === 'requests' && REQUESTS.length > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                style={{ background: activeTab === tab ? 'var(--color-base)' : 'var(--color-gold)', color: activeTab === tab ? 'var(--color-gold)' : 'var(--color-base)' }}
              >
                {REQUESTS.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm py-8"
              style={{ color: 'var(--color-muted)' }}
            >
              No {activeTab} found
            </motion.p>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {filtered.map((f) => (
                <FriendCard key={f.id} friend={f} onStartChat={onStartChat} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

export type { Friend as FriendType };
export { MUTUALS };
