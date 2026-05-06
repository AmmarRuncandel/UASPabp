'use client';

/**
 * ChatPanel — Supabase Realtime ephemeral messages
 * • Voice note (Mic) button REMOVED
 * • Empty state when no friend selected shows friends list to pick from
 * • onOpenFriends prop: redirects user to FriendsPanel to pick a friend
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, X, UploadCloud, Users, ChevronLeft, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSkeleton }     from '@/app/components/ui/Skeletons';
import { ChatEmptyState }   from '@/app/components/ui/EmptyState';
import { useSound }         from '@/app/hooks/useSound';
import { createClient }     from '@/utils/supabase/client';
import type { Message as DBMessage } from '@/utils/supabase/types';

export interface ChatFriend { id: string; name: string; avatar: string; distance: string; }

interface RecentChat {
  friendId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  ts: number;
}

interface UIMessage { id: string; text: string; sent: boolean; time: string; createdAt: string; }

const MAX_MSG = 10;
const RING_R  = 18;
const RING_C  = 2 * Math.PI * RING_R;

function EphemeralRing({ count, avatar }: { count: number; avatar: string }) {
  const ratio     = Math.min(count / MAX_MSG, 1);
  const offset    = RING_C * ratio;
  const remaining = MAX_MSG - count;
  const clr = ratio < 0.5 ? '#FCD535' : ratio < 0.8 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}
      aria-label={`${remaining} pesan tersisa`} title={`${count} dari ${MAX_MSG} pesan digunakan`}>
      <svg width={44} height={44} viewBox="0 0 44 44" className="absolute inset-0" aria-hidden="true">
        <circle cx={22} cy={22} r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
        <motion.circle cx={22} cy={22} r={RING_R} fill="none" stroke={clr}
          strokeWidth={2.5} strokeLinecap="round" strokeDasharray={RING_C}
          animate={{ strokeDashoffset: offset, stroke: clr }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          transform="rotate(-90 22 22)"
          style={{ filter: `drop-shadow(0 0 4px ${clr}66)` }}
        />
      </svg>
      <div className="absolute inset-0 m-[4px] rounded-full flex items-center justify-center text-sm font-bold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }} aria-hidden="true">
        {avatar}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: UIMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${message.sent ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${message.sent ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={message.sent
          ? { background: 'var(--color-gold)', color: '#0B0E11' }
          : { background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
      >
        {message.text.startsWith('[IMAGE]:') ? (
          <div className="max-w-[240px] max-h-[300px] overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.text.replace('[IMAGE]:', '')} alt="shared" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        ) : (
          <p>{message.text}</p>
        )}
        <p className="text-[10px] mt-1 text-right"
          style={{ color: message.sent ? 'rgba(11,14,17,0.55)' : 'var(--color-muted)' }}>
          {message.time}
        </p>
      </div>
    </motion.div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ── No-friend-selected state: prompt to open Friends panel ─────────────────────
function NoFriendState({ onOpenFriends }: { onOpenFriends?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-5 py-12 px-6 text-center flex-1"
    >
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(252,213,53,0)', '0 0 28px rgba(252,213,53,0.22)', '0 0 0px rgba(252,213,53,0)'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl p-5"
        style={{ background: 'rgba(252,213,53,0.07)', border: '1px solid rgba(252,213,53,0.15)' }}
      >
        <Users size={36} style={{ color: '#FCD535', opacity: 0.85 }} strokeWidth={1.4} />
      </motion.div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>Pilih teman untuk mulai chat</p>
        <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: 'var(--color-muted)' }}>
          Buka daftar teman dan pilih siapa yang ingin kamu ajak ngobrol.
        </p>
      </div>
      {onOpenFriends && (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onOpenFriends}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
          id="open-friends-from-chat"
        >
          <Users size={15} />
          Lihat Daftar Teman
        </motion.button>
      )}
    </motion.div>
  );
}

// -- Recent Chats View --
function RecentChatsView({ friends, recentChats, onSelect, onClose }: {
  friends: ChatFriend[];
  recentChats: RecentChat[];
  onSelect: (f: ChatFriend) => void;
  onClose: () => void;
}) {
  const merged = friends.map((f) => {
    const rc = recentChats.find((r) => r.friendId === f.id);
    return { friend: f, lastMessage: rc?.lastMessage ?? '', lastTime: rc?.lastTime ?? '', ts: rc?.ts ?? 0 };
  }).sort((a, b) => b.ts - a.ts);
  return (
    <motion.aside key="chat-list" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 right-0 h-full flex flex-col z-30 bg-[#181A20]/80 backdrop-blur-xl border-l border-white/5"
      style={{ width: 'clamp(300px, 380px, 100vw)' }} aria-label="Recent Chats">
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>Obrolan</h2>
        <button id="close-chat-panel" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--color-muted)' }} aria-label="Tutup"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {merged.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <MessageCircle size={36} style={{ color: 'rgba(252,213,53,0.4)' }} strokeWidth={1.4} />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Belum ada teman untuk diajak chat.</p>
          </div>
        ) : merged.map(({ friend, lastMessage, lastTime }) => (
          <motion.button key={friend.id} whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            onClick={() => onSelect(friend)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}>{friend.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-primary)' }}>{friend.name}</p>
                {lastTime && <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--color-muted)' }}>{lastTime}</span>}
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {lastMessage.startsWith('[IMAGE]:') ? '?? Gambar' : lastMessage || 'Belum ada pesan'}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.aside>
  );
}
interface ChatPanelProps {
  friend: ChatFriend;
  friends?: ChatFriend[];
  currentUserId: string;
  onClose: () => void;
  onOpenFriends?: () => void;
  /** Respects profile.notify_sound — defaults to true */
  soundEnabled?: boolean;
}

export function ChatPanel({ friend: initialFriend, friends = [], currentUserId, onClose, onOpenFriends, soundEnabled = true }: ChatPanelProps) {
  const supabase  = createClient();
  const { play }  = useSound();

  const [friend,      setFriend]     = useState<ChatFriend>(initialFriend);
  const [chatView,    setChatView]   = useState<'list' | 'chat'>(initialFriend.id ? 'chat' : 'list');
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [friendsList, setFriendsList] = useState<ChatFriend[]>([]);
  const [messages,   setMessages]   = useState<UIMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading,  setIsLoading]  = useState<boolean | null>(null);
  const [isTyping,   setIsTyping]   = useState(false);

  const emitTypingTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRemoteTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Handle files dropped/selected — upload to Supabase Storage and send message with public URL
  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    // Prepare storage path
    const filePath = `chat_uploads/${currentUserId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

    // Optimistic UI placeholder while uploading
    const opt: UIMessage = { id: `opt-${Date.now()}`, text: '[IMAGE_UPLOADING]', sent: true, time: fmtTime(new Date().toISOString()), createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, opt].slice(-MAX_MSG));
    if (soundEnabled) play('send');

    try {
      const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicData } = await supabase.storage.from('chat_images').getPublicUrl(filePath);
      const publicUrl = (publicData as any)?.publicUrl ?? '';

      if (!publicUrl) throw new Error('Failed to obtain public URL');

      const content = `[IMAGE]:${publicUrl}`;

      // Replace optimistic placeholder with real image message
      setMessages((prev) => prev.map((m) => (m.id === opt.id ? { ...m, text: content } : m)));

      const { error } = await supabase.from('messages').insert({ sender_id: currentUserId, receiver_id: friend.id, content });
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== opt.id));
      }
    } catch (err) {
      console.warn('[Chat] Image upload failed', err);
      setMessages((prev) => prev.filter((m) => m.id !== opt.id));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.files && dt.files.length > 0) {
      const f = dt.files[0];
      handleImageFile(f);
    } else {
      // Try reading images from clipboard items
      const items = dt.items;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) { handleImageFile(f); break; }
        }
      }
    }
  }

  const hasFriend = Boolean(friend.id);

  // Sync friend from prop when it changes externally
  useEffect(() => {
    if (initialFriend.id) { setFriend(initialFriend); setChatView('chat'); }
  }, [initialFriend.id]);

  // Load friends list for Recent Chats view
  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    async function fetchFriends() {
      const { data } = await supabase
        .from('friendships')
        .select(`
          id, requester_id, addressee_id, status,
          requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_initials, last_lat, last_lng),
          addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_initials, last_lat, last_lng)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      const list: ChatFriend[] = (data ?? []).map((row: any) => {
        const isRequester = row.requester_id === currentUserId;
        const profile = isRequester ? row.addressee : row.requester;
        return {
          id: profile.id,
          name: profile.display_name ?? profile.username ?? 'Pengguna',
          avatar: profile.avatar_initials ?? (profile.username?.slice(0, 2).toUpperCase() ?? '?'),
          distance: profile.last_lat !== null && profile.last_lng !== null ? '< 1 km' : 'Offline',
        };
      });
      if (mounted) setFriendsList(list);
    }
    fetchFriends();
    return () => { mounted = false; };
  }, [supabase, currentUserId]);

  // Load recent chats metadata for list view
  useEffect(() => {
    if (!currentUserId || friendsList.length === 0) return;
    async function fetchRecent() {
      const results: RecentChat[] = [];
      for (const f of friendsList) {
        const { data } = await supabase
          .from('messages')
          .select('content, created_at')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${f.id}),` +
            `and(sender_id.eq.${f.id},receiver_id.eq.${currentUserId})`
          )
          .order('created_at', { ascending: false })
          .limit(1);
        const last = data?.[0];
        results.push({
          friendId: f.id, name: f.name, avatar: f.avatar,
          lastMessage: last?.content ?? '',
          lastTime: last?.created_at ? fmtTime(last.created_at) : '',
          ts: last?.created_at ? new Date(last.created_at).getTime() : 0,
        });
      }
      setRecentChats(results);
    }
    fetchRecent();
  }, [currentUserId, friendsList, supabase]);

  const loadMessages = useCallback(async () => {
    if (!friend.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),` +
        `and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })
      .limit(MAX_MSG);

    if (data) {
      const threshold = Date.now() - 3 * 60 * 60 * 1000;
      const filtered = (data as DBMessage[]).filter((m) => new Date(m.created_at).getTime() > threshold);
      setMessages(filtered.map((m) => ({
        id: m.id,
        text: m.content,
        sent: m.sender_id === currentUserId,
        time: m.created_at ? fmtTime(m.created_at) : fmtTime(new Date().toISOString()),
        createdAt: m.created_at ?? new Date().toISOString(),
      })));
    }
    setIsLoading(false);
  }, [supabase, currentUserId, friend.id]);

  useEffect(() => {
    if (hasFriend) { setMessages([]); loadMessages(); }
  }, [hasFriend, loadMessages]);

  useEffect(() => {
    if (!friend.id) return;
    channelRef.current?.unsubscribe();
    const ch = supabase
      .channel(`chat-${[currentUserId, friend.id].sort().join('-')}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` },
        (payload) => {
          const m = payload.new as DBMessage;
          if (m.sender_id !== friend.id) return;
          const threshold = Date.now() - 3 * 60 * 60 * 1000;
          if (new Date(m.created_at).getTime() <= threshold) return;
          setMessages((prev) => [...prev, { id: m.id, text: m.content, sent: false, time: m.created_at ? fmtTime(m.created_at) : fmtTime(new Date().toISOString()), createdAt: m.created_at ?? new Date().toISOString() }].slice(-MAX_MSG));
        })
      .subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [supabase, currentUserId, friend.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  useEffect(() => {
    function handleTypingEvent(e: Event) {
      const data = (e as CustomEvent)?.detail;
      if (!data || data.from !== friend.id || data.to !== currentUserId) return;
      setIsTyping(Boolean(data.typing));
      if (clearRemoteTypingTimer.current) clearTimeout(clearRemoteTypingTimer.current);
      if (data.typing) clearRemoteTypingTimer.current = setTimeout(() => setIsTyping(false), 3500);
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== 'zmayy:typing') return;
      try {
        const data = JSON.parse(String(e.newValue));
        if (data.from === friend.id && data.to === currentUserId) {
          setIsTyping(Boolean(data.typing));
          if (clearRemoteTypingTimer.current) clearTimeout(clearRemoteTypingTimer.current);
          if (data.typing) clearRemoteTypingTimer.current = setTimeout(() => setIsTyping(false), 3500);
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('zmayy:typing', handleTypingEvent as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('zmayy:typing', handleTypingEvent as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [friend.id, currentUserId]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !friend.id) return;
    const now = new Date().toISOString();
    const opt: UIMessage = { id: `opt-${Date.now()}`, text, sent: true, time: fmtTime(now), createdAt: now };
    setMessages((prev) => [...prev, opt].slice(-MAX_MSG));
    setInput('');
    if (soundEnabled) play('send');
    const { error } = await supabase.from('messages').insert({ sender_id: currentUserId, receiver_id: friend.id, content: text });
    if (error) setMessages((prev) => prev.filter((m) => m.id !== opt.id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const remaining = MAX_MSG - messages.length;

  // If user is viewing Recent Chats list, render that view (never an empty screen)
  if (chatView === 'list') {
    return (
      <RecentChatsView
        friends={friendsList}
        recentChats={recentChats}
        onSelect={(f) => { setFriend(f); setChatView('chat'); }}
        onClose={onClose}
      />
    );
  }

  return (
    <motion.aside
      key="chat-panel"
      ref={panelRef}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 right-0 h-full flex flex-col z-30 bg-[#181A20]/80 backdrop-blur-xl border-l border-white/5"
      style={{ width: 'clamp(300px, 380px, 100vw)' }}
      aria-label="Panel obrolan"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { if (!panelRef.current?.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragOver && (
          <motion.div key="dnd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(11,14,17,0.85)', backdropFilter: 'blur(16px)', border: '2px dashed rgba(252,213,53,0.7)' }}>
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ background: 'rgba(252,213,53,0.12)', borderRadius: '50%', padding: 20, marginBottom: 14 }}>
              <UploadCloud size={38} style={{ color: '#FCD535' }} />
            </motion.div>
            <p className="font-bold text-base" style={{ color: '#FCD535' }}>Lepas untuk berbagi lokasi</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {chatView === 'chat' && (
          <button id="chat-back-btn" onClick={() => setChatView('list')} className="p-2 rounded-md hover:bg-white/5" style={{ color: 'var(--color-muted)' }} aria-label="Kembali ke daftar obrolan">
            <ChevronLeft size={18} />
          </button>
        )}
        <EphemeralRing count={messages.length} avatar={friend.avatar} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{friend.name}</p>
          <button className="text-xs font-medium text-left" style={{ color: 'var(--color-gold)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { setIsTyping(true); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setIsTyping(false), 4000); }}>
            {isTyping ? 'Sedang mengetik…' : friend.distance}
          </button>
          <p className="text-[10px] mt-0.5" style={{ color: messages.length >= 8 ? '#EF4444' : 'rgba(252,213,53,0.55)' }}>
            {remaining} pesan sebelum hapus otomatis
          </p>
        </div>
        <button id="close-chat-panel" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--color-muted)' }} aria-label="Tutup obrolan">
          <X size={18} />
        </button>
      </div>

      {/* Ephemeral notice */}
      <div className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
        style={{ background: 'rgba(252,213,53,0.07)', border: '1px solid rgba(252,213,53,0.25)', color: 'rgba(252,213,53,0.9)' }} role="status">
        <span><span className="font-bold">Mode Efemeral:</span>{' '}Pesan dihapus otomatis setelah <span className="font-semibold">10 percakapan</span> atau <span className="font-semibold">3 jam</span>.</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isLoading === true ? (
            <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ChatSkeleton /></motion.div>
          ) : (() => {
            const threshold = Date.now() - 3 * 60 * 60 * 1000;
            const visibleMessages = messages.filter((m) => new Date(m.createdAt).getTime() > threshold);
            if (visibleMessages.length === 0) return <ChatEmptyState key="empty" />;
            return (
              <motion.div key="msgs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 space-y-1">
                {visibleMessages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
                <div ref={bottomRef} />
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-2 px-6 pb-2">
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl rounded-bl-sm"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-muted)' }}
                  animate={{ y: [0, -5, 0] }} transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut', delay }} />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{friend.name} sedang mengetik</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag hint */}
      <AnimatePresence>
        {!isDragOver && (
          <motion.div initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-4 mb-2 border border-dashed rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
            <ImageIcon size={14} />
            <span>Seret &amp; lepas gambar untuk berbagi lokasi</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-primary)' }}
                aria-label="Unggah gambar"
              >
                + Upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageFile(f);
                e.currentTarget.value = '';
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            try {
              const payload = { from: currentUserId, to: friend.id, typing: true, t: Date.now() };
              window.dispatchEvent(new CustomEvent('zmayy:typing', { detail: payload }));
              localStorage.setItem('zmayy:typing', JSON.stringify(payload));
            } catch { /* ignore */ }
            if (emitTypingTimer.current) clearTimeout(emitTypingTimer.current);
            emitTypingTimer.current = setTimeout(() => {
              try {
                const payload = { from: currentUserId, to: friend.id, typing: false, t: Date.now() };
                window.dispatchEvent(new CustomEvent('zmayy:typing', { detail: payload }));
                localStorage.setItem('zmayy:typing', JSON.stringify(payload));
              } catch {}
            }, 1200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan…"
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
          aria-label="Input pesan"
        />
        <button
          id="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-40"
          style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
          aria-label="Kirim pesan"
        >
          <Send size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
