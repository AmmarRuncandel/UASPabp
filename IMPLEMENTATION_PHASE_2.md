/**
 * PHASE 2 IMPLEMENTATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Dual-Mode Security Architecture for Next.js 16 REST API
 *
 * Files Updated:
 *  1. proxy.ts — Dual-mode middleware with token verification + header injection
 *  2. app/api/_lib/security.ts — New security utilities (token verification, sanitization)
 *  3. app/api/_lib/mobile-rest.ts — Enhanced CORS headers with credential support
 *  4. app/api/auth/mobile-session/route.ts — Refactored to use header-based user context
 *
 * Architecture Overview:
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *  CLIENT (Flutter Mobile)
 *        │
 *        │ Authorization: Bearer <JWT_TOKEN>
 *        │
 *        ▼
 *  ┌──────────────────────────────────────────┐
 *  │  proxy.ts (Middleware)                   │
 *  │  ┌────────────────────────────────────┐  │
 *  │  │ Route Classification               │  │
 *  │  │ - /api/auth/** → PUBLIC BYPASS    │  │
 *  │  │ - /api/** → TOKEN VERIFICATION   │  │
 *  │  └────────────────────────────────────┘  │
 *  │                                          │
 *  │  If PUBLIC_ROUTE: Pass through (✓)       │
 *  │                                          │
 *  │  If PROTECTED_ROUTE:                     │
 *  │    1. Extract Bearer token               │
 *  │    2. Verify JWT with Supabase           │
 *  │    3. Extract user ID from token         │
 *  │    4. Sanitize request headers           │
 *  │    5. Inject x-user-id header            │
 *  │    6. Forward to route handler           │
 *  │                                          │
 *  │  If NO TOKEN or INVALID:                 │
 *  │    → Return JSON 401 (never redirect)    │
 *  │    → Set Cache-Control: no-store         │
 *  └──────────────────────────────────────────┘
 *        │
 *        │ Request headers now include:
 *        │ - x-user-id: "user-uuid-123"
 *        │ - authorization: "Bearer ..."
 *        │ (x-user-* spoofed headers removed)
 *        │
 *        ▼
 *  ┌──────────────────────────────────────────┐
 *  │  Route Handler (e.g., /api/chat/send)    │
 *  │  ┌────────────────────────────────────┐  │
 *  │  │ extractUserContextFromHeader()      │  │
 *  │  │ → Get userId from x-user-id        │  │
 *  │  │ → No JWT decoding needed           │  │
 *  │  │ → Use userId for database query    │  │
 *  │  └────────────────────────────────────┘  │
 *  └──────────────────────────────────────────┘
 *        │
 *        │ Response
 *        │
 *        ▼
 *  CLIENT (with CORS-safe headers)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SECURITY PROPERTIES:
 *  ✓ Header Spoofing Prevention: Client cannot inject x-user-* headers
 *  ✓ No JWT Decoding in Handlers: Proxy validates once, handlers trust header
 *  ✓ Dual-Mode Responses: JSON for API, redirects for UI
 *  ✓ CORS Safe: Credential support without wildcard fallback
 *  ✓ Cache-Control: Auth failures not cached
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATTERN 1: Public Route Handler (No Auth Required)
 * Example: POST /api/auth/mobile-login
 *
 * This route does NOT get x-user-id injected (because it's public).
 * It continues to use authenticateMobileRequest() for backward compatibility.
 */

/*
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    
    // Continue with existing logic — this endpoint needs token from login response
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({...});
    
    if (error) {
      return errorResponse(request, error.message, 401);
    }
    
    return jsonResponse(request, { access_token: data.session.access_token, ... });
  } catch (error) {
    return errorResponse(request, error.message, 500);
  }
}
*/

/**
 * PATTERN 2: Protected Route Handler (Auth via x-user-id Header)
 * Example: GET /api/chat/history
 *
 * This route IS protected. proxy.ts already verified the token and injected x-user-id.
 * Handler just reads the header — no JWT decoding needed!
 */

/*
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Get user ID from validated header (set by proxy.ts)
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized', 401);
    }

    // STEP 2: Query database using userId
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', userId)
      .gte('created_at', cutoffDate);

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, data);
  } catch (error) {
    return errorResponse(request, error.message, 500);
  }
}
*/

/**
 * PATTERN 3: POST with Request Body Validation
 * Example: POST /api/chat/send
 *
 * Protected route that also validates request body.
 */

/*
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

type SendMessageBody = {
  message?: string;
  image_url?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authenticate via header
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized', 401);
    }

    // STEP 2: Parse and validate body
    const body = await request.json() as SendMessageBody;
    const messageText = (body.message ?? '').trim();
    const imageUrl = body.image_url ?? null;

    // STEP 3: Validate input
    if (!messageText) {
      return errorResponse(request, 'Message cannot be empty', 400);
    }

    if (messageText.length > 5000) {
      return errorResponse(request, 'Message exceeds 5000 characters', 400);
    }

    // STEP 4: Perform action as authenticated user
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        content: messageText,
        image_url: imageUrl,
      })
      .select('*')
      .single();

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    return jsonResponse(request, data, 201);
  } catch (error) {
    return errorResponse(request, error.message, 500);
  }
}
*/

// ─────────────────────────────────────────────────────────────────────────────
// REFACTORING CHECKLIST FOR EXISTING ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * For each protected route handler in /api/**, follow these steps:
 *
 * BEFORE (Old Pattern):
 * ─────────────────────
 * const auth = await authenticateMobileRequest(request);
 * if ('response' in auth) {
 *   return auth.response;  // 401 response
 * }
 * const userId = auth.user.id;
 * const supabase = auth.supabase;
 *
 * AFTER (New Pattern):
 * ────────────────────
 * const userId = extractUserContextFromHeader(request);
 * if (!userId) {
 *   return errorResponse(request, 'Unauthorized', 401);
 * }
 * const supabase = createAnonSupabaseClient();
 *
 * BENEFITS:
 * • No JWT decoding in handler (done once in proxy.ts)
 * • Type-safe header extraction
 * • Consistent error handling
 * • Reduced latency
 */

// ─────────────────────────────────────────────────────────────────────────────
// FILE STRUCTURE AFTER PHASE 2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * app/api/
 * ├── _lib/
 * │   ├── security.ts ...................... [NEW] Security utilities
 * │   │   ├── isPublicRoute()
 * │   │   ├── extractBearerToken()
 * │   │   ├── verifyTokenAndGetUserId()
 * │   │   ├── sanitizeRequestHeaders()
 * │   │   ├── injectUserContextHeader()
 * │   │   └── extractUserContextFromHeader()
 * │   └── mobile-rest.ts .................. [UPDATED] Enhanced CORS
 * │       ├── buildCorsHeaders() .......... [IMPROVED] No wildcard fallback
 * │       ├── createSupabaseClientForUserId() [NEW]
 * │       └── (others unchanged)
 * │
 * ├── auth/
 * │   ├── mobile-login/
 * │   │   └── route.ts .................... [UNCHANGED] Public route
 * │   ├── mobile-register/
 * │   │   └── route.ts .................... [UNCHANGED] Public route
 * │   └── mobile-session/
 * │       └── route.ts .................... [UPDATED] Uses x-user-id header
 * │
 * ├── chat/
 * │   ├── send/
 * │   │   └── route.ts .................... [TODO] Refactor to new pattern
 * │   └── history/
 * │       └── route.ts .................... [TODO] Refactor to new pattern
 * │
 * └── map/
 *     └── visible/
 *         └── route.ts .................... [TODO] Refactor to new pattern
 *
 * Root:
 * └── proxy.ts ............................ [UPDATED] Dual-mode middleware
 */

// ─────────────────────────────────────────────────────────────────────────────
// TESTING SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TEST 1: Valid Bearer Token → Protected Route
 * ─────────────────────────────────────────────
 * Request:
 *   GET /api/chat/history
 *   Authorization: Bearer eyJhbGc...valid_token...
 *
 * Expected Flow:
 *   1. proxy.ts extracts token ✓
 *   2. proxy.ts verifies token with Supabase ✓
 *   3. proxy.ts extracts user ID "user-123" ✓
 *   4. proxy.ts sanitizes headers (removes any x-user-* from client) ✓
 *   5. proxy.ts injects x-user-id: "user-123" ✓
 *   6. Route handler receives valid user context ✓
 *   7. Route handler queries database with userId ✓
 *   8. 200 OK with chat history ✓
 */

/**
 * TEST 2: Missing Bearer Token → Protected Route
 * ───────────────────────────────────────────────
 * Request:
 *   GET /api/chat/history
 *   (no Authorization header)
 *
 * Expected Flow:
 *   1. proxy.ts finds no token ✗
 *   2. proxy.ts returns immediate JSON 401 ✗
 *
 * Response:
 *   Status: 401
 *   Body: { "error": "Missing bearer token", "status": 401 }
 *   Headers: Cache-Control: no-store, no-cache, ...
 */

/**
 * TEST 3: Spoofed Header Attack → Protected Route
 * ────────────────────────────────────────────────
 * Request:
 *   GET /api/chat/history
 *   Authorization: Bearer eyJhbGc...valid_token_for_user_A...
 *   X-User-Id: user-b-uuid ← ATTACKER TRIES TO SPOOF!
 *
 * Expected Flow:
 *   1. proxy.ts verifies token (token says user-A) ✓
 *   2. proxy.ts extracts userId = "user-a-uuid" ✓
 *   3. proxy.ts sanitizes headers (removes client's X-User-Id) ✓
 *   4. proxy.ts injects x-user-id: "user-a-uuid" ✓
 *   5. Route handler gets x-user-id = "user-a-uuid" (spoofed header stripped)
 *   6. User-A's data returned, NOT user-B ✓
 */

/**
 * TEST 4: Public Route with Token → Should Work
 * ──────────────────────────────────────────────
 * Request:
 *   POST /api/auth/mobile-login
 *   Content-Type: application/json
 *   { "email": "test@example.com", "password": "..." }
 *
 * Expected Flow:
 *   1. proxy.ts recognizes /api/auth/mobile-login as PUBLIC ✓
 *   2. proxy.ts bypasses token verification ✓
 *   3. Route handler processes login, returns access_token ✓
 *   4. 200 OK with { access_token, user, profile } ✓
 */

/**
 * TEST 5: CORS Preflight from Flutter
 * ─────────────────────────────────────
 * Request:
 *   OPTIONS /api/chat/send
 *   Origin: https://zmayy-app.example.com (registered Flutter scheme)
 *   Authorization: Bearer <token>
 *
 * Expected Flow:
 *   1. proxy.ts passes OPTIONS to route ✓
 *   2. route.ts calls optionsResponse(request) ✓
 *   3. buildCorsHeaders() checks if authenticated ✓
 *   4. Finds origin in ALLOWED_ORIGINS ✓
 *   5. Returns:
 *      Access-Control-Allow-Origin: https://zmayy-app.example.com
 *      Access-Control-Allow-Credentials: true
 *      Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
 *      Access-Control-Allow-Headers: Authorization, Content-Type
 *      Access-Control-Max-Age: 3600
 *   6. Browser/Flutter allows subsequent POST ✓
 */

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD COMPATIBILITY NOTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✓ ENDPOINTS STILL WORKING:
 *   - POST /api/auth/mobile-login (public, unchanged)
 *   - POST /api/auth/mobile-register (public, unchanged)
 *   - (Others are in transition to new pattern)
 *
 * ⚠ ENDPOINTS IN TRANSITION:
 *   - GET /api/auth/mobile-session (refactored to use x-user-id)
 *   - GET /api/chat/history (TODO: refactor)
 *   - POST /api/chat/send (TODO: refactor)
 *   - GET /api/map/visible (TODO: refactor)
 *
 * FOR TRANSITION: Old authenticateMobileRequest() still available in mobile-rest.ts
 * but should be phased out as endpoints are migrated.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Before deploying to production:
 *
 * ☐ All protected routes refactored to use extractUserContextFromHeader()
 * ☐ Test each endpoint with valid & invalid tokens
 * ☐ Test CORS preflight from Flutter app
 * ☐ Test spoofed header injection attempts (should fail)
 * ☐ Verify Cache-Control headers on 401 responses
 * ☐ Monitor proxy.ts performance (token verification latency)
 * ☐ Add alerting for frequent 401 responses (potential attacks)
 * ☐ Update API documentation with new auth header approach
 * ☐ Notify Flutter team: API now returns JSON 401 (never redirects)
 */
