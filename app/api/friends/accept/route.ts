import { NextRequest } from 'next/server';

import {
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

type AcceptFriendBody = {
  requester_id?: string;
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
    console.error('[friends/accept] Token verification failed:', authError);
    return { response: errorResponse(request, 'Invalid or expired bearer token.', 401) };
  }

  if (authUser.user.id !== userId) {
    console.warn(`[friends/accept] User context mismatch. header=${userId}, token=${authUser.user.id}`);
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
    const body = (await request.json()) as AcceptFriendBody;
    const requesterId = (body.requester_id ?? '').trim();

    if (!requesterId) {
      return errorResponse(request, 'requester_id is required.', 400);
    }

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId)
      .eq('addressee_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error(
        `[friends/accept] Accept update error for user ${userId} and requester ${requesterId}:`,
        error
      );
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, { success: true });
  } catch (error) {
    console.error('[friends/accept] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to accept friend request.',
      500
    );
  }
}