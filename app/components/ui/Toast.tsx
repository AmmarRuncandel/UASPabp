'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void;
}

// ── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Variant config ───────────────────────────────────────────────────────────
const VARIANT_CONFIG: Record<
  ToastVariant,
  { Icon: React.ElementType; accent: string; bg: string; border: string }
> = {
  success: {
    Icon: CheckCircle2,
    accent: '#2ECC71',
    bg:     'rgba(46,204,113,0.08)',
    border: 'rgba(46,204,113,0.25)',
  },
  error: {
    Icon: XCircle,
    accent: '#EF4444',
    bg:     'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
  warning: {
    Icon: AlertTriangle,
    accent: '#FCD535',
    bg:     'rgba(252,213,53,0.08)',
    border: 'rgba(252,213,53,0.25)',
  },
  info: {
    Icon: Info,
    accent: '#60A5FA',
    bg:     'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
  },
};

// ── Single Toast card ────────────────────────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const { Icon, accent, bg, border } = VARIANT_CONFIG[item.variant];

  return (
    <motion.div
      layout
      key={item.id}
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1   }}
      exit={{    opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-sm w-full"
      style={{
        background:    `${bg}, rgba(24,26,32,0.92)`,
        border:        `1px solid ${border}`,
        backdropFilter:'blur(16px)',
        boxShadow:     `0 0 24px rgba(0,0,0,0.5), 0 0 8px ${border}`,
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={18} style={{ color: accent }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(240,240,240,0.6)' }}>
            {item.description}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 p-0.5 rounded-md transition-colors hover:bg-white/10"
        style={{ color: 'rgba(240,240,240,0.4)' }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...options, id }]);
    // Auto-dismiss after 4 seconds
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ── Toast container (top-right, above everything) ── */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <div key={item.id} className="pointer-events-auto w-full">
              <ToastCard item={item} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
