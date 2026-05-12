import { NextRequest } from 'next/server';

import {
  calculateDistanceKm,
  createAnonSupabaseClient,
  errorResponse,
  getLastSeenState,
  jsonResponse,
  optionsResponse,
  resolveIsFriend,
  toNumberOrNull,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';
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
    // ────────────────────────────────────────────────────────────────────────────
    // STEP 1: Extract & validate user context from header (verified by proxy.ts)
    // ────────────────────────────────────────────────────────────────────────────
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized: Missing user context', 401);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Extract & validate coordinate query parameters
    // ────────────────────────────────────────────────────────────────────────────
    const latParam = request.nextUrl.searchParams.get('lat');
    const lngParam = request.nextUrl.searchParams.get('lng');

    // Convert to numbers and validate
    const lat = toNumberOrNull(latParam);
    const lng = toNumberOrNull(lngParam);

    if (lat === null || lng === null) {
      return errorResponse(
        request,
        'Query parameters lat and lng are required and must be valid numbers.',
        400
      );
    }

    // ✓ IMPROVEMENT: Validate geographic coordinate bounds
    if (lat < -90 || lat > 90) {
      return errorResponse(
        request,
        'Latitude must be between -90 and 90.',
        400
      );
    }

    if (lng < -180 || lng > 180) {
      return errorResponse(
        request,
        'Longitude must be between -180 and 180.',
        400
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Create Supabase client and call RPC function
    // ────────────────────────────────────────────────────────────────────────────
    const supabase = createAnonSupabaseClient();

    const { data, error } = await supabase.rpc('get_nearby_users', {
      caller_id: userId,
      user_lat: lat,
      user_lng: lng,
    });

    if (error) {
      console.error(
        `[map/visible] RPC error for user ${userId} at (${lat}, ${lng}):`,
        error
      );
      return errorResponse(request, error.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 4: Transform RPC results into response format
    // ────────────────────────────────────────────────────────────────────────────
    const visibleUsers = ((data ?? []) as VisibleUser[])
      .map((row) => {
        const rowLat = toNumberOrNull(row.last_lat);
        const rowLng = toNumberOrNull(row.last_lng);

        // Skip users without valid coordinates
        if (rowLat === null || rowLng === null) {
          return null;
        }

        // Calculate distance from current position
        const distanceKm = calculateDistanceKm(lat, lng, rowLat, rowLng);

        // ✓ FILTER: Only include users within 1km (safety & performance)
        if (distanceKm > 1) {
          return null;
        }

        // Get online status from last_updated timestamp
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

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 5: Return response with CORS headers
    // ────────────────────────────────────────────────────────────────────────────
    console.info(
      `[map/visible] Returned ${visibleUsers.length} visible users for user ${userId} at (${lat}, ${lng})`
    );

    return jsonResponse(request, visibleUsers);
  } catch (error) {
    console.error('[map/visible] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load visible users.',
      500
    );
  }
}
