/**
 * Security Utilities — Token Verification, User Context Extraction, Header Sanitization
 * ─────────────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Verify JWT tokens (Bearer) and extract user ID
 *  2. Create authenticated Supabase clients for mobile requests
 *  3. Provide crash-resistant authentication helpers
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Extract Bearer token from Authorization header
 * Returns null if not found or malformed
 */
export function extractBearerToken(request: Request): string | null {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token.trim();
  } catch (error) {
    console.error('[Security] Error extracting bearer token:', error);
    return null;
  }
}

/**
 * Create authenticated Supabase client from request
 * This is the CORE function that all protected routes should use
 * 
 * CRASH-RESISTANT: Returns client even if token is missing (anon client)
 * Caller must verify authentication separately if needed
 */
export async function createAuthedSupabaseClient(request: Request): Promise<{
  supabase: SupabaseClient;
  userId: string | null;
  token: string | null;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Extract token from Authorization header
    const token = extractBearerToken(request);

    // If request has Bearer token, create authenticated client
    if (token) {
      const client = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: { 
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Verify token and get user ID
      try {
        const { data, error } = await client.auth.getUser(token);
        
        if (error || !data.user?.id) {
          console.warn('[Security] Token verification failed:', error?.message || 'No user');
          // Return anon client if token is invalid
          return {
            supabase: createClient(supabaseUrl, supabaseKey, {
              auth: { persistSession: false },
            }),
            userId: null,
            token: null,
          };
        }

        return {
          supabase: client,
          userId: data.user.id,
          token,
        };
      } catch (verifyError) {
        console.error('[Security] Token verification error:', verifyError);
        // Return anon client on verification error
        return {
          supabase: createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false },
          }),
          userId: null,
          token: null,
        };
      }
    }

    // No token provided - return anonymous client
    return {
      supabase: createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      }),
      userId: null,
      token: null,
    };
  } catch (error) {
    console.error('[Security] Fatal error in createAuthedSupabaseClient:', error);
    throw error;
  }
}

/**
 * Verify JWT token with Supabase and extract user ID
 * Returns user UUID or null if invalid/expired
 * 
 * CRASH-RESISTANT: Always returns null on error, never throws
 */
export async function verifyTokenAndGetUserId(token: string): Promise<string | null> {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[Security] Supabase env not configured');
      return null;
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: { persistSession: false },
    });

    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user?.id) {
      console.warn(`[Security] Token verification failed: ${error?.message || 'No user'}`);
      return null;
    }

    return data.user.id;
  } catch (error) {
    console.error('[Security] Token verification error:', error);
    return null;
  }
}

/**
 * Custom Error Classes for security layer
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
