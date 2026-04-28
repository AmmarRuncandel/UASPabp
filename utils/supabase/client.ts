import { createBrowserClient } from '@supabase/ssr';

/**
 * createClient — Supabase browser client
 * Use this inside Client Components ('use client').
 * Internally uses cookie-based auth storage managed by @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
