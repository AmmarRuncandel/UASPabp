import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * createClient — Supabase server client
 * ─────────────────────────────────────────────────────
 * Use inside:
 *  • Server Components (read-only — setting cookies is forbidden there)
 *  • Server Actions       (read + write cookies ✓)
 *  • Route Handlers       (read + write cookies ✓)
 *
 * NOTE: `cookies()` is async in Next.js 15+ App Router.
 *        We must await it before passing to createServerClient.
 */
export async function createClient() {
  // cookies() is async in Next.js 16 App Router.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // `set` is only allowed in Server Actions & Route Handlers.
          // In Server Components this will throw — that's expected behaviour.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Swallow the error when called from a Server Component where
            // setting cookies is forbidden. Session refresh will be handled
            // by middleware.ts instead.
          }
        },
      },
    }
  );
}
