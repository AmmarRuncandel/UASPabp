import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

type SendMessageBody = {
  receiver_id?: string;
  content?: string;
  message?: string;
  image_url?: string | null;
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
    const body = (await request.json()) as SendMessageBody;
    const receiverId = (body.receiver_id ?? '').trim();
    const messageText = (body.content ?? body.message ?? '').trim();
    const imageUrl = body.image_url ?? null;

    if (!receiverId) {
      return errorResponse(request, 'receiver_id is required.', 400);
    }

    if (!messageText) {
      return errorResponse(request, 'Message content is required.', 400);
    }

    if (messageText.length > 5000) {
      return errorResponse(request, 'Message exceeds the maximum length of 5000 characters.', 400);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Insert message into database
    // ────────────────────────────────────────────────────────────────────────
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, receiver_id: receiverId, content: messageText, image_url: imageUrl })
      .select('*')
      .single();

    if (error) {
      console.error(`[chat/send] Insert error for user ${user.id}:`, error);
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, inserted, 201);
  } catch (err) {
    console.error('[chat/send] Unexpected error:', err);
    return errorResponse(
      request,
      err instanceof Error ? err.message : 'Unable to send message.',
      500
    );
  }
}
