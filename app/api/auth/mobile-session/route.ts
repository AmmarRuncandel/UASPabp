import { NextRequest } from 'next/server';

import {
  buildFallbackProfile,
  createAnonSupabaseClient,
  errorResponse,
  jsonResponse,
  normalizeProfile,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

/**
 * GET /api/auth/mobile-session
 * ─────────────────────────────────────────────────────────────────────────
 * Validate mobile session and return current user profile.
 *
 * SECURITY NOTES:
 *  - User ID extracted from x-user-id header (set by proxy.ts after JWT verification)
 *  - No token decoding needed in handler — proxy already validated
 *  - Request headers have been sanitized to prevent spoofing attacks
 *
 * Response:
 *  - 200: { user_id, profile, session_valid }
 *  - 401: { error: "..." } (from proxy.ts or missing header)
 *  - 500: { error: "..." } (database error)
 */
export async function GET(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: Extract user context from header set by proxy.ts
    // ────────────────────────────────────────────────────────────────────────
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized: Missing user context', 401);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: Fetch current user profile from database
    // ────────────────────────────────────────────────────────────────────────
    const anonClient = createAnonSupabaseClient();

    const { data: profileRow, error: profileError } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error(`[mobile-session] Profile query error for user ${userId}:`, profileError);
      return errorResponse(request, 'Failed to fetch profile', 500);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Return profile from database (do NOT use fallback)
    // Fallback only used if profile genuinely missing from DB
    // ────────────────────────────────────────────────────────────────────────
    let profile: any;
    
    if (profileRow) {
      // Profile exists in database — return with all fields normalized
      profile = normalizeProfile(profileRow);
      console.info(`[mobile-session] Profile loaded for user ${userId}: ${profile.username || profile.display_name}`);
    } else {
      // Profile NOT in database — return minimal fallback (should rarely happen)
      profile = buildFallbackProfile({ id: userId, email: null });
      console.warn(`[mobile-session] No profile in database for user ${userId}, returning fallback`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: Return session with current profile
    // ────────────────────────────────────────────────────────────────────────
    return jsonResponse(request, {
      user_id: userId,
      profile,
      session_valid: true,
    });
  } catch (error) {
    console.error('[mobile-session] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to validate mobile session.',
      500
    );
  }
}