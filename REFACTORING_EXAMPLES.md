/**
 * REFERENCE IMPLEMENTATIONS — Endpoint Refactoring Examples
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file shows BEFORE/AFTER for three protected endpoints that need refactoring
 * from the old authenticateMobileRequest() pattern to the new x-user-id header pattern.
 * 
 * Files referenced:
 *  - app/api/chat/send/route.ts
 *  - app/api/chat/history/route.ts  
 *  - app/api/map/visible/route.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═════════════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: POST /api/chat/send
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * BEFORE (Old Pattern):
 * ─────────────────────
 */
export async function POST_BEFORE(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);  // ← Complex token verification
    if ('response' in auth) {
      return auth.response;
    }

    const body = (await request.json()) as SendMessageBody;
    const messageText = (body.message ?? '').trim();
    const imageUrl = body.image_url ?? null;

    if (!messageText) {
      return errorResponse(request, 'Message text is required.', 400);
    }

    const { data: inserted, error } = await auth.supabase  // ← Using auth.supabase
      .from('messages')
      .insert({ sender_id: auth.user.id, content: messageText, image_url: imageUrl })  // ← auth.user.id
      .select('*')
      .single();

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, inserted, 201);
  } catch (err) {
    return errorResponse(
      request,
      err instanceof Error ? err.message : 'Unable to send message.',
      500
    );
  }
}

/**
 * AFTER (New Pattern):
 * ────────────────────
 */
import { NextRequest } from 'next/server';
import {
  createAnonSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

type SendMessageBody = {
  message?: string;
  image_url?: string | null;
};

// ✓ OPTIONS is same for all methods
export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────────────────
    // STEP 1: Extract user context from header (set by proxy.ts)
    // ────────────────────────────────────────────────────────────────────────────
    // ✓ CHANGE: Replace authenticateMobileRequest() with extractUserContextFromHeader()
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized: Missing user context', 401);
    }
    // ← Now we have userId directly, no complex auth object

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Parse and validate request body
    // ────────────────────────────────────────────────────────────────────────────
    const body = (await request.json()) as SendMessageBody;
    const messageText = (body.message ?? '').trim();
    const imageUrl = body.image_url ?? null;

    // Validate message content
    if (!messageText) {
      return errorResponse(request, 'Message text is required.', 400);
    }

    // ✓ IMPROVEMENT: Add max length validation
    const MAX_MESSAGE_LENGTH = 5000;
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(
        request,
        `Message exceeds ${MAX_MESSAGE_LENGTH} characters.`,
        400
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Create anon Supabase client (single instance, not per-auth)
    // ────────────────────────────────────────────────────────────────────────────
    // ✓ CHANGE: Use createAnonSupabaseClient() instead of auth.supabase
    const supabase = createAnonSupabaseClient();

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,  // ← Use extracted userId
        content: messageText,
        image_url: imageUrl,
      })
      .select('*')
      .single();

    if (error) {
      console.error(`[chat/send] Error inserting message for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 4: Return created message
    // ────────────────────────────────────────────────────────────────────────────
    return jsonResponse(request, inserted, 201);
  } catch (err) {
    console.error('[chat/send] Unexpected error:', err);
    return errorResponse(
      request,
      err instanceof Error ? err.message : 'Unable to send message.',
      500
    );
  }
}

// SUMMARY OF CHANGES FOR /api/chat/send:
// ─────────────────────────────────────────────────────────────────────────────
// ✓ Replaced: authenticateMobileRequest() → extractUserContextFromHeader()
// ✓ Removed: Conditional check for 'response' in auth
// ✓ Replaced: auth.supabase → createAnonSupabaseClient()
// ✓ Replaced: auth.user.id → userId
// ✓ Added: Message length validation
// ✓ Added: Console logging for debugging
// ✓ Benefit: Simpler, faster, no JWT decoding per request

// ═════════════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: GET /api/chat/history
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * BEFORE (Old Pattern):
 */
export async function GET_BEFORE(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);  // ← Decodes JWT
    if ('response' in auth) {
      return auth.response;
    }

    const cutoffIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data, error } = await auth.supabase  // ← Using auth.supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    const recentMessages = ((data ?? []) as GlobalChatMessageRow[])
      .filter((message) => isMessageWithinThreeHours(message.created_at))
      .slice(-10);

    const senderIds = [...new Set(recentMessages.map((message) => message.sender_id))];
    let senderProfiles = new Map<string, Profile>();

    if (senderIds.length > 0) {
      const { data: profileRows, error: profileError } = await auth.supabase  // ← Using auth.supabase again
        .from('profiles')
        .select('*')
        .in('id', senderIds);

      if (profileError) {
        return errorResponse(request, profileError.message, 500);
      }

      senderProfiles = new Map(
        (profileRows ?? []).map((profileRow) => {
          const normalized = normalizeProfile(profileRow);
          return [normalized.id, normalized];
        })
      );
    }

    const payload: GlobalChatMessageResponse[] = recentMessages.map((message) => ({
      id: message.id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      sender_profile: senderProfiles.get(message.sender_id) ?? null,
      is_mine: message.sender_id === auth.user.id,  // ← Using auth.user.id
    }));

    return jsonResponse(request, payload);
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load chat history.',
      500
    );
  }
}

/**
 * AFTER (New Pattern):
 */
export async function GET(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────────────────
    // STEP 1: Extract authenticated user from header
    // ────────────────────────────────────────────────────────────────────────────
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized: Missing user context', 401);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Create Supabase client (same for all queries)
    // ────────────────────────────────────────────────────────────────────────────
    const supabase = createAnonSupabaseClient();

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Fetch recent messages (last 3 hours)
    // ────────────────────────────────────────────────────────────────────────────
    const cutoffIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[chat/history] Message query error for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 4: Filter and limit messages
    // ────────────────────────────────────────────────────────────────────────────
    const recentMessages = ((data ?? []) as GlobalChatMessageRow[])
      .filter((message) => isMessageWithinThreeHours(message.created_at))
      .slice(-10);

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 5: Batch fetch sender profiles
    // ────────────────────────────────────────────────────────────────────────────
    const senderIds = [...new Set(recentMessages.map((message) => message.sender_id))];
    let senderProfiles = new Map<string, Profile>();

    if (senderIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds);

      if (profileError) {
        console.error(`[chat/history] Profile query error:`, profileError);
        return errorResponse(request, profileError.message, 500);
      }

      senderProfiles = new Map(
        (profileRows ?? []).map((profileRow) => {
          const normalized = normalizeProfile(profileRow);
          return [normalized.id, normalized];
        })
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 6: Format response
    // ────────────────────────────────────────────────────────────────────────────
    const payload: GlobalChatMessageResponse[] = recentMessages.map((message) => ({
      id: message.id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      sender_profile: senderProfiles.get(message.sender_id) ?? null,
      is_mine: message.sender_id === userId,  // ← Use extracted userId
    }));

    return jsonResponse(request, payload);
  } catch (error) {
    console.error('[chat/history] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load chat history.',
      500
    );
  }
}

// SUMMARY OF CHANGES FOR /api/chat/history:
// ─────────────────────────────────────────────────────────────────────────────
// ✓ Replaced: authenticateMobileRequest() → extractUserContextFromHeader()
// ✓ Removed: Conditional check for 'response' in auth
// ✓ Replaced: auth.supabase → createAnonSupabaseClient() (single instance)
// ✓ Replaced: auth.user.id → userId
// ✓ Added: Per-operation error logging
// ✓ Benefit: Cleaner code, one Supabase client, easier to test

// ═════════════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: GET /api/map/visible
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * BEFORE (Old Pattern):
 */
export async function GET_MAP_BEFORE(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);  // ← Decodes JWT + fetches user
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

    const { data, error } = await auth.supabase.rpc('get_nearby_users', {  // ← RPC call
      caller_id: auth.user.id,  // ← Using auth.user.id
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

/**
 * AFTER (New Pattern):
 */
export async function GET_MAP(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────────────────
    // STEP 1: Extract user context from header
    // ────────────────────────────────────────────────────────────────────────────
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized: Missing user context', 401);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Validate query parameters
    // ────────────────────────────────────────────────────────────────────────────
    const latParam = request.nextUrl.searchParams.get('lat');
    const lngParam = request.nextUrl.searchParams.get('lng');
    const lat = toNumberOrNull(latParam);
    const lng = toNumberOrNull(lngParam);

    if (lat === null || lng === null) {
      return errorResponse(
        request,
        'Query parameters lat and lng are required and must be valid numbers.',
        400
      );
    }

    // ✓ IMPROVEMENT: Validate coordinate bounds
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse(
        request,
        'Latitude must be between -90 and 90, longitude between -180 and 180.',
        400
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Create Supabase client and call RPC function
    // ────────────────────────────────────────────────────────────────────────────
    const supabase = createAnonSupabaseClient();

    const { data, error } = await supabase.rpc('get_nearby_users', {
      caller_id: userId,  // ← Use extracted userId
      user_lat: lat,
      user_lng: lng,
    });

    if (error) {
      console.error(`[map/visible] RPC error for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 4: Transform and filter results
    // ────────────────────────────────────────────────────────────────────────────
    const visibleUsers = ((data ?? []) as VisibleUser[])
      .map((row) => {
        const rowLat = toNumberOrNull(row.last_lat);
        const rowLng = toNumberOrNull(row.last_lng);

        if (rowLat === null || rowLng === null) {
          return null;
        }

        const distanceKm = calculateDistanceKm(lat, lng, rowLat, rowLng);
        
        // ✓ FILTER: Only include users within 1km
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
    console.error('[map/visible] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load visible users.',
      500
    );
  }
}

// SUMMARY OF CHANGES FOR /api/map/visible:
// ─────────────────────────────────────────────────────────────────────────────
// ✓ Replaced: authenticateMobileRequest() → extractUserContextFromHeader()
// ✓ Removed: Conditional check for 'response' in auth
// ✓ Replaced: auth.supabase → createAnonSupabaseClient()
// ✓ Replaced: auth.user.id → userId
// ✓ Added: Coordinate bounds validation (prevents invalid geo requests)
// ✓ Added: Error logging with user context
// ✓ Benefit: Better input validation, faster execution, clearer error messages

// ═════════════════════════════════════════════════════════════════════════════════
// STEP-BY-STEP REFACTORING TEMPLATE
// ═════════════════════════════════════════════════════════════════════════════════

/**
 * Use this template for refactoring ANY protected endpoint:
 *
 * 1. IDENTIFY ENDPOINT TYPE
 *    - If starts with /api/auth/ → likely PUBLIC (check isPublicRoute list)
 *    - If starts with /api/chat/, /api/map/, etc → likely PROTECTED
 *
 * 2. UPDATE IMPORTS
 *    OLD:
 *      import { authenticateMobileRequest, ... } from '@/app/api/_lib/mobile-rest';
 *    NEW:
 *      import { extractUserContextFromHeader } from '@/app/api/_lib/security';
 *      import { createAnonSupabaseClient, ... } from '@/app/api/_lib/mobile-rest';
 *
 * 3. REPLACE AUTH EXTRACTION (in handler function)
 *    OLD:
 *      const auth = await authenticateMobileRequest(request);
 *      if ('response' in auth) {
 *        return auth.response;
 *      }
 *      const userId = auth.user.id;
 *      const supabase = auth.supabase;
 *
 *    NEW:
 *      const userId = extractUserContextFromHeader(request);
 *      if (!userId) {
 *        return errorResponse(request, 'Unauthorized', 401);
 *      }
 *      const supabase = createAnonSupabaseClient();
 *
 * 4. REPLACE ALL REFERENCES
 *    OLD: auth.user.id → NEW: userId
 *    OLD: auth.supabase → NEW: supabase
 *
 * 5. ADD LOGGING
 *    Add console.error() for debugging with userId context
 *
 * 6. TEST
 *    - With valid token: ✓ should work
 *    - Without token: ✓ should return 401
 *    - With invalid token: ✓ should return 401 from proxy
 *
 * 7. DEPLOY
 *    - Merge to main
 *    - Monitor logs for errors
 *    - Alert if 401 rate spikes
 */
