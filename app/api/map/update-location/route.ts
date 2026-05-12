import { NextRequest } from 'next/server';

import {
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
  toNumberOrNull,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

type UpdateLocationBody = {
  lat?: number;
  lng?: number;
};

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

async function authenticateLocationRequest(request: NextRequest) {
  const userId = extractUserContextFromHeader(request);
  const token = getBearerToken(request);

  if (!userId || !token) {
    return { response: errorResponse(request, 'Unauthorized: Missing user context', 401) };
  }

  const supabase = createAuthedSupabaseClient(token);
  const { data: authUser, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser.user?.id) {
    console.error('[map/update-location] Token verification failed:', authError);
    return { response: errorResponse(request, 'Invalid or expired bearer token.', 401) };
  }

  if (authUser.user.id !== userId) {
    console.warn(`[map/update-location] User context mismatch. header=${userId}, token=${authUser.user.id}`);
    return { response: errorResponse(request, 'Unauthorized: Invalid user context', 401) };
  }

  return { userId, supabase };
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateLocationRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const { userId, supabase } = auth;
    const body = (await request.json()) as UpdateLocationBody;

    console.log(`[map/update-location] Request from user: ${userId}`);
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

    console.log(`[map/update-location] Updating location for user ${userId} to (${lat}, ${lng})`);

    // Update location in database
    const { error } = await supabase
      .from('profiles')
      .update({
        last_lat: lat,
        last_lng: lng,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error(`[map/update-location] Update error for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    console.info(`[map/update-location] Location updated successfully for user ${userId}: (${lat}, ${lng})`);

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
