import { NextRequest } from 'next/server';
import { createAnonSupabaseClient, buildFallbackProfile, errorResponse, jsonResponse, normalizeProfile, optionsResponse } from '@/app/api/_lib/mobile-rest';

type MobileLoginBody = {
  email?: string;
  password?: string;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MobileLoginBody;
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return errorResponse(request, 'Email and password are required.', 400);
    }

    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return errorResponse(request, error?.message ?? 'Invalid login credentials.', 401);
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      return errorResponse(request, profileError.message, 500);
    }

    const profile = profileRow ? normalizeProfile(profileRow) : buildFallbackProfile(data.user);

    return jsonResponse(request, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.user,
      profile,
    });
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to authenticate mobile session.',
      500
    );
  }
}
