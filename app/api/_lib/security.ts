/**
 * Security Utilities — Token Verification, User Context Extraction, Header Sanitization
 * ─────────────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Verify JWT tokens (Bearer) and extract user ID
 *  2. Sanitize incoming request headers to prevent spoofing
 *  3. Inject internal headers (x-user-id) after validation
 *  4. Define public/protected routes for middleware bypass
 */

import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Public API routes that bypass authentication
 * These routes do NOT require Bearer token verification
 */
export const PUBLIC_ROUTES = [
  /^\/api\/auth\/mobile-login(\/)?$/,
  /^\/api\/auth\/mobile-register(\/)?$/,
  /^\/api\/health(\/)?$/,
];

/**
 * Check if a request pathname is in the public routes list
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((pattern) => pattern.test(pathname));
}

/**
 * Extract Bearer token from Authorization header
 * Returns null if not found or malformed
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

/**
 * Verify JWT token with Supabase and extract user ID
 * Returns user UUID or null if invalid/expired
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
 * Sanitize request headers to remove/prevent spoofing of internal headers
 * Internal headers (x-user-*) set by client are removed before processing
 */
export function sanitizeRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);

  // Remove any x-user-* headers that might have been injected by client
  const keysToRemove: string[] = [];
  headers.forEach((_, key) => {
    if (key.toLowerCase().startsWith('x-user-')) {
      keysToRemove.push(key);
    }
  });

  keysToRemove.forEach((key) => headers.delete(key));

  return headers;
}

/**
 * Inject user context header into request after successful token verification
 * This header is ONLY set by the server after validation, never from client
 */
export function injectUserContextHeader(
  headers: Headers,
  userId: string
): Headers {
  const newHeaders = new Headers(headers);
  newHeaders.set('x-user-id', userId);
  return newHeaders;
}

/**
 * Extract user context from header set by proxy/middleware
 * Used safely inside route handlers that require authentication
 */
export function extractUserContextFromHeader(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  if (!userId || userId.trim() === '') {
    return null;
  }
  return userId;
}

/**
 * Verify that a request has valid user context
 * Returns user ID or throws UnauthorizedError
 */
export function requireUserContext(request: NextRequest): string {
  const userId = extractUserContextFromHeader(request);
  if (!userId) {
    throw new UnauthorizedError('Missing or invalid user context');
  }
  return userId;
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
