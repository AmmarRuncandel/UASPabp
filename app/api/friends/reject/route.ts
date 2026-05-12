import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

type RejectFriendBody = {
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
    const body = (await request.json()) as RejectFriendBody;
    const requesterId = (body.requester_id ?? '').trim();

    if (!requesterId) {
      return errorResponse(request, 'requester_id is required.', 400);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Delete the friend request
    // ────────────────────────────────────────────────────────────────────────
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', requesterId)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error(
        `[friends/reject] Delete error for user ${user.id} and requester ${requesterId}:`,
        error
      );
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, { success: true });
  } catch (error) {
    console.error('[friends/reject] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to reject friend request.',
      500
    );
  }
}
