import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import type { Message, Profile, VisibleUser } from '@/utils/supabase/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ALLOWED_ORIGINS = new Set([
  'https://zmayy.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

function assertSupabaseEnvironment() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured.');
  }
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');

  if (!origin) {
    return '*';
  }

  return ALLOWED_ORIGINS.has(origin) ? origin : '*';
}

export function buildCorsHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  headers.set('Access-Control-Expose-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');
  return headers;
}

export function jsonResponse<T>(request: NextRequest, body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: buildCorsHeaders(request),
  });
}

export function errorResponse(request: NextRequest, message: string, status = 400): NextResponse<{ error: string }> {
  return jsonResponse(request, { error: message }, status);
}

export function optionsResponse(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export function createAnonSupabaseClient(): SupabaseClient {
  assertSupabaseEnvironment();

  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

export function createAuthedSupabaseClient(token: string): SupabaseClient {
  assertSupabaseEnvironment();

  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

export async function authenticateMobileRequest(
  request: NextRequest
): Promise<
  | { user: User; token: string; supabase: SupabaseClient }
  | { response: NextResponse<{ error: string }> }
> {
  const token = getBearerToken(request);
  if (!token) {
    return { response: errorResponse(request, 'Missing bearer token.', 401) };
  }

  const anonClient = createAnonSupabaseClient();
  const { data, error } = await anonClient.auth.getUser(token);

  if (error || !data.user) {
    return { response: errorResponse(request, 'Invalid or expired bearer token.', 401) };
  }

  return {
    user: data.user,
    token,
    supabase: createAuthedSupabaseClient(token),
  };
}

export function normalizeProfile(profile: Partial<Profile> & Pick<Profile, 'id'>): Profile {
  return {
    id: profile.id,
    username: profile.username ?? null,
    display_name: profile.display_name ?? null,
    avatar_initials: profile.avatar_initials ?? null,
    last_lat: profile.last_lat ?? null,
    last_lng: profile.last_lng ?? null,
    updated_at: profile.updated_at ?? null,
    is_ghost_mode: profile.is_ghost_mode ?? false,
    notifications_enabled: profile.notifications_enabled ?? true,
    is_public: profile.is_public ?? true,
    notify_global: profile.notify_global ?? profile.notifications_enabled ?? true,
    notify_requests: profile.notify_requests ?? true,
    notify_messages: profile.notify_messages ?? true,
    notify_sound: profile.notify_sound ?? true,
  };
}

export function buildFallbackProfile(user: User): Profile {
  return normalizeProfile({
    id: user.id,
    username: user.email?.split('@')[0] ?? null,
    display_name: null,
    avatar_initials: null,
    last_lat: null,
    last_lng: null,
    updated_at: null,
    is_ghost_mode: false,
    notifications_enabled: true,
    is_public: true,
    notify_global: true,
    notify_requests: true,
    notify_messages: true,
    notify_sound: true,
  });
}

export function resolveIsFriend(row: Pick<VisibleUser, 'relation_type' | 'is_friend'>): boolean {
  if (row.relation_type === 'friend') {
    return true;
  }

  if (row.relation_type === 'stranger') {
    return false;
  }

  return row.is_friend === true;
}

export function getLastSeenState(updatedAt?: string | null): { isOnline: boolean; label: string } {
  if (!updatedAt) {
    return { isOnline: false, label: '—' };
  }

  const diffMs = Date.now() - new Date(updatedAt).getTime();
  if (diffMs < 60_000) {
    return { isOnline: true, label: 'Online sekarang' };
  }

  if (diffMs < 3_600_000) {
    return { isOnline: false, label: `Terakhir aktif ${Math.floor(diffMs / 60_000)} menit lalu` };
  }

  if (diffMs < 86_400_000) {
    return { isOnline: false, label: `Terakhir aktif ${Math.floor(diffMs / 3_600_000)} jam lalu` };
  }

  return { isOnline: false, label: `Terakhir aktif ${Math.floor(diffMs / 86_400_000)} hari lalu` };
}

export function calculateDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const earthRadiusKm = 6_371;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function toNumberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : (value as number | null | undefined);

  if (parsed === null || parsed === undefined || Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function isMessageWithinThreeHours(createdAt: string): boolean {
  return new Date(createdAt).getTime() > Date.now() - 3 * 60 * 60 * 1000;
}

export type GlobalChatMessageRow = Message;
