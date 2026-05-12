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

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  requester: Partial<Profile> & Pick<Profile, 'id'> | null;
  addressee: Partial<Profile> & Pick<Profile, 'id'> | null;
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

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        addressee_id,
        requester:profiles!friendships_requester_id_fkey(*),
        addressee:profiles!friendships_addressee_id_fkey(*)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      console.error(`[friends] Accepted friends query error for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    const friends = ((data ?? []) as FriendshipRow[])
      .map((row) => {
        const profile = row.requester_id === userId ? row.addressee : row.requester;

        if (!profile) {
          return null;
        }

        return normalizeProfile(profile);
      })
      .filter((profile): profile is Profile => profile !== null);

    const uniqueFriends = Array.from(new Map(friends.map((profile) => [profile.id, profile])).values());

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