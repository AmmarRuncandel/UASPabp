import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Zmayy Web Session Proxy (Next.js 16 — proxy.ts)
 * ──────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *
 * WEB/BROWSER MODE (UI Routes Only):
 *  1. Refresh the Supabase JWT on every server-side request
 *  2. Guard the root dashboard ("/") — unauthenticated users redirected to "/login"
 *  3. Redirect authenticated users away from "/login" → "/"
 *  4. Maintain cookie-based session for browser clients
 *
 * MOBILE/API MODE:
 *  - API routes (/api/**) are SKIPPED by this proxy
 *  - Each API route handler manages its own authentication via authenticateMobileRequest()
 *  - This ensures mobile clients with Bearer tokens work independently
 *
 * Route Classification:
 *  - API_ROUTES: /api/** (handled by route handlers, not this proxy)
 *  - UI_ROUTES: /, /login, /u/** (handled by this proxy)
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ════════════════════════════════════════════════════════════════════════════
  // SKIP ALL API ROUTES — Let route handlers manage their own authentication
  // ════════════════════════════════════════════════════════════════════════════
  if (pathname.startsWith('/api')) {
    return NextResponse.next({ request });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // WEB/BROWSER UI ROUTE HANDLING (Cookie-based Session)
  // ════════════════════════════════════════════════════════════════════════════

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

  const isLoginPage = pathname.startsWith('/login');

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
     *  - api           (API routes - handled by route handlers)
     *  - _next/static  (Next.js static assets)
     *  - _next/image   (image optimisation API)
     *  - favicon.ico / sitemap.xml / robots.txt
     *  - any path with a file extension (e.g. .png, .svg, .woff2)
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
