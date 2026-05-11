import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  buildFallbackProfile,
  errorResponse,
  jsonResponse,
  normalizeProfile,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const { data: profileRow, error: profileError } = await auth.supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (profileError) {
      return errorResponse(request, profileError.message, 500);
    }

    let profile = profileRow ? normalizeProfile(profileRow) : buildFallbackProfile(auth.user);

    if (!profileRow) {
      const { data: createdProfile, error: createError } = await auth.supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select('*')
        .single();

      if (!createError && createdProfile) {
        profile = normalizeProfile(createdProfile);
      }
    }

    return jsonResponse(request, {
      access_token: auth.token,
      user: auth.user,
      profile,
    });
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to validate mobile session.',
      500
    );
  }
}