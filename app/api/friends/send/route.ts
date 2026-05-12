import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

type SendFriendRequestBody = {
  addressee_id?: string;
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
    const body = (await request.json()) as SendFriendRequestBody;
    const addresseeId = (body.addressee_id ?? '').trim();

    if (!addresseeId) {
      return errorResponse(request, 'addressee_id is required.', 400);
    }

    if (addresseeId === user.id) {
      return errorResponse(request, 'Cannot send friend request to yourself.', 400);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Check if friendship already exists
    // ────────────────────────────────────────────────────────────────────────
    const { data: existingFriendship, error: checkError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
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

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: Create new friend request
    // ────────────────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
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
