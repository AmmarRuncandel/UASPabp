'use client';

/**
 * MapViewInner — React-Leaflet map with real Supabase data
 * ─────────────────────────────────────────────────────────
 * • CartoDB Dark Matter tiles (no API key)
 * • navigator.geolocation.watchPosition → upserts profiles.last_lat/lng
 * • Fetches all profiles and renders friend markers with PingRipple
 * • Custom gold SVG teardrop for current user
 * • Zoom / recenter controls via useMap()
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, ZoomIn, ZoomOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/utils/supabase/types';

// ── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [-7.3274, 108.2142]; // Tasikmalaya
const ZOOM   = 13;
const TILE   = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ── CSS injection (keyframes + leaflet overrides) ──────────────────────────────
if (typeof window !== 'undefined') {
  const STYLE_ID = 'zmayy-leaflet-styles';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .leaflet-control-attribution {
        background: rgba(11,14,17,0.8) !important;
        color: #848E9C !important;
        font-size: 9px !important;
        border-radius: 6px 0 0 0 !important;
      }
      .leaflet-control-attribution a { color: #FCD535 !important; }
      .leaflet-control-zoom { display: none !important; }

      @keyframes zmayy-ping {
        0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.75; }
        100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
      }
      .leaflet-ping-ring {
        position: absolute; top: 50%; left: 50%;
        width: 36px; height: 36px;
        border-radius: 50%;
        border: 2px solid rgba(252,213,53,0.7);
        transform: translate(-50%,-50%);
        animation: zmayy-ping 2.2s ease-out infinite;
        pointer-events: none;
      }
    `;
    document.head.appendChild(s);
  }
}

// ── Icon factories ─────────────────────────────────────────────────────────────
function makeUserIcon(): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <filter id="uglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <ellipse cx="18" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.35)"/>
    <path d="M18 2 C8 2 2 10 2 18 C2 28 18 42 18 42 C18 42 34 28 34 18 C34 10 28 2 18 2Z" fill="#FCD535" filter="url(#uglow)"/>
    <circle cx="18" cy="18" r="7" fill="#0B0E11"/>
    <circle cx="18" cy="18" r="3" fill="#FCD535"/>
  </svg>`;
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:44px;">
             ${svg}
             <span class="leaflet-ping-ring" style="animation-delay:0s"></span>
             <span class="leaflet-ping-ring" style="animation-delay:1.1s"></span>
           </div>`,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

function makeFriendIcon(initials: string, delay: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
             <span class="leaflet-ping-ring" style="animation-delay:${delay}s"></span>
             <span class="leaflet-ping-ring" style="animation-delay:${delay + 1.1}s"></span>
             <div style="width:36px;height:36px;border-radius:50%;background:#181A20;border:2px solid #FCD535;color:#FCD535;font-size:11px;font-weight:700;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(252,213,53,0.45);cursor:pointer;">${initials}</div>
           </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

// ── Map controls inside MapContainer context ───────────────────────────────────
function MapControls({
  isGhostMode,
  nearbyCount,
  userCenter,
}: {
  isGhostMode: boolean;
  nearbyCount: number;
  userCenter: [number, number];
}) {
  const map = useMap();
  const [recentering, setRecentering] = useState(false);

  function recenter() {
    if (recentering) return;
    setRecentering(true);
    map.flyTo(userCenter, ZOOM, { duration: 1.2 });
    setTimeout(() => setRecentering(false), 1400);
  }

  return (
    <>
      {/* Zoom buttons — top right */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-[1000]" aria-label="Map controls">
        {[
          { Icon: ZoomIn,  id: 'map-zoom-in',  label: 'Zoom in',  fn: () => map.zoomIn()  },
          { Icon: ZoomOut, id: 'map-zoom-out', label: 'Zoom out', fn: () => map.zoomOut() },
        ].map(({ Icon, id, label, fn }) => (
          <motion.button
            key={id} id={id}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
            onClick={fn}
            className="glass w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10"
            style={{ color: 'var(--color-muted)' }}
            aria-label={label}
          >
            <Icon size={17} />
          </motion.button>
        ))}
      </div>

      {/* Recenter FAB — bottom right */}
      <div className="absolute bottom-28 right-6 z-[1000] flex flex-col items-end gap-3">
        <AnimatePresence>
          {recentering && (
            <motion.div
              key="rc-lbl"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: 'rgba(11,14,17,0.85)', color: '#FCD535', backdropFilter: 'blur(8px)', border: '1px solid rgba(252,213,53,0.25)' }}
            >
              Snapping to your location…
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          id="map-recenter-fab"
          onClick={recenter}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
          animate={recentering
            ? { boxShadow: ['0 0 0px rgba(252,213,53,0)', '0 0 28px rgba(252,213,53,0.7)', '0 0 12px rgba(252,213,53,0.3)'], rotate: [0, 20, -10, 0] }
            : { boxShadow: '0 0 0px rgba(252,213,53,0)', rotate: 0 }
          }
          transition={recentering ? { duration: 0.5 } : { duration: 0.3 }}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: recentering ? 'linear-gradient(135deg,#FCD535,#F0A500)' : '#FCD535', color: '#0B0E11' }}
          aria-label="Pusatkan peta ke lokasimu"
          aria-pressed={recentering}
        >
          <Navigation size={20} strokeWidth={2.2} fill={recentering ? '#0B0E11' : 'none'} />
        </motion.button>
      </div>

      {/* Nearby count — bottom left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="glass absolute bottom-28 left-6 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl"
        aria-live="polite"
      >
        <MapPin size={14} style={{ color: 'var(--color-gold)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          {isGhostMode ? '—' : nearbyCount} {nearbyCount === 1 ? 'teman' : 'teman'} di sekitar
        </span>
      </motion.div>
    </>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
export interface MapViewInnerProps {
  isGhostMode: boolean;
  userId: string;
}

export function MapViewInner({ isGhostMode, userId }: MapViewInnerProps) {
  const supabase = createClient();

  const [userPos,    setUserPos]    = useState<[number, number]>(DEFAULT_CENTER);
  const [profiles,   setProfiles]   = useState<Profile[]>([]);

  // Stable icon map — keyed by profile id
  const userIconRef   = useRef<L.DivIcon | null>(null);
  const friendIconMap = useRef<Map<string, L.DivIcon>>(new Map());

  if (!userIconRef.current) userIconRef.current = makeUserIcon();

  // ── Geolocation watchPosition ──────────────────────────────────────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos([lat, lng]);

        // Upsert into profiles — non-blocking, best-effort
        await supabase
          .from('profiles')
          .upsert({ id: userId, last_lat: lat, last_lng: lng, updated_at: new Date().toISOString() })
          .select();
      },
      () => {/* permission denied or unavailable — keep DEFAULT_CENTER */},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userId, supabase]);

  // ── Fetch other users' profiles ────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_initials, last_lat, last_lng')
      .not('last_lat', 'is', null)
      .neq('id', userId);   // exclude self

    if (data) setProfiles(data as Profile[]);
  }, [supabase, userId]);

  useEffect(() => {
    fetchProfiles();
    // Refresh every 30 s to pick up location updates from friends
    const interval = setInterval(fetchProfiles, 30_000);
    return () => clearInterval(interval);
  }, [fetchProfiles]);

  // ── Build friend icons (stable, memo-ised per id) ──────────────────────────
  profiles.forEach((p, i) => {
    if (!friendIconMap.current.has(p.id)) {
      const initials = p.avatar_initials ?? (p.username?.slice(0, 2).toUpperCase() ?? '??');
      friendIconMap.current.set(p.id, makeFriendIcon(initials, (i % 4) * 0.55));
    }
  });

  const visibleProfiles = profiles.filter(
    (p) => p.last_lat !== null && p.last_lng !== null
  );

  return (
    <div className="relative w-full h-full overflow-hidden" aria-label="Map view">
      <MapContainer
        center={userPos}
        zoom={ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl
      >
        <TileLayer url={TILE} attribution={ATTRIB} maxZoom={19} />

        {/* Current user marker */}
        {!isGhostMode && (
          <Marker position={userPos} icon={userIconRef.current!}>
            <Popup>
              <span style={{ color: '#FCD535', fontWeight: 700 }}>You</span>
              <br />
              <span style={{ fontSize: 11, color: '#848E9C' }}>Your current location</span>
            </Popup>
          </Marker>
        )}

        {/* Friend markers from DB */}
        {visibleProfiles.map((p) => {
          const icon = friendIconMap.current.get(p.id);
          if (!icon) return null;
          const pos: [number, number] = [p.last_lat!, p.last_lng!];
          return (
            <Marker key={p.id} position={pos} icon={icon}>
              <Popup>
                <span style={{ color: '#FCD535', fontWeight: 700 }}>
                  {p.display_name ?? p.username ?? 'User'}
                </span>
                <br />
                <span style={{ fontSize: 11, color: '#848E9C' }}>Nearby · just now</span>
              </Popup>
            </Marker>
          );
        })}

        {/* Map controls inside context */}
        <MapControls
          isGhostMode={isGhostMode}
          nearbyCount={visibleProfiles.length}
          userCenter={userPos}
        />
      </MapContainer>

      {/* Ghost mode overlay */}
      {isGhostMode && (
        <div
          className="absolute inset-0 pointer-events-none z-[900]"
          style={{ background: 'rgba(11,14,17,0.35)', backdropFilter: 'blur(1px)' }}
          aria-label="Ghost mode — location hidden"
        />
      )}
    </div>
  );
}
