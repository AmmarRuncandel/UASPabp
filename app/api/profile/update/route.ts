import { NextRequest } from 'next/server';

import {
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  normalizeProfile,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

type UpdateProfileBody = {
  username?: string | null;
  display_name?: string | null;
  avatar_initials?: string | null;
  is_ghost_mode?: boolean;
  is_public?: boolean;
  notify_global?: boolean;
  notify_requests?: boolean;
  notify_messages?: boolean;
  notify_sound?: boolean;
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

async function authenticateProfileRequest(request: NextRequest) {
  const userId = extractUserContextFromHeader(request);
  const token = getBearerToken(request);

  if (!userId || !token) {
    return { response: errorResponse(request, 'Unauthorized: Missing user context', 401) };
  }

  const supabase = createAuthedSupabaseClient(token);
  const { data: authUser, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser.user?.id) {
    console.error('[profile/update] Token verification failed:', authError);
    return { response: errorResponse(request, 'Invalid or expired bearer token.', 401) };
  }

  if (authUser.user.id !== userId) {
    console.warn(`[profile/update] User context mismatch. header=${userId}, token=${authUser.user.id}`);
    return { response: errorResponse(request, 'Unauthorized: Invalid user context', 401) };
  }

  return { userId, supabase };
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateProfileRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const { userId, supabase } = auth;
    const body = (await request.json()) as UpdateProfileBody;

    // Build update payload with only provided fields
    const updatePayload: Partial<UpdateProfileBody> = {};

    if (body.username !== undefined) {
      updatePayload.username = body.username.trim() || null;
    }
    if (body.display_name !== undefined) {
      updatePayload.display_name = body.display_name.trim() || null;
    }
    if (body.avatar_initials !== undefined) {
      updatePayload.avatar_initials = body.avatar_initials.trim() || null;
    }
    if (body.is_ghost_mode !== undefined) {
      updatePayload.is_ghost_mode = Boolean(body.is_ghost_mode);
    }
    if (body.is_public !== undefined) {
      updatePayload.is_public = Boolean(body.is_public);
    }
    if (body.notify_global !== undefined) {
      updatePayload.notify_global = Boolean(body.notify_global);
    }
    if (body.notify_requests !== undefined) {
      updatePayload.notify_requests = Boolean(body.notify_requests);
    }
    if (body.notify_messages !== undefined) {
      updatePayload.notify_messages = Boolean(body.notify_messages);
    }
    if (body.notify_sound !== undefined) {
      updatePayload.notify_sound = Boolean(body.notify_sound);
    }

    if (Object.keys(updatePayload).length === 0) {
      return errorResponse(request, 'No valid fields to update.', 400);
    }

    // Update profile in database
    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      console.error(`[profile/update] Update error for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    const profile = normalizeProfile(data);

    console.info(`[profile/update] Profile updated for user ${userId}`);

    return jsonResponse(request, { profile });
  } catch (error) {
    console.error('[profile/update] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to update profile.',
      500
    );
  }
}
