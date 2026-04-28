'use client';

import dynamic from 'next/dynamic';

export interface MapViewProps {
  isGhostMode: boolean;
  userId: string;
}

const MapViewInner = dynamic(
  () => import('./MapViewInner').then((m) => m.MapViewInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="map-bg relative w-full h-full overflow-hidden flex items-center justify-center"
        aria-label="Loading map…"
      >
        <span className="text-xs font-semibold animate-pulse" style={{ color: 'var(--color-muted)' }}>
          Loading map…
        </span>
      </div>
    ),
  }
);

export function MapView({ isGhostMode, userId }: MapViewProps) {
  return <MapViewInner isGhostMode={isGhostMode} userId={userId} />;
}
