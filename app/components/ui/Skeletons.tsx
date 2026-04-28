'use client';

// ── Reusable pulse primitives ─────────────────────────────────────────────────
function PulseBox({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.07)', ...style }}
    />
  );
}

// ── FriendListSkeleton ────────────────────────────────────────────────────────
/**
 * Represents 4 loading friend cards inside the FriendsPanel.
 * Each row has: avatar circle · two text lines · action pill.
 */
export function FriendListSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <PulseBox style={{ width: 44, height: 44, borderRadius: '50%' }} />
            {/* Status dot */}
            <PulseBox
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                position: 'absolute',
                bottom: 0,
                right: 0,
                border: '2px solid #181A20',
              }}
            />
          </div>

          {/* Text lines */}
          <div className="flex-1 flex flex-col gap-2">
            <PulseBox style={{ height: 12, width: '55%', borderRadius: 8 }} />
            <PulseBox style={{ height: 10, width: '38%', borderRadius: 8 }} />
          </div>

          {/* Action pill */}
          <PulseBox style={{ height: 28, width: 60, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

// ── ChatSkeleton ──────────────────────────────────────────────────────────────
/**
 * Represents loading messages inside the ChatPanel.
 * Alternates sent/received bubble shapes.
 */
export function ChatSkeleton() {
  const rows: Array<{ sent: boolean; widths: string[] }> = [
    { sent: false, widths: ['68%'] },
    { sent: true,  widths: ['55%'] },
    { sent: false, widths: ['80%', '45%'] },
    { sent: true,  widths: ['60%'] },
    { sent: false, widths: ['50%'] },
  ];

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex flex-col gap-1.5 ${row.sent ? 'items-end' : 'items-start'}`}
        >
          {row.widths.map((w, j) => (
            <PulseBox
              key={j}
              style={{
                height: 36,
                width: w,
                borderRadius: row.sent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              }}
            />
          ))}
          {/* Timestamp shimmer */}
          <PulseBox style={{ height: 8, width: 28, borderRadius: 6, opacity: 0.5 }} />
        </div>
      ))}
    </div>
  );
}

// ── Generic header skeleton (reusable) ───────────────────────────────────────
export function PanelHeaderSkeleton() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <PulseBox style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <div className="flex-1 flex flex-col gap-2">
        <PulseBox style={{ height: 12, width: '40%', borderRadius: 8 }} />
        <PulseBox style={{ height: 10, width: '25%', borderRadius: 8 }} />
      </div>
      <PulseBox style={{ width: 28, height: 28, borderRadius: 8 }} />
    </div>
  );
}
