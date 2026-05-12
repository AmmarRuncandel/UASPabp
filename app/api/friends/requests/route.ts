import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
  normalizeProfile,
} from '@/app/api/_lib/mobile-rest';
import type { Profile } from '@/utils/supabase/types';

type FriendRequestRow = {
  requester_id: string;
  requester: Partial<Profile> & Pick<Profile, 'id'> | null;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

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
    // STEP 2: Query pending friend requests
    // ────────────────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        requester:profiles!friendships_requester_id_fkey(*)
      `)
      .eq('status', 'pending')
      .eq('addressee_id', user.id);

    if (error) {
      console.error(`[friends/requests] Pending requests query error for user ${user.id}:`, error);
      return errorResponse(request, error.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Normalize results
    // ────────────────────────────────────────────────────────────────────────
    const requests = ((data ?? []) as unknown as FriendRequestRow[])
      .map((row) => {
        const profileData = Array.isArray(row.requester) ? row.requester[0] : row.requester;
        return profileData;
      })
      .filter(
        (profile): profile is NonNullable<FriendRequestRow['requester']> =>
          profile !== null && profile !== undefined
      )
      .map((profile) => normalizeProfile(profile));

    return jsonResponse(request, requests);
  } catch (error) {
    console.error('[friends/requests] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load friend requests.',
      500
    );
  }
}