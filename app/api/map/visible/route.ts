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
    // ────────────────────────────────────────────────────────────────────────────
    // STEP 1: Authenticate request and get user context
    // ────────────────────────────────────────────────────────────────────────────
    const authResult = await authenticateMobileRequest(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const { user, supabase } = authResult;
    console.log(`[map/visible] Request from user: ${user.id}`);

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Extract & validate coordinate query parameters
    // ────────────────────────────────────────────────────────────────────────────
    const latParam = request.nextUrl.searchParams.get('lat');
    const lngParam = request.nextUrl.searchParams.get('lng');

    console.log(`[map/visible] Query params - lat: ${latParam}, lng: ${lngParam}`);

    // Convert to numbers and validate
    const lat = toNumberOrNull(latParam);
    const lng = toNumberOrNull(lngParam);

    if (lat === null || lng === null) {
      console.error('[map/visible] Invalid coordinates');
      return errorResponse(
        request,
        'Query parameters lat and lng are required and must be valid numbers.',
        400
      );
    }

    // Validate geographic coordinate bounds
    if (lat < -90 || lat > 90) {
      console.error(`[map/visible] Invalid latitude: ${lat}`);
      return errorResponse(
        request,
        'Latitude must be between -90 and 90.',
        400
      );
    }

    if (lng < -180 || lng > 180) {
      console.error(`[map/visible] Invalid longitude: ${lng}`);
      return errorResponse(
        request,
        'Longitude must be between -180 and 180.',
        400
      );
    }

    console.log(`[map/visible] Valid coordinates: (${lat}, ${lng})`);

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Call RPC function to get nearby users
    // ────────────────────────────────────────────────────────────────────────────
    console.log(`[map/visible] Calling RPC get_nearby_users for user ${user.id} at (${lat}, ${lng})`);

    let data: any = null;
    let error: any = null;

    // Try primary RPC function name
    const rpcResult = await supabase.rpc('get_nearby_users', {
      caller_id: user.id,
      user_lat: lat,
      user_lng: lng,
    });

    data = rpcResult.data;
    error = rpcResult.error;

    // If function not found, try alternative name
    if (error && error.message?.includes('function') && error.message?.includes('does not exist')) {
      console.warn('[map/visible] get_nearby_users not found, trying get_visible_users');
      const fallbackResult = await supabase.rpc('get_visible_users', {
        caller_id: user.id,
        user_lat: lat,
        user_lng: lng,
      });
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error(
        `[map/visible] RPC error for user ${user.id} at (${lat}, ${lng}):`,
        error
      );
      console.error('[map/visible] Error details:', JSON.stringify(error, null, 2));
      return errorResponse(request, `RPC Error: ${error.message}`, 500);
    }

    console.log(`[map/visible] RPC returned ${data?.length || 0} users`);

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 4: Transform RPC results into response format
    // ────────────────────────────────────────────────────────────────────────────
    const visibleUsers = ((data ?? []) as VisibleUser[])
      .map((row) => {
        const rowLat = toNumberOrNull(row.last_lat);
        const rowLng = toNumberOrNull(row.last_lng);

        // Skip users without valid coordinates
        if (rowLat === null || rowLng === null) {
          console.warn(`[map/visible] Skipping user ${row.id} - invalid coordinates`);
          return null;
        }

        // Calculate distance from current position
        const distanceKm = calculateDistanceKm(lat, lng, rowLat, rowLng);

        // Filter: Only include users within 1km
        if (distanceKm > 1) {
          console.log(`[map/visible] Filtering out user ${row.id} - distance: ${distanceKm.toFixed(2)}km`);
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
      `[map/visible] Returning ${visibleUsers.length} visible users for user ${user.id} at (${lat}, ${lng})`
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
