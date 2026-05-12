import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  isPublicRoute,
  extractBearerToken,
  verifyTokenAndGetUserId,
  sanitizeRequestHeaders,
  injectUserContextHeader,
} from '@/app/api/_lib/security';

/**
 * Zmayy Dual-Mode Auth Proxy (Next.js 16 — proxy.ts replaces middleware.ts)
 * ──────────────────────────────────────────────────────────────────────────
 * Dual-Mode Responsibilities:
 *
 * MODE 1: WEB/BROWSER (UI Routes)
 *  1. Refresh the Supabase JWT on every server-side request
 *  2. Guard the root dashboard ("/") — unauthenticated users redirected to "/login"
 *  3. Redirect authenticated users away from "/login" → "/"
 *  4. Maintain cookie-based session for browser clients
 *
 * MODE 2: MOBILE/API (REST API Routes)
 *  1. Verify Bearer token from Authorization header for protected routes
 *  2. Extract user ID from JWT and inject into x-user-id header
 *  3. Sanitize client-provided headers to prevent spoofing attacks
 *  4. Return JSON 401 (never HTML redirect) for invalid/missing tokens
 *  5. Set Cache-Control: no-store for auth failures
 *
 * Route Classification:
 *  - PUBLIC_ROUTES: /api/auth/mobile-login, /api/auth/mobile-register, /api/health
 *  - PROTECTED_ROUTES: /api/chat/**, /api/map/**, /api/profile/**
 *  - UI_ROUTES: /, /login, /u/** (redirects handled, not API)
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 2: MOBILE/API ROUTE VERIFICATION (Bearer Token)
  // ════════════════════════════════════════════════════════════════════════════
  if (pathname.startsWith('/api')) {
    // Public routes bypass token verification
    if (isPublicRoute(pathname)) {
      return NextResponse.next({ request });
    }

    // Protected API routes require valid Bearer token
    const token = extractBearerToken(request);

    if (!token) {
      return apiUnauthorized(request, 'Missing bearer token');
    }

    // Verify token and extract user ID
    const userId = await verifyTokenAndGetUserId(token);

    if (!userId) {
      return apiUnauthorized(request, 'Invalid or expired bearer token');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HEADER SPOOFING PREVENTION: Sanitize client-provided headers
    // ──────────────────────────────────────────────────────────────────────────
    let requestHeaders = sanitizeRequestHeaders(request);
    requestHeaders = injectUserContextHeader(requestHeaders, userId);

    // Forward request with verified user context
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 1: WEB/BROWSER UI ROUTE HANDLING (Cookie-based Session)
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

/**
 * Return API error response (401 Unauthorized) in JSON format
 * with Cache-Control: no-store to prevent caching of sensitive failures
 */
function apiUnauthorized(request: NextRequest, message: string): NextResponse {
  return NextResponse.json(
    { error: message, status: 401 },
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - api           (API routes)
     *  - _next/static  (Next.js static assets)
     *  - _next/image   (image optimisation API)
     *  - favicon.ico / sitemap.xml / robots.txt
     *  - any path with a file extension (e.g. .png, .svg, .woff2)
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
