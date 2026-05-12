import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
  normalizeProfile,
} from '@/app/api/_lib/mobile-rest';
import type { Profile } from '@/utils/supabase/types';

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

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Query friendships where user is the ADDRESSEE
    // ────────────────────────────────────────────────────────────────────────────
    const { data: asAddressee, error: addresseeError } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        requester:profiles!friendships_requester_id_fkey(*)
      `)
      .eq('status', 'accepted')
      .eq('addressee_id', user.id);

    if (addresseeError) {
      console.error(`[friends] Query error (as addressee) for user ${user.id}:`, addresseeError);
      return errorResponse(request, addresseeError.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Query friendships where user is the REQUESTER
    // ────────────────────────────────────────────────────────────────────────────
    const { data: asRequester, error: requesterError } = await supabase
      .from('friendships')
      .select(`
        addressee_id,
        addressee:profiles!friendships_addressee_id_fkey(*)
      `)
      .eq('status', 'accepted')
      .eq('requester_id', user.id);

    if (requesterError) {
      console.error(`[friends] Query error (as requester) for user ${user.id}:`, requesterError);
      return errorResponse(request, requesterError.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 4: Normalize and merge results from both queries
    // ────────────────────────────────────────────────────────────────────────────
    const friendsFromAddressee = (asAddressee ?? [])
      .map((row: any) => {
        const profileData = Array.isArray(row.requester) ? row.requester[0] : row.requester;
        return profileData ? normalizeProfile(profileData) : null;
      })
      .filter((profile): profile is Profile => profile !== null);

    const friendsFromRequester = (asRequester ?? [])
      .map((row: any) => {
        const profileData = Array.isArray(row.addressee) ? row.addressee[0] : row.addressee;
        return profileData ? normalizeProfile(profileData) : null;
      })
      .filter((profile): profile is Profile => profile !== null);

    // Merge and deduplicate by profile ID
    const allFriends = [...friendsFromAddressee, ...friendsFromRequester];
    const uniqueFriends = Array.from(
      new Map(allFriends.map((profile) => [profile.id, profile])).values()
    );

    console.info(`[friends] Returning ${uniqueFriends.length} friends for user ${user.id}`);

    return jsonResponse(request, uniqueFriends);
  } catch (error) {
    console.error('[friends] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load friends.',
      500
    );
  }
}