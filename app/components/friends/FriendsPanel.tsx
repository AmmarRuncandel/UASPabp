'use client';

/**
 * FriendsPanel — Supabase-backed friends & requests list
 * ────────────────────────────────────────────────────────
 * • Fetches confirmed friends (friendships.status = 'accepted')
 * • Fetches incoming pending requests
 * • Search against profiles by username/display_name
 * • Send a friend request (insert into friendships)
 * • Accept a request (update status to 'accepted')
 * • Passes pendingCount up to parent for NavBar badge
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, CheckCircle2, BatteryMedium, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FriendListSkeleton } from '@/app/components/ui/Skeletons';
import { FriendsEmptyState }  from '@/app/components/ui/EmptyState';
import { useToast }           from '@/app/components/ui/Toast';
import { createClient }       from '@/utils/supabase/client';
import type { Profile }       from '@/utils/supabase/types';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'nearby';
  distance?: string;
  mutualCount?: number;
  isPending?: boolean;
  friendshipId?: string;   // used for accept action
  battery?: number;
}

// ── PingRipple ────────────────────────────────────────────────────────────────
function PingRipple({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{ border: '2px solid rgba(252,213,53,0.6)' }}
      animate={{ scale: [1, 2], opacity: [0.7, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay, repeatDelay: 2 }}
      aria-hidden="true"
    />
  );
}

// ── BatteryBadge ──────────────────────────────────────────────────────────────
function BatteryBadge({ pct }: { pct: number }) {
  const color = pct <= 20 ? '#EF4444' : pct <= 40 ? '#F59E0B' : '#2ECC71';
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium" style={{ color }}>
      <BatteryMedium size={11} style={{ color }} />
      {pct}%
    </span>
  );
}

// ── FriendCard ────────────────────────────────────────────────────────────────
function FriendCard({
  friend,
  onStartChat,
  onAccept,
}: {
  friend: Friend;
  onStartChat?: (friend: Friend) => void;
  onAccept?: (friendshipId: string, friendName: string) => void;
}) {
  const [accepted, setAccepted] = useState(false);

  function handleAccept(e: React.MouseEvent) {
    e.stopPropagation();
    if (!friend.friendshipId) return;
    setAccepted(true);
    onAccept?.(friend.friendshipId, friend.name);
  }

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
        {friend.status === 'nearby' && <PingRipple />}
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
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-primary)' }}>
            {friend.name}
          </p>
          {friend.battery !== undefined && <BatteryBadge pct={friend.battery} />}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
          {friend.status === 'online' ? 'Aktif' : `${friend.distance ?? 'Dekat'}`}
          {friend.mutualCount ? ` · ${friend.mutualCount} mutuals` : ''}
        </p>
      </div>

      {/* Actions */}
      {friend.isPending ? (
        <button
          id={`accept-friend-${friend.id}`}
          onClick={handleAccept}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={
            accepted
              ? { background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }
              : { background: 'var(--color-gold)', color: 'var(--color-base)' }
          }
          aria-label={accepted ? 'Permintaan diterima' : `Terima permintaan dari ${friend.name}`}
        >
          {accepted ? <CheckCircle2 size={13} /> : <UserPlus size={13} />}
          {accepted ? 'Diterima' : 'Terima'}
        </button>
      ) : (
        <button
          id={`chat-friend-${friend.id}`}
          onClick={(e) => { e.stopPropagation(); onStartChat?.(friend); }}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all"
          style={{ background: 'rgba(252,213,53,0.15)', color: 'var(--color-gold)' }}
          aria-label={`Obrolan dengan ${friend.name}`}
        >
          Obrolan
        </button>
      )}
    </motion.div>
  );
}

// ── Search result card ────────────────────────────────────────────────────────
function SearchResultCard({
  profile,
  currentUserId,
  onRequestSent,
}: {
  profile: Profile;
  currentUserId: string;
  onRequestSent: () => void;
}) {
  const supabase = createClient();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function sendRequest() {
    setSending(true);
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: currentUserId, addressee_id: profile.id, status: 'pending' });

    if (error) {
      toast({ variant: 'error', title: 'Could not send request', description: error.message });
    } else {
      setSent(true);
      toast({ variant: 'success', title: 'Request sent', description: `Friend request sent to ${profile.display_name ?? profile.username}.` });
      onRequestSent();
    }
    setSending(false);
  }

  const initials = profile.avatar_initials
    ?? profile.username?.slice(0, 2).toUpperCase()
    ?? '??';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-primary)' }}>
          {profile.display_name ?? profile.username ?? 'Unknown'}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          @{profile.username}
        </p>
      </div>
      <button
        onClick={sendRequest}
        disabled={sending || sent}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
        style={
          sent
            ? { background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }
            : { background: 'var(--color-gold)', color: 'var(--color-base)' }
        }
      >
        {sent ? <UserCheck size={13} /> : <UserPlus size={13} />}
        {sent ? 'Terkirim' : 'Tambah'}
      </button>
    </motion.div>
  );
}

// ── FriendsPanel ──────────────────────────────────────────────────────────────
interface FriendsPanelProps {
  currentUserId: string;
  onClose: () => void;
  onStartChat: (friend: Friend) => void;
  onPendingCountChange: (count: number) => void;
}

export function FriendsPanel({
  currentUserId,
  onClose,
  onStartChat,
  onPendingCountChange,
}: FriendsPanelProps) {
  const supabase   = createClient();
  const { toast }  = useToast();

  const [activeTab, setActiveTab]   = useState<'friends' | 'requests'>('friends');
  const [search,    setSearch]      = useState('');
  const [isLoading, setIsLoading]   = useState(true);

  const [friends,   setFriends]     = useState<Friend[]>([]);
  const [requests,  setRequests]    = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching]   = useState(false);

  // ── Load friends + requests ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);

    // Accepted friendships — fetch both directions
    const { data: acceptedRows } = await supabase
      .from('friendships')
      .select(`
        id, requester_id, addressee_id, status,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_initials),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_initials)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

    // Pending requests where I am the addressee
    const { data: pendingRows } = await supabase
      .from('friendships')
      .select(`
        id, requester_id, status,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_initials)
      `)
      .eq('status', 'pending')
      .eq('addressee_id', currentUserId);

    const toFriend = (row: Record<string, unknown>, profile: Profile, isPending = false): Friend => ({
      id:           profile.id,
      name:         profile.display_name ?? profile.username ?? 'User',
      avatar:       profile.avatar_initials ?? profile.username?.slice(0, 2).toUpperCase() ?? '??',
      status:       (profile.last_lat !== null ? 'nearby' : 'online') as Friend['status'],
      isPending,
      friendshipId: row.id as string,
    });

    const friendList: Friend[] = (acceptedRows ?? []).map((row) => {
      const isRequester = (row.requester_id as string) === currentUserId;
      const profile = isRequester
        ? (row.addressee as unknown as Profile)
        : (row.requester as unknown as Profile);
      return toFriend(row as Record<string, unknown>, profile, false);
    });

    const requestList: Friend[] = (pendingRows ?? []).map((row) => {
      const profile = row.requester as unknown as Profile;
      return toFriend(row as Record<string, unknown>, profile, true);
    });

    setFriends(friendList);
    setRequests(requestList);
    onPendingCountChange(requestList.length);
    setIsLoading(false);
  }, [supabase, currentUserId, onPendingCountChange]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search profiles (debounced) ────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }

    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_initials, last_lat, last_lng')
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .neq('id', currentUserId)
        .limit(8);

      setSearchResults((data ?? []) as Profile[]);
      setSearching(false);
    }, 350);

    return () => clearTimeout(t);
  }, [search, supabase, currentUserId]);

  // ── Accept friend request ──────────────────────────────────────────────────
  async function handleAccept(friendshipId: string, friendName: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      toast({ variant: 'error', title: 'Error', description: error.message });
    } else {
      toast({
        variant: 'success',
        title: `${friendName} added`,
        description: 'You can now see each other on the map.',
      });
      loadData();
    }
  }

  const isSearchMode = search.trim().length > 0;
  const list         = activeTab === 'friends' ? friends : requests;

  return (
    <motion.aside
      key="friends-panel"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 left-0 h-full flex flex-col z-30 bg-[#181A20]/80 backdrop-blur-xl border-r border-white/5"
      style={{ width: 'clamp(300px, 360px, 100vw)' }}
      aria-label="Friends panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>Teman</h2>
        <button
          id="close-friends-panel"
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Tutup panel teman"
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
            placeholder="Cari pengguna…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent"
            style={{ color: 'var(--color-primary)' }}
            aria-label="Cari pengguna"
          />
        </div>
      </div>

      {/* Tabs — hidden when searching */}
      {!isSearchMode && (
        <div
          className="flex mx-4 mb-2 rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}
          role="tablist"
        >
          {(['friends', 'requests'] as const).map((tab) => { const tabLabel = tab === 'friends' ? 'Teman' : 'Permintaan'; return (
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
              {tabLabel}
              {tab === 'requests' && requests.length > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                  style={{
                    background: activeTab === tab ? 'var(--color-base)' : 'var(--color-gold)',
                    color:      activeTab === tab ? 'var(--color-gold)' : 'var(--color-base)',
                  }}
                >
                  {requests.length}
                </span>
              )}
            </button>
          ); })}
        </div>
      )}

      {/* List / Search results / Skeleton / Empty */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <AnimatePresence mode="wait">
          {isSearchMode ? (
            <motion.div key="search-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {searching ? (
                <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>Mencari…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>Pengguna tidak ditemukan</p>
              ) : searchResults.map((p) => (
                <SearchResultCard
                  key={p.id}
                  profile={p}
                  currentUserId={currentUserId}
                  onRequestSent={loadData}
                />
              ))}
            </motion.div>
          ) : isLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FriendListSkeleton />
            </motion.div>
          ) : list.length === 0 ? (
            <FriendsEmptyState key="empty" />
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {list.map((f) => (
                <FriendCard
                  key={f.id}
                  friend={f}
                  onStartChat={onStartChat}
                  onAccept={handleAccept}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

export { type Friend as FriendType };
// Legacy export for page.tsx compatibility
export const MUTUALS: Friend[] = [];
