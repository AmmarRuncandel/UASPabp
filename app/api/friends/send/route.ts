import { NextRequest } from 'next/server';

import {
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

type SendFriendRequestBody = {
  addressee_id?: string;
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
    console.error('[friends/send] Token verification failed:', authError);
    return { response: errorResponse(request, 'Invalid or expired bearer token.', 401) };
  }

  if (authUser.user.id !== userId) {
    console.warn(`[friends/send] User context mismatch. header=${userId}, token=${authUser.user.id}`);
    return { response: errorResponse(request, 'Unauthorized: Invalid user context', 401) };
  }

  return { userId, supabase };
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateFriendRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const { userId, supabase } = auth;
    const body = (await request.json()) as SendFriendRequestBody;
    const addresseeId = (body.addressee_id ?? '').trim();

    if (!addresseeId) {
      return errorResponse(request, 'addressee_id is required.', 400);
    }

    if (addresseeId === userId) {
      return errorResponse(request, 'Cannot send friend request to yourself.', 400);
    }

    // Check if friendship already exists
    const { data: existingFriendship, error: checkError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`)
      .maybeSingle();

    if (checkError) {
      console.error(`[friends/send] Check existing friendship error:`, checkError);
      return errorResponse(request, checkError.message, 500);
    }

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return errorResponse(request, 'Already friends with this user.', 400);
      }
      return errorResponse(request, 'Friend request already sent.', 400);
    }

    // Create new friend request
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: userId,
        addressee_id: addresseeId,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      console.error(`[friends/send] Insert friendship error:`, error);
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, { success: true, friendship: data }, 201);
  } catch (error) {
    console.error('[friends/send] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to send friend request.',
      500
    );
  }
}
