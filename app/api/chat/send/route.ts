import { NextRequest } from 'next/server';

import {
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

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
    const userId = extractUserContextFromHeader(request);
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!userId || !token) {
      return errorResponse(request, 'Unauthorized: Missing user context', 401);
    }

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

    const supabase = createAuthedSupabaseClient(token);

    const { data: authUser, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser.user?.id) {
      console.error('[chat/send] Token verification failed:', authError);
      return errorResponse(request, 'Invalid or expired bearer token.', 401);
    }

    if (authUser.user.id !== userId) {
      console.warn(`[chat/send] User context mismatch. header=${userId}, token=${authUser.user.id}`);
      return errorResponse(request, 'Unauthorized: Invalid user context', 401);
    }

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({ sender_id: userId, receiver_id: receiverId, content: messageText, image_url: imageUrl })
      .select('*')
      .single();

    if (error) {
      console.error(`[chat/send] Insert error for user ${userId}:`, error);
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
