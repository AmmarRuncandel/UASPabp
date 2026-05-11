import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

type SendMessageBody = {
  message?: string;
  image_url?: string | null;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const body = (await request.json()) as SendMessageBody;
    const messageText = (body.message ?? '').trim();
    const imageUrl = body.image_url ?? null;

    if (!messageText) {
      return errorResponse(request, 'Message text is required.', 400);
    }

    const { data: inserted, error } = await auth.supabase
      .from('messages')
      .insert({ sender_id: auth.user.id, content: messageText, image_url: imageUrl })
      .select('*')
      .single();

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, inserted, 201);
  } catch (err) {
    return errorResponse(
      request,
      err instanceof Error ? err.message : 'Unable to send message.',
      500
    );
  }
}
