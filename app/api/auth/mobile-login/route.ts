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

type MobileLoginBody = {
  email?: string;
  password?: string;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    // Defensive environment validation at handler entry to avoid hangs
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return jsonResponse(request, { error: 'Env missing' }, 500);
    }

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

    const fallbackProfile = buildFallbackProfile(data.user);
    let profile = profileRow ? normalizeProfile(profileRow) : fallbackProfile;

    if (!profileRow) {
      const authedSupabase = createAuthedSupabaseClient(data.session.access_token);
      const { data: createdProfile, error: createError } = await authedSupabase
        .from('profiles')
        .upsert(fallbackProfile, { onConflict: 'id' })
        .select('*')
        .single();

      if (!createError && createdProfile) {
        profile = normalizeProfile(createdProfile);
      }
    }

    return jsonResponse(request, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.user,
      profile,
    });
  } catch (error) {
    return errorResponse(request, error instanceof Error ? error.message : 'Unable to authenticate mobile session.', 500);
  }
}
