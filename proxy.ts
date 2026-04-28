import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Zmayy Auth Proxy  (Next.js 16 — proxy.ts replaces middleware.ts)
 * ─────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Refresh the Supabase JWT on every server-side request so that
 *     the session cookie stays fresh without a page reload.
 *  2. Guard the root dashboard ("/") — unauthenticated users are
 *     redirected to "/login".
 *  3. Redirect already-authenticated users away from "/login" → "/".
 *
 * Cookie strategy:
 *  - Read cookies from `request.cookies` (NextRequest)
 *  - Write refreshed cookies to both request (for the current handler)
 *    and the response (Set-Cookie header for the browser).
 *  - This is the standard pattern for @supabase/ssr in Edge/Proxy context.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // ── 1. Build a pass-through response we can attach cookies to ──
  let response = NextResponse.next({ request });

  // ── 2. Create Supabase client wired to request/response cookies ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to request so the current route handler sees them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate response to carry the mutated request cookies.
          response = NextResponse.next({ request });
          // Write to response so the browser receives Set-Cookie headers.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 3. Refresh the session (also validates the JWT) ──────────────
  // IMPORTANT: call getUser() — not getSession() — so the JWT is
  // verified server-side, not just decoded from the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage  = pathname.startsWith('/login');

  // ── 4. Routing guards ────────────────────────────────────────────
  // Unauthenticated user → /login
  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user already on /login → home
  if (user && isLoginPage) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (Next.js static assets)
     *  - _next/image   (image optimisation API)
     *  - favicon.ico / sitemap.xml / robots.txt
     *  - any path with a file extension (e.g. .png, .svg, .woff2)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
