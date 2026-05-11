import { NextRequest } from 'next/server';

import {
  buildFallbackProfile,
  createAnonSupabaseClient,
  createAuthedSupabaseClient,
  errorResponse,
  jsonResponse,
  normalizeProfile,
  optionsResponse,
} from '@/app/api/_lib/mobile-rest';

type MobileRegisterBody = {
  email?: string;
  password?: string;
  username?: string;
};

function deriveAvatarInitials(name: string | null | undefined): string | null {
  const cleaned = (name ?? '').trim();
  if (!cleaned) {
    return null;
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MobileRegisterBody;
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';
    const username = body.username?.trim() || email.split('@')[0] || '';

    if (!email || !password) {
      return errorResponse(request, 'Email and password are required.', 400);
    }

    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error || !data.user) {
      return errorResponse(request, error?.message ?? 'Unable to create account.', 400);
    }

    const fallbackProfile = normalizeProfile({
      ...buildFallbackProfile(data.user),
      username,
      display_name: username,
      avatar_initials: deriveAvatarInitials(username),
    });

    if (!data.session?.access_token) {
      return jsonResponse(
        request,
        {
          user: data.user,
          profile: fallbackProfile,
          requires_confirmation: true,
          message: 'Account created. Please confirm your email before logging in.',
        },
        201
      );
    }

    const authedSupabase = createAuthedSupabaseClient(data.session.access_token);
    const { data: profileRow, error: profileError } = await authedSupabase
      .from('profiles')
      .upsert(
        {
          ...fallbackProfile,
          id: data.user.id,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (profileError) {
      return errorResponse(request, profileError.message, 500);
    }

    const profile = profileRow ? normalizeProfile(profileRow) : fallbackProfile;

    return jsonResponse(
      request,
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
        profile,
      },
      201
    );
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to register mobile session.',
      500
    );
  }
}