import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
  toNumberOrNull,
} from '@/app/api/_lib/mobile-rest';

type UpdateLocationBody = {
  lat?: number;
  lng?: number;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

async function handleLocationUpdate(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: Authenticate request and get user context
    // ────────────────────────────────────────────────────────────────────────
    const authResult = await authenticateMobileRequest(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const { user, supabase } = authResult;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: Validate request body
    // ────────────────────────────────────────────────────────────────────────
    const body = (await request.json()) as UpdateLocationBody;

    console.log(`[map/update-location] Request from user: ${user.id}`);
    console.log(`[map/update-location] Body:`, body);

    const lat = toNumberOrNull(body.lat);
    const lng = toNumberOrNull(body.lng);

    if (lat === null || lng === null) {
      console.error('[map/update-location] Invalid coordinates');
      return errorResponse(request, 'lat and lng are required and must be valid numbers.', 400);
    }

    // Validate geographic coordinate bounds
    if (lat < -90 || lat > 90) {
      console.error(`[map/update-location] Invalid latitude: ${lat}`);
      return errorResponse(request, 'Latitude must be between -90 and 90.', 400);
    }

    if (lng < -180 || lng > 180) {
      console.error(`[map/update-location] Invalid longitude: ${lng}`);
      return errorResponse(request, 'Longitude must be between -180 and 180.', 400);
    }

    console.log(`[map/update-location] Updating location for user ${user.id} to (${lat}, ${lng})`);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Update location in database
    // ────────────────────────────────────────────────────────────────────────
    const { error } = await supabase
      .from('profiles')
      .update({
        last_lat: lat,
        last_lng: lng,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error(`[map/update-location] Update error for user ${user.id}:`, error);
      return errorResponse(request, error.message, 500);
    }

    console.info(`[map/update-location] Location updated successfully for user ${user.id}: (${lat}, ${lng})`);

    return jsonResponse(request, { success: true, lat, lng });
  } catch (error) {
    console.error('[map/update-location] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to update location.',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  return handleLocationUpdate(request);
}

export async function PATCH(request: NextRequest) {
  return handleLocationUpdate(request);
}
