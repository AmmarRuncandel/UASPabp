'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

import { AuthScreen }    from '@/app/components/auth/AuthScreen';
import { MapView }       from '@/app/components/map/MapView';
import { NavBar }        from '@/app/components/ui/NavBar';
import { FriendsPanel, MUTUALS }  from '@/app/components/friends/FriendsPanel';
import { ChatPanel }     from '@/app/components/chat/ChatPanel';
import { ProfileModal }  from '@/app/components/profile/ProfileModal';

import type { Friend }      from '@/app/components/friends/FriendsPanel';
import type { ChatFriend }  from '@/app/components/chat/ChatPanel';

// ── Types ────────────────────────────────────────────────────────────────────
type ActivePanel = 'none' | 'friends' | 'chat' | 'profile';

// ── App Root ─────────────────────────────────────────────────────────────────
export default function Home() {
  /* ── Global dummy state ── */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePanel, setActivePanel]         = useState<ActivePanel>('none');
  const [isGhostMode, setIsGhostMode]         = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState<ChatFriend>({
    id:       MUTUALS[0].id,
    name:     MUTUALS[0].name,
    avatar:   MUTUALS[0].avatar,
    distance: MUTUALS[1].distance ?? '1.2 km',
  });

  /* ── Handlers ── */
  const handleLogin  = useCallback(() => setIsAuthenticated(true),  []);
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setActivePanel('none');
    setIsGhostMode(false);
  }, []);

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
  }, []);

  /* ── Auth Gate ── */
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  /* ── Main Dashboard ── */
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--color-base)' }}>
      {/* Layer 1 — Full-screen dummy map */}
      <MapView isGhostMode={isGhostMode} />

      {/* Layer 2 — Sidebars & Modals */}
      <AnimatePresence mode="wait">
        {activePanel === 'friends' && (
          <FriendsPanel
            key="friends"
            onClose={() => setActivePanel('none')}
            onStartChat={openChat}
          />
        )}

        {activePanel === 'chat' && (
          <ChatPanel
            key="chat"
            friend={activeChatFriend}
            onClose={() => setActivePanel('none')}
          />
        )}

        {activePanel === 'profile' && (
          <ProfileModal
            key="profile"
            isGhostMode={isGhostMode}
            onToggleGhost={() => setIsGhostMode((v) => !v)}
            onClose={() => setActivePanel('none')}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {/* Layer 3 — Bottom Navigation Bar */}
      <NavBar
        activeSidebar={activePanel}
        onToggle={togglePanel}
        isGhostMode={isGhostMode}
        pendingCount={2}
      />
    </div>
  );
}
