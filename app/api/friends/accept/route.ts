import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

type AcceptFriendBody = {
  requester_id?: string;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
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
    // STEP 2: Validate request body
    // ────────────────────────────────────────────────────────────────────────
    const body = (await request.json()) as AcceptFriendBody;
    const requesterId = (body.requester_id ?? '').trim();

    if (!requesterId) {
      return errorResponse(request, 'requester_id is required.', 400);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Update friendship status to accepted
    // ────────────────────────────────────────────────────────────────────────
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId)
      .eq('addressee_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error(
        `[friends/accept] Accept update error for user ${user.id} and requester ${requesterId}:`,
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