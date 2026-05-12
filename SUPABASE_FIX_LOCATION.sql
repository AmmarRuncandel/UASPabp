-- ============================================================================
-- ZMAYY - FIX LOCATION TRACKING
-- ============================================================================
-- Script ini memperbaiki masalah view lokasi yang tidak berfungsi
-- Jalankan di Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Verifikasi Struktur Tabel Profiles
-- ============================================================================

-- Cek apakah kolom yang diperlukan ada
DO $$ 
BEGIN
    -- Tambah kolom last_lat jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_lat'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_lat DOUBLE PRECISION;
        RAISE NOTICE 'Added column: last_lat';
    END IF;

    -- Tambah kolom last_lng jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_lng'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_lng DOUBLE PRECISION;
        RAISE NOTICE 'Added column: last_lng';
    END IF;

    -- Tambah kolom is_ghost_mode jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_ghost_mode'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_ghost_mode BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added column: is_ghost_mode';
    END IF;

    -- Tambah kolom is_public jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added column: is_public';
    END IF;

    -- Tambah kolom updated_at jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added column: updated_at';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create Indexes untuk Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_location 
ON public.profiles(last_lat, last_lng) 
WHERE last_lat IS NOT NULL AND last_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
ON public.profiles(updated_at);

CREATE INDEX IF NOT EXISTS idx_profiles_ghost_public 
ON public.profiles(is_ghost_mode, is_public);

-- ============================================================================
-- STEP 3: Create RPC Function - get_nearby_users
-- ============================================================================

-- Drop function jika sudah ada (untuk update)
DROP FUNCTION IF EXISTS public.get_nearby_users(UUID, DOUBLE PRECISION, DOUBLE PRECISION);

-- Create function baru
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
  RETURN QUERY
  
  -- ══════════════════════════════════════════════════════════════════════════
  -- PART 1: Get all accepted friends (any distance)
  -- ══════════════════════════════════════════════════════════════════════════
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
  
  -- ══════════════════════════════════════════════════════════════════════════
  -- PART 2: Get public strangers within 1km (not friends)
  -- ══════════════════════════════════════════════════════════════════════════
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
    )
    -- Distance filter using Haversine formula (approximately 1km)
    -- This is a rough filter, exact distance calculated in application
    AND (
      -- Rough bounding box check (faster than full Haversine)
      ABS(p.last_lat - user_lat) < 0.01 AND
      ABS(p.last_lng - user_lng) < 0.01
    );
END;
$$;

-- ============================================================================
-- STEP 4: Create Alias Function - get_visible_users
-- ============================================================================

-- Create alias untuk backward compatibility
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
  -- Just call the main function
  RETURN QUERY SELECT * FROM public.get_nearby_users(caller_id, user_lat, user_lng);
END;
$$;

-- ============================================================================
-- STEP 5: Grant Permissions
-- ============================================================================

-- Grant execute on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_nearby_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_users TO anon;
GRANT EXECUTE ON FUNCTION public.get_visible_users TO anon;

-- ============================================================================
-- STEP 6: Enable RLS (if not already enabled)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create/Update RLS Policies for Profiles
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (is_public = TRUE OR auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 8: Create Trigger for updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Create trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify setup:

-- 1. Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('last_lat', 'last_lng', 'is_ghost_mode', 'is_public', 'updated_at')
ORDER BY column_name;

-- 2. Check if RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_nearby_users', 'get_visible_users');

-- 3. Check if indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND indexname LIKE 'idx_profiles_%';

-- 4. Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- ============================================================================
-- STEP 10: TEST QUERIES
-- ============================================================================

-- Test 1: Check your profile
-- Replace 'YOUR-USER-ID' with actual user ID from auth.users
/*
SELECT id, username, display_name, last_lat, last_lng, is_ghost_mode, is_public, updated_at
FROM public.profiles
WHERE id = 'YOUR-USER-ID';
*/

-- Test 2: Test RPC function
-- Replace 'YOUR-USER-ID' with actual user ID
/*
SELECT * FROM public.get_nearby_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);
*/

-- Test 3: Update your location (for testing)
-- Replace 'YOUR-USER-ID' with actual user ID
/*
UPDATE public.profiles
SET 
  last_lat = -6.2088,
  last_lng = 106.8456,
  is_ghost_mode = FALSE,
  is_public = TRUE
WHERE id = 'YOUR-USER-ID';
*/

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Run verification queries above
-- 2. Test RPC function with your user ID
-- 3. Check web application can now see locations
-- 4. Test REST API endpoints

-- If you see errors, check:
-- 1. User has valid coordinates (last_lat, last_lng not null)
-- 2. is_ghost_mode = FALSE
-- 3. is_public = TRUE (for strangers to see you)
-- 4. RPC function returns data when called manually

-- ============================================================================
