'use client';

/**
 * app/page.tsx — Zmayy Dashboard
 * ────────────────────────────────────────────────────────
 * Session is guaranteed by proxy.ts (unauthenticated users
 * are already redirected to /login before reaching here).
 *
 * Layers:
 *  z-0   MapView        — full-screen Leaflet map (background)
 *  z-30  FriendsPanel   — slide-in from left
 *  z-30  ChatPanel      — slide-in from right
 *  z-40  ProfileModal   — centered modal
 *  z-20  NavBar         — bottom floating pill
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

import { MapView }      from '@/app/components/map/MapView';
import { NavBar }       from '@/app/components/ui/NavBar';
import { FriendsPanel } from '@/app/components/friends/FriendsPanel';
import { ChatPanel }    from '@/app/components/chat/ChatPanel';
import { ProfileModal } from '@/app/components/profile/ProfileModal';
import { ProfileCompletionModal } from '@/app/components/profile/ProfileCompletionModal';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

import type { Friend }     from '@/app/components/friends/FriendsPanel';
import type { ChatFriend } from '@/app/components/chat/ChatPanel';
import type { User }       from '@supabase/supabase-js';
import { ChatNotificationsProvider } from '@/app/context/ChatNotifications';

type ActivePanel = 'none' | 'friends' | 'chat' | 'profile';

type CommandActionDetail = {
  action: 'chat' | 'map';
  profile: Profile;
};

function profileToFriend(profile: Profile): Friend {
  return {
    id: profile.id,
    name: profile.display_name ?? profile.username ?? 'Pengguna',
    avatar: profile.avatar_initials ?? (profile.username?.slice(0, 2).toUpperCase() ?? '?'),
    status: profile.last_lat !== null && profile.last_lng !== null ? 'nearby' : 'online',
    distance: '—',
  };
}

export default function Home() {
  const router   = useRouter();
  const supabase = createClient();

  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [focusedProfileId, setFocusedProfileId] = useState<string | null>(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  const [activeChatFriend, setActiveChatFriend] = useState<ChatFriend>({
    id: '', name: 'Friend', avatar: '?', distance: '—',
  });
  const [chatPendingCount, setChatPendingCount] = useState(0);

  // ── Resolve session ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUser(user);

      // Fetch profile and check if complete
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
        // Do NOT auto-show the profile completion modal on refresh.
        // Users should open profile settings themselves to complete profile data.
        setIsGhostMode(profileData.is_ghost_mode ?? false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) router.replace('/login');
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  // Clear chat pending when Chat panel becomes active
  useEffect(() => {
    if (activePanel === 'chat') {
      setChatPendingCount(0);
    }
  }, [activePanel]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [supabase, router]);

  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
  }, []);

  const openChat = useCallback((friend: Friend) => {
    setActiveChatFriend({
      id:       friend.id,
      name:     friend.name,
      avatar:   friend.avatar,
      distance: friend.distance ?? '< 1 km',
    });
    setActivePanel('chat');
    // clear pending chat badge when user opens chat
    setChatPendingCount(0);
    setFocusedProfileId(null);
  }, []);

  // Global incoming messages watcher (for chat badge)
  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel(`global-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          setChatPendingCount((c) => c + 1);

          // Try to open chat automatically and focus the sender if possible
          try {
            const senderId = payload.new.sender_id as string;
            const { data: p } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_initials, last_lat, last_lng')
              .eq('id', senderId)
              .single();

            if (p) {
              const friend = profileToFriend(p as Profile);
              // Only auto-open if chat not already open
              if (activePanel !== 'chat') {
                openChat(friend);
              }
            }
          } catch (err) {
            // ignore
          }
        }
      )
      .subscribe();

    return () => { ch.unsubscribe(); };
  }, [supabase, user, openChat, activePanel]);

  // ── Fly-to-friend: fired by FriendsPanel / ChatPanel ──────────────────────
  const flyToFriend = useCallback((friendId: string) => {
    setFocusedProfileId(friendId);
    setActivePanel('none'); // close panel so map is visible
  }, []);

  useEffect(() => {
    function handleCommandAction(event: Event) {
      const detail = (event as CustomEvent<CommandActionDetail>).detail;
      if (!detail?.profile) return;

      const friend = profileToFriend(detail.profile);

      if (detail.action === 'chat') {
        openChat(friend);
        return;
      }

      setActivePanel('none');
      setFocusedProfileId(detail.profile.id);
    }

    window.addEventListener('zmayy:command-action', handleCommandAction as EventListener);
    return () => window.removeEventListener('zmayy:command-action', handleCommandAction as EventListener);
  }, [openChat]);

  // ── Loading state before user resolves ────────────────────────────────────
  if (!user) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: 'var(--color-base)' }}
      >
        <span
          className="text-sm animate-pulse"
          style={{ color: 'var(--color-muted)' }}
        >
          Loading…
        </span>
      </div>
    );
  }

  // ── Main Dashboard ─────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'var(--color-base)' }}
    >
      {/* Layer 0 — Full-screen Leaflet map */}
      <div className="absolute inset-0 z-0">
        <MapView isGhostMode={isGhostMode} userId={user.id} focusProfileId={focusedProfileId} />
      </div>

      {/* Profile Completion Modal */}
      {user && showProfileCompletion && (
        <ProfileCompletionModal
          userId={user.id}
          email={user.email ?? 'user'}
          onComplete={() => {
            setShowProfileCompletion(false);
            // Refresh profile data
            supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
              .then(({ data }) => {
                if (data) setProfile(data as Profile);
              });
          }}
        />
      )}

      {/* Layer 30 — Slide-in sidebars */}
      <AnimatePresence mode="wait">
        {activePanel === 'friends' && (
          <FriendsPanel
            key="friends"
            currentUserId={user.id}
            onClose={() => setActivePanel('none')}
            onStartChat={openChat}
            onFlyTo={flyToFriend}
            onPendingCountChange={setPendingCount}
          />
        )}

        {activePanel === 'chat' && (
          <ChatPanel
            key="chat"
            friend={activeChatFriend}
            currentUserId={user.id}
            onClose={() => setActivePanel('none')}
            onOpenFriends={() => setActivePanel('friends')}
          />
        )}

        {activePanel === 'profile' && (
          <ProfileModal
            key="profile"
            isGhostMode={isGhostMode}
            onToggleGhost={() => {
              setIsGhostMode((v) => !v);
            }}
            onClose={() => setActivePanel('none')}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {/* Layer 20 — Bottom navigation */}
      <NavBar
        activeSidebar={activePanel}
        onToggle={togglePanel}
        isGhostMode={isGhostMode}
        pendingCount={pendingCount}
      />
      {/* ChatNotificationsProvider wraps page at top; no shim needed here. */}
    </div>
  );
}
