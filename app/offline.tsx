'use client';

export default function OfflinePage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 gap-4"
      style={{ background: 'var(--color-base)' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <line x1="8" y1="15" x2="16" y2="9" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
        Offline
      </h1>
      <p
        className="text-center text-sm max-w-sm"
        style={{ color: 'var(--color-muted)' }}
      >
        Anda sedang offline. Periksa koneksi internet Anda dan coba lagi.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2.5 rounded-lg font-semibold text-sm"
        style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
      >
        Coba Lagi
      </button>
    </div>
  );
}
