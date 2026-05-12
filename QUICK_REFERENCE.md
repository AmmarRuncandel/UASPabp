/**
 * QUICK REFERENCE — Phase 2 Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * For developers implementing Phase 2 changes or refactoring endpoints.
 * Keep this file open while working on migration.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. IMPORTS CHEAT SHEET
// ─────────────────────────────────────────────────────────────────────────────

// ✅ NEW IMPORT (Use in protected routes)
import { extractUserContextFromHeader } from '@/app/api/_lib/security';

// ✅ UPDATE (Replace old authenticateMobileRequest import)
import {
  createAnonSupabaseClient,
  errorResponse,
  jsonResponse,
  optionsResponse,
  normalizeProfile,
} from '@/app/api/_lib/mobile-rest';

// ❌ OLD (Don't use anymore for protected routes)
// import { authenticateMobileRequest } from '@/app/api/_lib/mobile-rest';

// ─────────────────────────────────────────────────────────────────────────────
// 2. HANDLER PATTERN QUICK TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy-paste template for protected endpoints:
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Get user ID from verified header
    const userId = extractUserContextFromHeader(request);
    if (!userId) {
      return errorResponse(request, 'Unauthorized', 401);
    }

    // Step 2: Create Supabase client (no auth context needed)
    const supabase = createAnonSupabaseClient();

    // Step 3: Query database using userId
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(`[endpoint-name] Query error for user ${userId}:`, error);
      return errorResponse(request, error.message, 500);
    }

    // Step 4: Return response
    return jsonResponse(request, data);
  } catch (error) {
    console.error('[endpoint-name] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FIND & REPLACE PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern 1: Auth extraction
 * ┌─ FIND ─────────────────────────────────────────────────────┐
 * │ const auth = await authenticateMobileRequest(request);     │
 * │ if ('response' in auth) {                                  │
 * │   return auth.response;                                    │
 * │ }                                                           │
 * └────────────────────────────────────────────────────────────┘
 *
 * ┌─ REPLACE ──────────────────────────────────────────────────┐
 * │ const userId = extractUserContextFromHeader(request);      │
 * │ if (!userId) {                                             │
 * │   return errorResponse(request, 'Unauthorized', 401);      │
 * │ }                                                           │
 * └────────────────────────────────────────────────────────────┘
 */

/**
 * Pattern 2: Supabase client
 * ┌─ FIND ─────────────────────────────────────────────────────┐
 * │ await auth.supabase                                        │
 * │   .from('table_name')                                      │
 * │   .select('*')                                             │
 * │   .eq('id', auth.user.id)                                 │
 * └────────────────────────────────────────────────────────────┘
 *
 * ┌─ REPLACE ──────────────────────────────────────────────────┐
 * │ const supabase = createAnonSupabaseClient();              │
 * │ await supabase                                             │
 * │   .from('table_name')                                      │
 * │   .select('*')                                             │
 * │   .eq('id', userId)                                       │
 * └────────────────────────────────────────────────────────────┘
 */

/**
 * Pattern 3: User ID reference
 * ┌─ FIND ─────────────────────────────────────────────────────┐
 * │ auth.user.id                                               │
 * │ sender_id: auth.user.id                                    │
 * │ message.sender_id === auth.user.id                         │
 * └────────────────────────────────────────────────────────────┘
 *
 * ┌─ REPLACE ──────────────────────────────────────────────────┐
 * │ userId                                                     │
 * │ sender_id: userId                                          │
 * │ message.sender_id === userId                               │
 * └────────────────────────────────────────────────────────────┘
 */

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUBLIC VS PROTECTED ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUBLIC ROUTES (No auth needed, bypass middleware):
 * ┌────────────────────────────────────────┐
 * │ POST /api/auth/mobile-login            │ ✓ Users log in
 * │ POST /api/auth/mobile-register         │ ✓ Users register
 * │ (no bearer token required)             │
 * └────────────────────────────────────────┘
 *
 * → These endpoints SKIP proxy token verification
 * → They handle their own authentication
 * → Response format: JSON (same as protected)
 *
 * PROTECTED ROUTES (Auth required, go through middleware):
 * ┌────────────────────────────────────────┐
 * │ GET /api/auth/mobile-session           │ ✓ Validate session
 * │ GET /api/chat/history                  │ ✓ Fetch messages
 * │ POST /api/chat/send                    │ ✓ Send message
 * │ GET /api/map/visible                   │ ✓ Fetch nearby users
 * │ (bearer token required)                │
 * └────────────────────────────────────────┘
 *
 * → These endpoints REQUIRE Bearer token in Authorization header
 * → Proxy verifies token & injects x-user-id
 * → Handler reads x-user-id (no JWT decode needed)
 * → Response format: JSON
 */

// ─────────────────────────────────────────────────────────────────────────────
// 5. SECURITY CHECKLIST FOR EACH ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Before deploying a refactored endpoint:
 *
 * ☐ Code Review
 *   ☐ Uses extractUserContextFromHeader() for auth
 *   ☐ No authenticateMobileRequest() calls
 *   ☐ No jwt.decode or token parsing in handler
 *   ☐ Error messages don't leak sensitive data
 *
 * ☐ Input Validation
 *   ☐ Request body is validated before use
 *   ☐ Query parameters have bounds/format checks
 *   ☐ Max length limits for strings
 *
 * ☐ Database Safety
 *   ☐ Queries use parameterized inputs (Supabase RLS)
 *   ☐ No dynamic SQL concatenation
 *   ☐ Owner checks (e.g., sender_id == userId)
 *
 * ☐ Response Security
 *   ☐ Sensitive fields not exposed
 *   ☐ CORS headers properly set
 *   ☐ Cache-Control appropriate for data type
 *
 * ☐ Error Handling
 *   ☐ All errors caught with try-catch
 *   ☐ Errors logged with user context
 *   ☐ User receives generic error (not stack trace)
 *
 * ☐ Testing
 *   ☐ Valid token → success response
 *   ☐ Missing token → 401
 *   ☐ Invalid token → 401
 *   ☐ Spoofed x-user-id → ignored (spoofing prevented)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 6. RESPONSE FORMAT REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✅ SUCCESS RESPONSE (200)
 * ─────────────────────────────────────────────────────────────────────
 * Status: 200
 * Headers: CORS headers set by buildCorsHeaders()
 * Body: { ...data }
 * Example:
 *   GET /api/chat/history
 *   → { id: "...", sender_id: "...", content: "...", ... }
 */

/**
 * ✅ CREATED RESPONSE (201)
 * ─────────────────────────────────────────────────────────────────────
 * Status: 201
 * Headers: CORS headers set by buildCorsHeaders()
 * Body: { ...created_data }
 * Example:
 *   POST /api/chat/send
 *   → { id: "...", sender_id: "...", content: "...", created_at: "..." }
 */

/**
 * ❌ UNAUTHORIZED RESPONSE (401)
 * ─────────────────────────────────────────────────────────────────────
 * Status: 401
 * Headers:
 *   Content-Type: application/json
 *   Cache-Control: no-store, no-cache, must-revalidate
 * Body: { error: "...", status: 401 }
 * Example from proxy.ts:
 *   Missing token:
 *   → { error: "Missing bearer token", status: 401 }
 *
 *   Invalid token:
 *   → { error: "Invalid or expired bearer token", status: 401 }
 *
 * Note: This is ALWAYS from proxy.ts for protected routes.
 *       If x-user-id is missing in handler, return:
 *       → errorResponse(request, 'Unauthorized', 401)
 */

/**
 * ❌ BAD REQUEST RESPONSE (400)
 * ─────────────────────────────────────────────────────────────────────
 * Status: 400
 * Headers: CORS headers set by buildCorsHeaders()
 * Body: { error: "..." }
 * Example:
 *   POST /api/chat/send { "message": "" }
 *   → { error: "Message cannot be empty" }
 */

/**
 * ❌ SERVER ERROR RESPONSE (500)
 * ─────────────────────────────────────────────────────────────────────
 * Status: 500
 * Headers: CORS headers set by buildCorsHeaders()
 * Body: { error: "..." }
 * Example:
 *   Database connection error:
 *   → { error: "Internal server error" }
 *
 * IMPORTANT: Never return stack trace!
 *   ❌ { error: error.stack }
 *   ✓ { error: "Internal server error" }
 */

// ─────────────────────────────────────────────────────────────────────────────
// 7. COMMON MISTAKES TO AVOID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ❌ MISTAKE 1: Still using authenticateMobileRequest()
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   const auth = await authenticateMobileRequest(...) │
 * │   const supabase = auth.supabase;                   │
 * │                                                      │
 * │ DO:                                                  │
 * │   const userId = extractUserContextFromHeader(...) │
 * │   const supabase = createAnonSupabaseClient();      │
 * └──────────────────────────────────────────────────────┘
 */

/**
 * ❌ MISTAKE 2: Trying to decode JWT in handler
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   const token = extractBearerToken(request);        │
 * │   const decoded = jwt.decode(token);                │
 * │   const userId = decoded.sub;                       │
 * │                                                      │
 * │ DO:                                                  │
 * │   const userId = extractUserContextFromHeader(...) │
 * └──────────────────────────────────────────────────────┘
 *
 * REASON: Proxy already verified the token!
 */

/**
 * ❌ MISTAKE 3: Not checking if userId is null
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   const userId = extractUserContextFromHeader(...) │
 * │   const { data } = await supabase.from(...).eq(...) │
 * │                      // userId might be null!       │
 * │                                                      │
 * │ DO:                                                  │
 * │   const userId = extractUserContextFromHeader(...) │
 * │   if (!userId) {                                     │
 * │     return errorResponse(request, '...', 401);     │
 * │   }                                                  │
 * │   const { data } = await supabase.from(...).eq(...) │
 * └──────────────────────────────────────────────────────┘
 *
 * REASON: Header might be missing or handler called externally
 */

/**
 * ❌ MISTAKE 4: Returning HTML on error
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   return new NextResponse('<html>Error</html>', {    │
 * │     status: 401,                                     │
 * │   });                                                │
 * │                                                      │
 * │ DO:                                                  │
 * │   return errorResponse(request, 'Unauthorized', 401) │
 * │   // Automatically returns JSON via buildCorsHeaders │
 * └──────────────────────────────────────────────────────┘
 *
 * REASON: Flutter expects JSON, not HTML
 */

/**
 * ❌ MISTAKE 5: Including auth.user object in response
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   return jsonResponse(request, {                     │
 * │     access_token: auth.token,  // ← Expose token!   │
 * │     user: auth.user,           // ← Expose user obj │
 * │     profile,                                         │
 * │   });                                                │
 * │                                                      │
 * │ DO (in mobile-session):                              │
 * │   return jsonResponse(request, {                     │
 * │     user_id: userId,                                │
 * │     profile,                                         │
 * │     session_valid: true,                             │
 * │   });                                                │
 * └──────────────────────────────────────────────────────┘
 *
 * REASON: Don't expose sensitive fields
 */

/**
 * ❌ MISTAKE 6: Not logging errors for debugging
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   if (error) {                                       │
 * │     return errorResponse(request, error.message); │
 * │   }                                                  │
 * │                                                      │
 * │ DO:                                                  │
 * │   if (error) {                                       │
 * │     console.error(                                   │
 * │       `[endpoint-name] Error for user ${userId}:`, │
 * │       error                                          │
 * │     );                                               │
 * │     return errorResponse(request, error.message); │
 * │   }                                                  │
 * └──────────────────────────────────────────────────────┘
 *
 * REASON: Audit trail + debugging
 */

/**
 * ❌ MISTAKE 7: Forgetting to validate input
 * ┌──────────────────────────────────────────────────────┐
 * │ DON'T:                                               │
 * │   const body = await request.json();                │
 * │   const { message } = body;                          │
 * │   await supabase.from('messages').insert({...})    │
 * │   // What if message is too long? Empty? Null?       │
 * │                                                      │
 * │ DO:                                                  │
 * │   const body = await request.json() as SendMsgBody │
 * │   const message = (body.message ?? '').trim();      │
 * │   if (!message) {                                    │
 * │     return errorResponse(request, '...', 400);     │
 * │   }                                                  │
 * │   if (message.length > 5000) {                       │
 * │     return errorResponse(request, '...', 400);     │
 * │   }                                                  │
 * └──────────────────────────────────────────────────────┘
 */

// ─────────────────────────────────────────────────────────────────────────────
// 8. DOCUMENTATION LINKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Need more info? Check:
 *
 * • Architecture overview
 *   → IMPLEMENTATION_PHASE_2.md
 *
 * • Detailed refactoring examples (BEFORE/AFTER)
 *   → REFACTORING_EXAMPLES.md
 *
 * • Full status & deployment checklist
 *   → PHASE_2_STATUS.md
 *
 * • New security utilities API
 *   → app/api/_lib/security.ts (inline comments)
 *
 * • Refactored endpoint reference
 *   → app/api/auth/mobile-session/route.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// 9. QUICK TEST COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test valid token (should return 200):
 * ─────────────────────────────────────────────────────────────────────
 * curl -X GET http://localhost:3000/api/auth/mobile-session \
 *   -H "Authorization: Bearer YOUR_VALID_JWT_TOKEN" \
 *   -H "Content-Type: application/json"
 *
 * Expected: 200 { user_id: "...", profile: {...}, session_valid: true }
 */

/**
 * Test missing token (should return 401):
 * ─────────────────────────────────────────────────────────────────────
 * curl -X GET http://localhost:3000/api/auth/mobile-session \
 *   -H "Content-Type: application/json"
 *
 * Expected: 401 { error: "Missing bearer token", status: 401 }
 * Note: Should come from proxy.ts (fast)
 */

/**
 * Test invalid token (should return 401):
 * ─────────────────────────────────────────────────────────────────────
 * curl -X GET http://localhost:3000/api/auth/mobile-session \
 *   -H "Authorization: Bearer invalid_token_xyz" \
 *   -H "Content-Type: application/json"
 *
 * Expected: 401 { error: "Invalid or expired bearer token", status: 401 }
 */

/**
 * Test spoofed header attack (should fail):
 * ─────────────────────────────────────────────────────────────────────
 * curl -X GET http://localhost:3000/api/auth/mobile-session \
 *   -H "Authorization: Bearer USER_A_TOKEN" \
 *   -H "X-User-Id: some-other-user-uuid" \
 *   -H "Content-Type: application/json"
 *
 * Expected: 200 with USER_A's profile (spoofed header ignored)
 * Note: x-user-id header from client is removed by proxy
 *       Only proxy-injected x-user-id is trusted
 */

/**
 * Test public route (login):
 * ─────────────────────────────────────────────────────────────────────
 * curl -X POST http://localhost:3000/api/auth/mobile-login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"test@example.com","password":"password123"}'
 *
 * Expected: 200 { access_token: "...", user: {...}, profile: {...} }
 * Note: Works without Bearer token (public route)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 10. PERFORMANCE TIPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✓ Reuse Supabase client across queries
 * ┌──────────────────────────────────────────────────────┐
 * │ const supabase = createAnonSupabaseClient();         │
 * │ const { data: messages } = await supabase.from(...) │
 * │ const { data: profiles } = await supabase.from(...) │
 * │ // Same client, multiple queries                    │
 * └──────────────────────────────────────────────────────┘
 *
 * ✓ Batch fetch related data
 * ┌──────────────────────────────────────────────────────┐
 * │ const senderIds = [...new Set(messages.map(m => ... │
 * │ const { data: profiles } = await supabase          │
 * │   .from('profiles')                                │
 * │   .select('*')                                     │
 * │   .in('id', senderIds);  // Fetch all at once      │
 * │ // NOT loop: for each sender, fetch profile        │
 * └──────────────────────────────────────────────────────┘
 *
 * ✓ Use Supabase RLS for access control (not app logic)
 * ┌──────────────────────────────────────────────────────┐
 * │ // RLS policy checks auth.uid() == user_id         │
 * │ // So you don't need to check in app                │
 * │ const { data } = await supabase                    │
 * │   .from('messages')                                │
 * │   .select('*')                                     │
 * │   .eq('user_id', userId)                           │
 * │   // RLS prevents other users' messages             │
 * └──────────────────────────────────────────────────────┘
 */
