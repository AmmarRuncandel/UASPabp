'use client';

/**
 * MapViewInner — React-Leaflet map with real Supabase data
 * ─────────────────────────────────────────────────────────
 * • CartoDB Dark Matter tiles (no API key)
 * • navigator.geolocation.watchPosition → upserts profiles.last_lat/lng
 * • Fetches visible users via get_visible_users() RPC (friends + strangers ≤1 km)
 * • Ghost Mode activation explicitly nulls last_lat/last_lng in the DB
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
import type { VisibleUser } from '@/utils/supabase/types';

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

function makeFriendIcon(initials: string, delay: number, isFriend: boolean): L.DivIcon {
  // STRICTLY enforce: Gold/Yellow for friends, Dark/Gray for strangers
  const borderColor = isFriend ? '#FCD535' : '#4B5563';
  const bgColor     = isFriend ? '#181A20'  : '#111318';
  const textColor   = isFriend ? '#FCD535'  : '#9CA3AF';
  const shadowColor = isFriend ? 'rgba(252,213,53,0.45)' : 'rgba(75,85,99,0.3)';
  const pingColor   = isFriend ? `${borderColor}66` : `${borderColor}44`;
  return L.divIcon({
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
             <span class="leaflet-ping-ring" style="animation-delay:${delay}s;border-color:${pingColor}"></span>
             <span class="leaflet-ping-ring" style="animation-delay:${delay + 1.1}s;border-color:${pingColor}"></span>
             <div style="width:36px;height:36px;border-radius:50%;background:${bgColor};border:2px solid ${borderColor};color:${textColor};font-size:11px;font-weight:700;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${shadowColor};cursor:pointer;">${initials}</div>
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
  strangerCount,
  friendOnlineCount,
  userCenter,
}: {
  isGhostMode: boolean;
  strangerCount: number;
  friendOnlineCount: number;
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

      {/* Double spatial badges — bottom left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-28 left-6 z-[1000] flex flex-col gap-1.5"
        aria-live="polite"
      >
        {/* Badge 1: Strangers ≤1km (is_friend === false) */}
        <div
          className="glass flex items-center gap-2 px-3 py-2 rounded-xl"
          aria-label="Pengguna di sekitar"
        >
          <MapPin size={13} style={{ color: '#9CA3AF' }} />
          <span className="text-xs font-semibold" style={{ color: '#D1D5DB' }}>
            {isGhostMode ? '—' : strangerCount} pengguna di sekitar
          </span>
        </div>
        {/* Badge 2: Online friends (is_friend === true) */}
        <div
          className="glass flex items-center gap-2 px-3 py-2 rounded-xl"
          aria-label="Teman online"
        >
          <MapPin size={13} style={{ color: 'var(--color-gold)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
            {isGhostMode ? '—' : friendOnlineCount} teman online
          </span>
        </div>
      </motion.div>
    </>
  );
}

// ── FlyToController — flies to focusTarget inside MapContainer context ─────────
function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const prevTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const key = target.join(',');
    if (key === prevTarget.current) return;
    prevTarget.current = key;
    map.flyTo(target, 16, { duration: 1.4 });
  }, [map, target]);

  return null;
}

// ── Main exported component ────────────────────────────────────────────────────
export interface MapViewInnerProps {
  isGhostMode: boolean;
  userId: string;
  focusProfileId?: string | null;
}

export function MapViewInner({ isGhostMode, userId, focusProfileId }: MapViewInnerProps) {
  const supabase = createClient();

  const [userPos,       setUserPos]       = useState<[number, number]>(DEFAULT_CENTER);
  const [visibleUsers,  setVisibleUsers]  = useState<VisibleUser[]>([]);
  const [currentLat,    setCurrentLat]    = useState<number | null>(null);
  const [currentLng,    setCurrentLng]    = useState<number | null>(null);
  const [flyTarget,     setFlyTarget]     = useState<[number, number] | null>(null);

  // Track previous ghost mode to detect the transition OFF → ON
  const prevGhostRef = useRef(isGhostMode);

  // Stable icon map — keyed by profile id
  const userIconRef   = useRef<L.DivIcon | null>(null);
  const friendIconMap = useRef<Map<string, L.DivIcon>>(new Map());

  if (!userIconRef.current) userIconRef.current = makeUserIcon();

  // ── Ghost Mode: wipe coordinates from DB when activated ───────────────────
  useEffect(() => {
    const wasGhost = prevGhostRef.current;
    prevGhostRef.current = isGhostMode;

    // Transition: non-ghost → ghost → erase footprint
    if (!wasGhost && isGhostMode) {
      supabase
        .from('profiles')
        .update({ last_lat: null, last_lng: null })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.warn('[Map] Failed to wipe ghost coordinates:', error.message);
          else console.log('[Map] Ghost Mode: coordinates wiped from DB');
        });
    }
  }, [isGhostMode, userId, supabase]);

  // ── Geolocation watchPosition ──────────────────────────────────────────────
  useEffect(() => {
    // Skip geolocation tracking if ghost mode is enabled
    if (isGhostMode || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos([lat, lng]);
        setCurrentLat(lat);
        setCurrentLng(lng);

        // Update profiles — non-blocking, best-effort. Only update existing profile row.
        await supabase
          .from('profiles')
          .update({ last_lat: lat, last_lng: lng, updated_at: new Date().toISOString() })
          .eq('id', userId);
      },
      () => {/* permission denied or unavailable — keep DEFAULT_CENTER */},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userId, supabase, isGhostMode]);

  // ── Fetch visible users via spatial RPC ────────────────────────────────────
  const fetchVisibleUsers = useCallback(async () => {
    // Need at least a rough location to call the RPC
    const lat = currentLat ?? DEFAULT_CENTER[0];
    const lng = currentLng ?? DEFAULT_CENTER[1];

    const { data, error } = await supabase.rpc('get_visible_users', {
      caller_id: userId,
      user_lat:  lat,
      user_lng:  lng,
    });

    if (error) {
      console.warn('[Map] RPC get_visible_users error:', error.message);
      return;
    }

    if (data) {
      // Filter out entries without valid coordinates (safety guard)
      const users = (data as VisibleUser[]).filter(
        (u) => u.last_lat !== null && u.last_lng !== null
      );
      setVisibleUsers(users);
    }
  }, [supabase, userId, currentLat, currentLng]);

  useEffect(() => {
    fetchVisibleUsers();
    // Refresh every 30 s to pick up location updates
    const interval = setInterval(fetchVisibleUsers, 30_000);
    return () => clearInterval(interval);
  }, [fetchVisibleUsers]);

  // ── Focus on a specific profile → flyTo at zoom 16 ──────────────────────────
  useEffect(() => {
    if (!focusProfileId) return;
    const focused = visibleUsers.find((u) => u.id === focusProfileId);
    if (!focused) return;
    setFlyTarget([focused.last_lat, focused.last_lng]);
  }, [focusProfileId, visibleUsers]);

  // ── Build friend icons (stable, memo-ised per id) ──────────────────────────
  visibleUsers.forEach((u, i) => {
    if (!friendIconMap.current.has(u.id)) {
      const initials = u.avatar_initials ?? (u.username?.slice(0, 2).toUpperCase() ?? '??');
      const isFriend = u.relation_type === 'friend';
      friendIconMap.current.set(u.id, makeFriendIcon(initials, (i % 4) * 0.55, isFriend));
    }
  });

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
              <span style={{ color: '#FCD535', fontWeight: 700 }}>Kamu</span>
              <br />
              <span style={{ fontSize: 11, color: '#848E9C' }}>Lokasi kamu saat ini</span>
            </Popup>
          </Marker>
        )}

        {/* Visible user markers from RPC */}
        {visibleUsers.map((u) => {
          const icon = friendIconMap.current.get(u.id);
          if (!icon) return null;
          const pos: [number, number] = [u.last_lat, u.last_lng];

          function popupLastSeen(updated_at?: string | null) {
            if (!updated_at) return '—';
            const then = new Date(updated_at).getTime();
            const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
            if (diff < 60) return 'Online sekarang';
            if (diff < 3600) return `Terakhir aktif ${Math.floor(diff / 60)} menit lalu`;
            if (diff < 86400) return `Terakhir aktif ${Math.floor(diff / 3600)} jam lalu`;
            return `Terakhir aktif ${Math.floor(diff / 86400)} hari lalu`;
          }

          const relationLabel = u.relation_type === 'friend' ? 'Teman' : 'Pengguna di sekitar';

          return (
            <Marker key={u.id} position={pos} icon={icon}>
              <Popup>
                <span style={{ color: '#FCD535', fontWeight: 700 }}>
                  {u.display_name ?? u.username ?? 'Pengguna'}
                </span>
                <br />
                <span style={{ fontSize: 10, color: '#FCD535', opacity: 0.7 }}>{relationLabel}</span>
                <br />
                <span style={{ fontSize: 11, color: '#848E9C' }}>{popupLastSeen(u.updated_at)}</span>
              </Popup>
            </Marker>
          );
        })}

        {/* Map controls inside context */}
        <FlyToController target={flyTarget} />
        <MapControls
          isGhostMode={isGhostMode}
          strangerCount={visibleUsers.filter((u) => u.relation_type === 'stranger').length}
          friendOnlineCount={visibleUsers.filter((u) => u.relation_type === 'friend').length}
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
