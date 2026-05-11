import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  calculateDistanceKm,
  errorResponse,
  getLastSeenState,
  jsonResponse,
  optionsResponse,
  resolveIsFriend,
  toNumberOrNull,
} from '@/app/api/_lib/mobile-rest';
import type { VisibleUser } from '@/utils/supabase/types';

type VisibleUserResponse = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  last_lat: number;
  last_lng: number;
  updated_at: string | null;
  relation_type: 'friend' | 'stranger';
  is_friend: boolean;
  is_online: boolean;
  last_seen_label: string;
  distance_km: number;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const latParam = request.nextUrl.searchParams.get('lat');
    const lngParam = request.nextUrl.searchParams.get('lng');
    const lat = toNumberOrNull(latParam);
    const lng = toNumberOrNull(lngParam);

    if (lat === null || lng === null) {
      return errorResponse(request, 'Query parameters lat and lng are required.', 400);
    }

    const { data, error } = await auth.supabase.rpc('get_visible_users', {
      caller_id: auth.user.id,
      user_lat: lat,
      user_lng: lng,
    });

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    const visibleUsers = ((data ?? []) as VisibleUser[])
      .map((row) => {
        const rowLat = toNumberOrNull(row.last_lat);
        const rowLng = toNumberOrNull(row.last_lng);

        if (rowLat === null || rowLng === null) {
          return null;
        }

        const distanceKm = calculateDistanceKm(lat, lng, rowLat, rowLng);
        if (distanceKm > 1) {
          return null;
        }

        const lastSeen = getLastSeenState(row.updated_at);

        return {
          id: row.id,
          username: row.username,
          display_name: row.display_name,
          avatar_initials: row.avatar_initials,
          last_lat: rowLat,
          last_lng: rowLng,
          updated_at: row.updated_at,
          relation_type: row.relation_type,
          is_friend: resolveIsFriend(row),
          is_online: lastSeen.isOnline,
          last_seen_label: lastSeen.label,
          distance_km: distanceKm,
        } satisfies VisibleUserResponse;
      })
      .filter((row): row is VisibleUserResponse => row !== null);

    return jsonResponse(request, visibleUsers);
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load visible users.',
      500
    );
  }
}
