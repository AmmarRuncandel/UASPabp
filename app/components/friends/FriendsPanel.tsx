'use client';

/**
 * FriendsPanel — Supabase-backed friends & requests list
 * • Deduplication via reduce on user.id before rendering
 * • onFlyTo prop: click avatar → map flies to friend's location
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, CheckCircle2, BatteryMedium, UserCheck, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FriendListSkeleton } from '@/app/components/ui/Skeletons';
import { FriendsEmptyState }  from '@/app/components/ui/EmptyState';
import { useToast }           from '@/app/components/ui/Toast';
import { createClient }       from '@/utils/supabase/client';
import type { Profile }       from '@/utils/supabase/types';

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'nearby';
  distance?: string;
  mutualCount?: number;
  isPending?: boolean;
  friendshipId?: string;
  battery?: number;
  isGhost?: boolean;
}

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

function BatteryBadge({ pct }: { pct: number }) {
  const color = pct <= 20 ? '#EF4444' : pct <= 40 ? '#F59E0B' : '#2ECC71';
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium" style={{ color }}>
      <BatteryMedium size={11} style={{ color }} />
      {pct}%
    </span>
  );
}

function FriendCard({
  friend,
  onStartChat,
  onAccept,
  onFlyTo,
}: {
  friend: Friend;
  onStartChat?: (friend: Friend) => void;
  onAccept?: (friendshipId: string, friendName: string) => void;
  onFlyTo?: (id: string) => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-white/5 group cursor-pointer"
      onClick={() => !friend.isPending && onStartChat?.(friend)}
    >
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

      {friend.isPending ? (
        <button
          id={`accept-friend-${friend.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!friend.friendshipId) return;
            setAccepted(true);
            onAccept?.(friend.friendshipId, friend.name);
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={
            accepted
              ? { background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }
              : { background: 'var(--color-gold)', color: 'var(--color-base)' }
          }
          aria-label={accepted ? 'Diterima' : `Terima permintaan dari ${friend.name}`}
        >
          {accepted ? <CheckCircle2 size={13} /> : <UserPlus size={13} />}
          {accepted ? 'Diterima' : 'Terima'}
        </button>
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {onFlyTo && (
            <button
              id={`flyto-friend-${friend.id}`}
              onClick={(e) => { e.stopPropagation(); onFlyTo(friend.id); }}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--color-gold)', background: 'rgba(252,213,53,0.12)' }}
              aria-label={`Lihat ${friend.name} di peta`}
              title="Lihat di peta"
            >
              <MapPin size={13} />
            </button>
          )}
          <button
            id={`chat-friend-${friend.id}`}
            onClick={(e) => { e.stopPropagation(); onStartChat?.(friend); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(252,213,53,0.15)', color: 'var(--color-gold)' }}
            aria-label={`Obrolan dengan ${friend.name}`}
          >
            Obrolan
          </button>
        </div>
      )}
    </motion.div>
  );
}

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
      .insert({ requester_id: currentUserId, addressee_id: profile.id, status: 'pending' })
      .select();

    if (error) {
      const msg = error.code === '23505'
        ? 'Permintaan pertemanan sudah terkirim sebelumnya.'
        : error.message;
      toast({ variant: 'error', title: 'Gagal mengirim permintaan', description: msg });
    } else {
      setSent(true);
      toast({ variant: 'success', title: 'Permintaan terkirim!', description: `Dikirim ke ${profile.display_name ?? profile.username}.` });
      onRequestSent();
    }
    setSending(false);
  }

  const initials = profile.avatar_initials ?? profile.username?.slice(0, 2).toUpperCase() ?? '??';

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
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>@{profile.username}</p>
      </div>
      <button
        id={`add-friend-${profile.id}`}
        onClick={sendRequest}
        disabled={sending || sent}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
        style={
          sent
            ? { background: 'rgba(46,204,113,0.15)', color: '#2ECC71' }
            : { background: 'var(--color-gold)', color: 'var(--color-base)' }
        }
        aria-label={sent ? 'Terkirim' : `Tambah ${profile.username}`}
      >
        {sent ? <UserCheck size={13} /> : <UserPlus size={13} />}
        {sent ? 'Terkirim' : 'Tambah'}
      </button>
    </motion.div>
  );
}

interface FriendsPanelProps {
  currentUserId: string;
  onClose: () => void;
  onStartChat: (friend: Friend) => void;
  onPendingCountChange: (count: number) => void;
  onFlyTo?: (friendId: string) => void;
  initialSearchId?: string | null;
  onDeepLinkHandled?: () => void;
}

export function FriendsPanel({
  currentUserId,
  onClose,
  onStartChat,
  onPendingCountChange,
  onFlyTo,
  initialSearchId,
  onDeepLinkHandled,
}: FriendsPanelProps) {
  const supabase  = createClient();
  const { toast } = useToast();

  const [activeTab,     setActiveTab]     = useState<'friends' | 'requests'>('friends');
  const [search,        setSearch]        = useState('');
  const [isLoading,     setIsLoading]     = useState(true);
  const [friends,       setFriends]       = useState<Friend[]>([]);
  const [requests,      setRequests]      = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching,     setSearching]     = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const { data: acceptedRows } = await supabase
      .from('friendships')
      .select(`
        id, requester_id, addressee_id, status,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_initials, last_lat, last_lng, is_ghost_mode),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_initials, last_lat, last_lng, is_ghost_mode)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

    const { data: pendingRows } = await supabase
      .from('friendships')
      .select(`
        id, requester_id, status,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_initials, last_lat, last_lng, is_ghost_mode)
      `)
      .eq('status', 'pending')
      .eq('addressee_id', currentUserId);

    const toFriend = (row: Record<string, unknown>, profile: Profile, isPending = false): Friend => ({
      id:           profile.id,
      name:         profile.display_name ?? profile.username ?? 'Pengguna',
      avatar:       profile.avatar_initials ?? profile.username?.slice(0, 2).toUpperCase() ?? '??',
      status:       (profile.last_lat !== null ? 'nearby' : 'online') as Friend['status'],
      isPending,
      friendshipId: row.id as string,
      isGhost: Boolean((profile as any).is_ghost_mode === true || profile.is_ghost_mode === true),
    });

    const rawFriends: Friend[] = (acceptedRows ?? []).map((row) => {
      const isRequester = (row.requester_id as string) === currentUserId;
      const profile = isRequester
        ? (row.addressee as unknown as Profile)
        : (row.requester as unknown as Profile);
      return toFriend(row as Record<string, unknown>, profile, false);
    });

    // ── Deduplicate by user id ─────────────────────────────────────────────
    const friendList = rawFriends.reduce<Friend[]>((acc, f) => {
      if (!acc.some((x) => x.id === f.id)) acc.push(f);
      return acc;
    }, []);

    const requestList: Friend[] = (pendingRows ?? []).map((row) => {
      const profile = row.requester as unknown as Profile;
      return toFriend(row as Record<string, unknown>, profile, true);
    });

    setFriends(friendList);
    setRequests(requestList);
    onPendingCountChange(requestList.length);
    setIsLoading(false);
  }, [supabase, currentUserId, onPendingCountChange]);

  // Wrapper for fly-to: prevents panning when friend is in ghost mode
  const handleFlyTo = useCallback((friendId: string) => {
    const f = friends.find((x) => x.id === friendId);
    if (!f) return;
    if (f.isGhost) {
      toast({ variant: 'error', title: 'Tidak dapat melacak', description: 'Pengguna ini sedang mengaktifkan Mode Hantu.' });
      return;
    }
    onFlyTo?.(friendId);
  }, [friends, onFlyTo, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handle deep-link: resolve UUID → fetch exact profile by ID ────────────
  // Bypasses the username search entirely — a UUID will never match `ilike('username')`.
  useEffect(() => {
    if (!initialSearchId) return;
    let cancelled = false;
    setSearching(true);

    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials, last_lat, last_lng')
      .eq('id', initialSearchId)
      .neq('id', currentUserId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setSearchResults(data ? [data as Profile] : []);
        // Set a human-readable display label in the search bar
        setSearch((data as Profile | null)?.username ?? initialSearchId);
        setSearching(false);
        onDeepLinkHandled?.();
      });

    return () => { cancelled = true; };
  // Only run once when initialSearchId changes — not on every search keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchId]);

  // ── Username search (debounced, skipped while deep-link results are shown) ─
  // We detect a UUID pattern so a deep-link ID never leaks into the ilike path.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults([]); return; }
    // Skip ilike search when the query looks like a UUID (deep-link scenario)
    if (UUID_RE.test(q)) return;

    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_initials, last_lat, last_lng')
        .ilike('username', `%${q}%`)
        .neq('id', currentUserId)
        .limit(8);
      setSearchResults((data ?? []) as Profile[]);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search, supabase, currentUserId]);

  async function handleAccept(friendshipId: string, friendName: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .select();

    if (error) {
      toast({ variant: 'error', title: 'Gagal menerima permintaan', description: error.message });
    } else {
      toast({ variant: 'success', title: `${friendName} ditambahkan!`, description: 'Kalian bisa saling melihat di peta.' });
      loadData();
    }
  }

  const isSearchMode = search.trim().length > 0;
  const list         = activeTab === 'friends' ? friends : requests;

  return (
    <motion.aside
      key="friends-panel"
      initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 left-0 h-full flex flex-col z-30 bg-[#181A20]/80 backdrop-blur-xl border-r border-white/5"
      style={{ width: 'clamp(300px, 360px, 100vw)' }}
      aria-label="Friends panel"
    >
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>Teman</h2>
        <button id="close-friends-panel" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--color-muted)' }} aria-label="Tutup panel teman">
          <X size={18} />
        </button>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)' }}>
          <Search size={15} style={{ color: 'var(--color-muted)' }} />
          <input
            id="friends-search"
            type="text"
            placeholder="Cari username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent"
            style={{ color: 'var(--color-primary)' }}
            aria-label="Cari pengguna berdasarkan username"
          />
        </div>
      </div>

      {!isSearchMode && (
        <div className="flex mx-4 mb-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }} role="tablist">
          {(['friends', 'requests'] as const).map((tab) => {
            const tabLabel = tab === 'friends' ? 'Teman' : 'Permintaan';
            return (
              <button
                key={tab}
                id={`friends-tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 text-xs font-semibold capitalize rounded-xl transition-all"
                style={activeTab === tab ? { background: 'var(--color-gold)', color: 'var(--color-base)' } : { color: 'var(--color-muted)' }}
              >
                {tabLabel}
                {tab === 'requests' && requests.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                    style={{ background: activeTab === tab ? 'var(--color-base)' : 'var(--color-gold)', color: activeTab === tab ? 'var(--color-gold)' : 'var(--color-base)' }}>
                    {requests.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <AnimatePresence mode="wait">
          {isSearchMode ? (
            <motion.div key="search-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {searching ? (
                <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>Mencari…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>Pengguna tidak ditemukan</p>
              ) : searchResults.map((p) => (
                <SearchResultCard key={p.id} profile={p} currentUserId={currentUserId} onRequestSent={loadData} />
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
                <FriendCard key={f.id} friend={f} onStartChat={onStartChat} onAccept={handleAccept} onFlyTo={handleFlyTo} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

export { type Friend as FriendType };
export const MUTUALS: Friend[] = [];
