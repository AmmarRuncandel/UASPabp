import { NextRequest } from 'next/server';

import {
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
  normalizeProfile,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';
import type { Profile } from '@/utils/supabase/types';

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

async function authenticateFriendRequest(request: NextRequest) {
  const userId = extractUserContextFromHeader(request);
  const token = getBearerToken(request);

  if (!userId || !token) {
    return { response: errorResponse(request, 'Unauthorized: Missing user context', 401) };
  }

  const supabase = createAuthedSupabaseClient(token);
  const { data: authUser, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser.user?.id) {
    console.error('[friends] Token verification failed:', authError);
    return { response: errorResponse(request, 'Invalid or expired bearer token.', 401) };
  }

  if (authUser.user.id !== userId) {
    console.warn(`[friends] User context mismatch. header=${userId}, token=${authUser.user.id}`);
    return { response: errorResponse(request, 'Unauthorized: Invalid user context', 401) };
  }

  return { userId, supabase };
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateFriendRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const { userId, supabase } = auth;

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 1: Query friendships where user is the ADDRESSEE
    // ────────────────────────────────────────────────────────────────────────────
    const { data: asAddressee, error: addresseeError } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        requester:profiles!friendships_requester_id_fkey(*)
      `)
      .eq('status', 'accepted')
      .eq('addressee_id', userId);

    if (addresseeError) {
      console.error(`[friends] Query error (as addressee) for user ${userId}:`, addresseeError);
      return errorResponse(request, addresseeError.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2: Query friendships where user is the REQUESTER
    // ────────────────────────────────────────────────────────────────────────────
    const { data: asRequester, error: requesterError } = await supabase
      .from('friendships')
      .select(`
        addressee_id,
        addressee:profiles!friendships_addressee_id_fkey(*)
      `)
      .eq('status', 'accepted')
      .eq('requester_id', userId);

    if (requesterError) {
      console.error(`[friends] Query error (as requester) for user ${userId}:`, requesterError);
      return errorResponse(request, requesterError.message, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 3: Normalize and merge results from both queries
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

    console.info(`[friends] Returning ${uniqueFriends.length} friends for user ${userId}`);

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