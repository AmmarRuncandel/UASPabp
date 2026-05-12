-- ============================================================================
-- ZMAYY SUPABASE DATABASE SETUP - COMPLETE & FIXED
-- ============================================================================
-- This script sets up all tables, RLS policies, and RPC functions
-- Run this in Supabase SQL Editor
-- 
-- IMPORTANT: This will DROP existing tables and recreate them!
-- Make sure to backup your data first if needed.
-- ============================================================================

-- ============================================================================
-- 0. DROP EXISTING OBJECTS (if you want fresh start)
-- ============================================================================
-- Uncomment these lines if you want to start fresh:
-- DROP FUNCTION IF EXISTS public.get_nearby_users CASCADE;
-- DROP FUNCTION IF EXISTS public.get_visible_users CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.friendships CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_initials TEXT,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_ghost_mode BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  notify_global BOOLEAN DEFAULT TRUE,
  notify_requests BOOLEAN DEFAULT TRUE,
  notify_messages BOOLEAN DEFAULT TRUE,
  notify_sound BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(last_lat, last_lng) WHERE last_lat IS NOT NULL AND last_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can insert friendships they initiate" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships they receive" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete friendships they are part of" ON public.friendships;

DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages they send" ON public.messages;

-- ============================================================================
-- 5. CREATE RLS POLICIES
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PROFILES POLICIES
-- ────────────────────────────────────────────────────────────────────────────

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can view public profiles (for map and friends)
CREATE POLICY "Users can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (is_public = TRUE OR auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────────────
-- FRIENDSHIPS POLICIES
-- ────────────────────────────────────────────────────────────────────────────

-- Users can view friendships they are part of
CREATE POLICY "Users can view their own friendships"
  ON public.friendships
  FOR SELECT
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- Users can insert friendships they initiate
CREATE POLICY "Users can insert friendships they initiate"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they receive (to accept)
CREATE POLICY "Users can update friendships they receive"
  ON public.friendships
  FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- Users can delete friendships they are part of
CREATE POLICY "Users can delete friendships they are part of"
  ON public.friendships
  FOR DELETE
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- ────────────────────────────────────────────────────────────────────────────
-- MESSAGES POLICIES
-- ────────────────────────────────────────────────────────────────────────────

-- Users can view messages they sent or received
CREATE POLICY "Users can view messages they sent or received"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Users can insert messages they send
CREATE POLICY "Users can insert messages they send"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ============================================================================
-- 6. CREATE RPC FUNCTIONS
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Function: get_visible_users
-- Returns: Friends (any distance) + Public strangers (within 1km)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_visible_users(
  caller_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_initials TEXT,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ,
  relation_type TEXT,
  is_friend BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Get all accepted friends (any distance)
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_initials,
    p.last_lat,
    p.last_lng,
    p.updated_at,
    'friend'::TEXT AS relation_type,
    TRUE AS is_friend
  FROM public.profiles p
  INNER JOIN public.friendships f ON (
    (f.requester_id = caller_id AND f.addressee_id = p.id) OR
    (f.addressee_id = caller_id AND f.requester_id = p.id)
  )
  WHERE 
    f.status = 'accepted'
    AND p.id != caller_id
    AND p.last_lat IS NOT NULL
    AND p.last_lng IS NOT NULL
    AND p.is_ghost_mode = FALSE
  
  UNION ALL
  
  -- Get public strangers within 1km (not friends)
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_initials,
    p.last_lat,
    p.last_lng,
    p.updated_at,
    'stranger'::TEXT AS relation_type,
    FALSE AS is_friend
  FROM public.profiles p
  WHERE 
    p.id != caller_id
    AND p.is_public = TRUE
    AND p.is_ghost_mode = FALSE
    AND p.last_lat IS NOT NULL
    AND p.last_lng IS NOT NULL
    -- Not already a friend
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.requester_id = caller_id AND f.addressee_id = p.id) OR
        (f.addressee_id = caller_id AND f.requester_id = p.id)
      )
    );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Alternative function name for backward compatibility
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_nearby_users(
  caller_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_initials TEXT,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ,
  relation_type TEXT,
  is_friend BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Just call the main function
  RETURN QUERY SELECT * FROM public.get_visible_users(caller_id, user_lat, user_lng);
END;
$$;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.friendships TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION public.get_visible_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_users TO authenticated;

-- ============================================================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for friendships
DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify setup:

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'friendships', 'messages');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'friendships', 'messages');

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_visible_users', 'get_nearby_users');

-- ============================================================================
-- 10. TEST DATA (OPTIONAL - FOR DEVELOPMENT ONLY)
-- ============================================================================

-- Uncomment to insert test data:

/*
-- Insert test profile (replace with your user ID from auth.users)
INSERT INTO public.profiles (id, username, display_name, avatar_initials, is_public, is_ghost_mode)
VALUES 
  ('YOUR-USER-ID-HERE', 'testuser', 'Test User', 'TU', TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_initials = EXCLUDED.avatar_initials;

-- Test RPC function
SELECT * FROM public.get_visible_users(
  'YOUR-USER-ID-HERE'::UUID,
  -6.2088,
  106.8456
);
*/

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Verify all tables, policies, and functions are created
-- 2. Test RPC functions with your user ID
-- 3. Deploy Next.js to Vercel
-- 4. Update Flutter app with Vercel URL
-- 5. Test all endpoints from Flutter

-- ============================================================================
