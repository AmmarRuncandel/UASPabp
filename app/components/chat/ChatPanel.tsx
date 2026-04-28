'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Smile, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  text: string;
  sent: boolean; // true = current user sent
  time: string;
}

export interface ChatFriend {
  id: string;
  name: string;
  avatar: string;
  distance: string;
}

// ── Dummy data ──────────────────────────────────────────────────────────────
export const DUMMY_MESSAGES: Message[] = [
  { id: '1', text: 'Hey! Where are you right now? 👀',             sent: false, time: '14:20' },
  { id: '2', text: 'Near Sudirman, just finished lunch.',           sent: true,  time: '14:21' },
  { id: '3', text: 'No way, I\'m literally 500m away haha',         sent: false, time: '14:21' },
  { id: '4', text: 'Let\'s meet at the usual coffee spot?',         sent: true,  time: '14:22' },
  { id: '5', text: 'Yessss! Give me 10 mins 🏃',                   sent: false, time: '14:23' },
  { id: '6', text: 'Perfect, I\'ll grab a table. See you soon! ☕', sent: true,  time: '14:23' },
];

// ── ChatBubble ──────────────────────────────────────────────────────────────
interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${message.sent ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          message.sent
            ? 'rounded-br-sm'
            : 'rounded-bl-sm'
        }`}
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

// ── ChatPanel ───────────────────────────────────────────────────────────────
interface ChatPanelProps {
  friend: ChatFriend;
  onClose: () => void;
}

export function ChatPanel({ friend, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(DUMMY_MESSAGES);
  const [input, setInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setMessages((prev) => [...prev, { id: Date.now().toString(), text, sent: true, time }]);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <motion.aside
      key="chat-panel"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="glass fixed top-0 right-0 h-full flex flex-col z-30"
      style={{ width: 'clamp(300px, 380px, 100vw)' }}
      aria-label="Chat panel"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
          style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
          aria-hidden="true"
        >
          {friend.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>
            {friend.name}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--color-gold)' }}>
            📍 {friend.distance}
          </p>
        </div>
        <button
          id="close-chat-panel"
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Drag & Drop Zone */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-2 border-2 border-dashed rounded-xl py-4 text-center text-sm"
            style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}
          >
            Drop image here to send
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image drop hint (always visible, subtle) */}
      <div
        className="mx-4 mb-2 border border-dashed rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
      >
        <ImageIcon size={14} />
        <span>Drag & drop an image to share your location snapshot</span>
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-4 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          id="chat-emoji-btn"
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Pick emoji"
        >
          <Smile size={18} />
        </button>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)' }}
          aria-label="Message input"
        />
        <button
          id="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
