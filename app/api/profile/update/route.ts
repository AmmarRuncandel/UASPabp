import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  jsonResponse,
  normalizeProfile,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

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

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function PATCH(request: NextRequest) {
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
    // STEP 2: Build update payload with only provided fields
    // ────────────────────────────────────────────────────────────────────────
    const body = (await request.json()) as UpdateProfileBody;
    const updatePayload: Partial<UpdateProfileBody> = {};

    if (body.username !== undefined) {
      updatePayload.username = body.username ? body.username.trim() || null : null;
    }
    if (body.display_name !== undefined) {
      updatePayload.display_name = body.display_name ? body.display_name.trim() || null : null;
    }
    if (body.avatar_initials !== undefined) {
      updatePayload.avatar_initials = body.avatar_initials ? body.avatar_initials.trim() || null : null;
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

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Update profile in database
    // ────────────────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error(`[profile/update] Update error for user ${user.id}:`, error);
      return errorResponse(request, error.message, 500);
    }

    const profile = normalizeProfile(data);

    console.info(`[profile/update] Profile updated for user ${user.id}`);

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
