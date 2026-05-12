import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  buildFallbackProfile,
  errorResponse,
  jsonResponse,
  normalizeProfile,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

/**
 * GET /api/auth/mobile-session
 * ─────────────────────────────────────────────────────────────────────────
 * Validate mobile session and return current user profile.
 *
 * Response:
 *  - 200: { user_id, profile, session_valid }
 *  - 401: { error: "..." }
 *  - 500: { error: "..." }
 */
export async function GET(request: NextRequest) {
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
    // STEP 2: Fetch current user profile from database
    // ────────────────────────────────────────────────────────────────────────
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(`[mobile-session] Profile query error for user ${user.id}:`, profileError);
      return errorResponse(request, 'Failed to fetch profile', 500);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Return profile from database or fallback
    // ────────────────────────────────────────────────────────────────────────
    let profile: any;
    
    if (profileRow) {
      profile = normalizeProfile(profileRow);
      console.info(`[mobile-session] Profile loaded for user ${user.id}: ${profile.username || profile.display_name}`);
    } else {
      profile = buildFallbackProfile(user);
      console.warn(`[mobile-session] No profile in database for user ${user.id}, returning fallback`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: Return session with current profile
    // ────────────────────────────────────────────────────────────────────────
    return jsonResponse(request, {
      user_id: user.id,
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