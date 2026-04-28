'use client';

/**
 * ChatPanel — Supabase Realtime ephemeral messages (Indonesian UI)
 * ─────────────────────────────────────────────────────────────────
 * Menggunakan Supabase Realtime untuk pesan instan.
 * Pesan dihapus otomatis setelah 10 percakapan atau 3 jam.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Smile, X, UploadCloud, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSkeleton }          from '@/app/components/ui/Skeletons';
import { ChatEmptyState, ChatNoFriendState } from '@/app/components/ui/EmptyState';
import { useSound }              from '@/app/hooks/useSound';
import { createClient }          from '@/utils/supabase/client';
import type { Message as DBMessage } from '@/utils/supabase/types';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ChatFriend { id: string; name: string; avatar: string; distance: string; }
interface UIMessage { id: string; text: string; sent: boolean; time: string; }

const MAX_MSG = 10;
const RING_R  = 18;
const RING_C  = 2 * Math.PI * RING_R;

// ── EphemeralRing ─────────────────────────────────────────────────────────────
function EphemeralRing({ count, avatar }: { count: number; avatar: string }) {
  const ratio     = Math.min(count / MAX_MSG, 1);
  const offset    = RING_C * ratio;
  const remaining = MAX_MSG - count;
  const clr = ratio < 0.5 ? '#FCD535' : ratio < 0.8 ? '#F59E0B' : '#EF4444';
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: 44, height: 44 }}
      aria-label={`${remaining} pesan tersisa`}
      title={`${count} dari ${MAX_MSG} pesan digunakan`}
    >
      <svg width={44} height={44} viewBox="0 0 44 44" className="absolute inset-0" aria-hidden="true">
        <circle cx={22} cy={22} r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
        <motion.circle
          cx={22} cy={22} r={RING_R} fill="none" stroke={clr}
          strokeWidth={2.5} strokeLinecap="round" strokeDasharray={RING_C}
          animate={{ strokeDashoffset: offset, stroke: clr }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          transform="rotate(-90 22 22)"
          style={{ filter: `drop-shadow(0 0 4px ${clr}66)` }}
        />
      </svg>
      <div
        className="absolute inset-0 m-[4px] rounded-full flex items-center justify-center text-sm font-bold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
        aria-hidden="true"
      >
        {avatar}
      </div>
    </div>
  );
}

// ── ChatBubble ────────────────────────────────────────────────────────────────
function ChatBubble({ message }: { message: UIMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${message.sent ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${message.sent ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={
          message.sent
            ? { background: 'var(--color-gold)', color: '#0B0E11' }
            : { background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }
        }
      >
        <p>{message.text}</p>
        <p
          className="text-[10px] mt-1 text-right"
          style={{ color: message.sent ? 'rgba(11,14,17,0.55)' : 'var(--color-muted)' }}
        >
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

// ── ChatPanel ─────────────────────────────────────────────────────────────────
interface ChatPanelProps {
  friend: ChatFriend;
  currentUserId: string;
  onClose: () => void;
}

export function ChatPanel({ friend, currentUserId, onClose }: ChatPanelProps) {
  const supabase  = createClient();
  const { play }  = useSound();

  const [messages,   setMessages]   = useState<UIMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTalking,  setIsTalking]  = useState(false);
  // null = idle before first fetch, true = fetching, false = done
  const [isLoading,  setIsLoading]  = useState<boolean | null>(null);
  const [isTyping,   setIsTyping]   = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Has a valid friend been selected? ─────────────────────────────────────
  const hasFriend = Boolean(friend.id);

  // ── Load messages ──────────────────────────────────────────────────────────
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
      setMessages(
        (data as DBMessage[]).map((m) => ({
          id:   m.id,
          text: m.content,
          sent: m.sender_id === currentUserId,
          time: fmtTime(m.created_at),
        }))
      );
    }
    setIsLoading(false);
  }, [supabase, currentUserId, friend.id]);

  useEffect(() => {
    if (hasFriend) {
      setMessages([]);
      loadMessages();
    }
  }, [hasFriend, loadMessages]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!friend.id) return;
    channelRef.current?.unsubscribe();

    const ch = supabase
      .channel(`chat-${[currentUserId, friend.id].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` },
        (payload) => {
          const m = payload.new as DBMessage;
          if (m.sender_id !== friend.id) return;
          setMessages((prev) =>
            [...prev, { id: m.id, text: m.content, sent: false, time: fmtTime(m.created_at) }]
              .slice(-MAX_MSG)
          );
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [supabase, currentUserId, friend.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stop = () => setIsTalking(false);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, []);

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  // ── Send ───────────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if (!text || !friend.id) return;
    const opt: UIMessage = { id: `opt-${Date.now()}`, text, sent: true, time: fmtTime(new Date().toISOString()) };
    setMessages((prev) => [...prev, opt].slice(-MAX_MSG));
    setInput('');
    play('send');
    const { error } = await supabase.from('messages')
      .insert({ sender_id: currentUserId, receiver_id: friend.id, content: text });
    if (error) setMessages((prev) => prev.filter((m) => m.id !== opt.id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const remaining = MAX_MSG - messages.length;

  // ── Early return: no friend selected ──────────────────────────────────────
  if (!hasFriend) {
    return (
      <motion.aside
        key="chat-panel-empty"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed top-0 right-0 h-full flex flex-col z-30 bg-[#181A20]/80 backdrop-blur-xl border-l border-white/5"
        style={{ width: 'clamp(300px, 380px, 100vw)' }}
        aria-label="Panel obrolan"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>Obrolan</h2>
          <button id="close-chat-panel" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--color-muted)' }} aria-label="Tutup obrolan">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ChatNoFriendState />
        </div>
      </motion.aside>
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
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            key="dnd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(11,14,17,0.85)', backdropFilter: 'blur(16px)', border: '2px dashed rgba(252,213,53,0.7)' }}
          >
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
        <EphemeralRing count={messages.length} avatar={friend.avatar} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>{friend.name}</p>
          <button
            className="text-xs font-medium text-left"
            style={{ color: 'var(--color-gold)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              setIsTyping(true);
              if (typingTimer.current) clearTimeout(typingTimer.current);
              typingTimer.current = setTimeout(() => setIsTyping(false), 4000);
            }}
          >
            {isTyping ? 'Sedang mengetik…' : friend.distance}
          </button>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: messages.length >= 8 ? '#EF4444' : 'rgba(252,213,53,0.55)' }}
          >
            {remaining} {remaining === 1 ? 'pesan' : 'pesan'} sebelum hapus otomatis
          </p>
        </div>
        <button
          id="close-chat-panel"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Tutup obrolan"
        >
          <X size={18} />
        </button>
      </div>

      {/* Ephemeral notice */}
      <div
        className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
        style={{ background: 'rgba(252,213,53,0.07)', border: '1px solid rgba(252,213,53,0.25)', color: 'rgba(252,213,53,0.9)' }}
        role="status"
      >
        <span>
          <span className="font-bold">Mode Efemeral:</span>{' '}
          Pesan dihapus otomatis setelah{' '}
          <span className="font-semibold">10 percakapan</span> atau{' '}
          <span className="font-semibold">3 jam</span>.
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isLoading === true ? (
            <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ChatSkeleton />
            </motion.div>
          ) : messages.length === 0 ? (
            <ChatEmptyState key="empty" />
          ) : (
            <motion.div key="msgs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-4 space-y-1">
              {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
              <div ref={bottomRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-2 px-6 pb-2"
          >
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl rounded-bl-sm"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <motion.span key={i} className="block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--color-muted)' }}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut', delay }} />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{friend.name} sedang mengetik</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag hint */}
      <AnimatePresence>
        {!isDragOver && (
          <motion.div
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-4 mb-2 border border-dashed rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            <ImageIcon size={14} />
            <span>Seret &amp; lepas gambar untuk berbagi lokasi</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button id="chat-emoji-btn" className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'var(--color-muted)' }} aria-label="Pilih emoji">
          <Smile size={18} />
        </button>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan…"
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
          aria-label="Input pesan"
        />
        {/* Hold-to-talk */}
        <motion.button
          id="chat-ptt-btn"
          onMouseDown={() => setIsTalking(true)} onMouseUp={() => setIsTalking(false)}
          onTouchStart={() => setIsTalking(true)} onTouchEnd={() => setIsTalking(false)}
          animate={isTalking
            ? { scale: [1, 1.15, 1.1], boxShadow: ['0 0 0px rgba(252,213,53,0)', '0 0 20px rgba(252,213,53,0.7)', '0 0 14px rgba(252,213,53,0.5)'] }
            : { scale: 1, boxShadow: '0 0 0px rgba(252,213,53,0)' }
          }
          transition={isTalking ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{
            background: isTalking ? 'linear-gradient(135deg,#FCD535,#F0A500)' : 'rgba(252,213,53,0.12)',
            border: '1.5px solid rgba(252,213,53,0.4)',
            color: isTalking ? '#0B0E11' : '#FCD535',
            cursor: 'pointer',
          }}
          aria-label={isTalking ? 'Mengirim suara…' : 'Tahan untuk bicara'}
          aria-pressed={isTalking}
        >
          {isTalking && (
            <motion.span className="absolute inset-0 rounded-xl"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{ background: 'rgba(252,213,53,0.35)', pointerEvents: 'none' }} />
          )}
          <Mic size={16} strokeWidth={isTalking ? 2.5 : 1.8} />
        </motion.button>
        {/* Send */}
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
