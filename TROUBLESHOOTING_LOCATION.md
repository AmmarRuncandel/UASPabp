# 🔧 Troubleshooting - Location View Not Working

**Problem:** Web Next.js tidak dapat menampilkan lokasi user (teman maupun stranger)

---

## 🎯 Quick Diagnosis

Jalankan query ini di Supabase SQL Editor untuk diagnosis cepat:

```sql
-- 1. Cek struktur tabel profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Cek apakah RPC function ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_nearby_users', 'get_visible_users');

-- 3. Cek data profile Anda (ganti YOUR-USER-ID)
SELECT id, username, last_lat, last_lng, is_ghost_mode, is_public, updated_at
FROM profiles
WHERE id = 'YOUR-USER-ID';
```

---

## 🔍 Root Cause Analysis

Berdasarkan screenshot tabel Supabase, kemungkinan masalah:

### ❌ Problem 1: RPC Function Tidak Ada

**Symptoms:**
- Console error: "function get_nearby_users does not exist"
- Map kosong, tidak ada marker
- API endpoint `/api/map/visible` return error 500

**Diagnosis:**
```sql
-- Cek apakah function ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_nearby_users';

-- Jika return 0 rows = function tidak ada
```

**Solution:**
```bash
1. Buka Supabase SQL Editor
2. Copy paste isi file: SUPABASE_FIX_LOCATION.sql
3. Run (tekan F5)
4. Verify: SELECT * FROM get_nearby_users('test-uuid'::UUID, -6.2, 106.8);
```

---

### ❌ Problem 2: Kolom Location Tidak Ada di Tabel Profiles

**Symptoms:**
- Error: "column last_lat does not exist"
- Profile tidak bisa save lokasi

**Diagnosis:**
```sql
-- Cek kolom yang ada
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('last_lat', 'last_lng', 'is_ghost_mode', 'is_public');

-- Jika return < 4 rows = ada kolom yang missing
```

**Solution:**
File `SUPABASE_FIX_LOCATION.sql` sudah include script untuk tambah kolom otomatis.

---

### ❌ Problem 3: Ghost Mode Aktif

**Symptoms:**
- User tidak muncul di map orang lain
- Teman tidak bisa lihat lokasi Anda
- Map Anda sendiri kosong

**Diagnosis:**
```sql
-- Cek ghost mode status (ganti YOUR-USER-ID)
SELECT id, username, is_ghost_mode 
FROM profiles 
WHERE id = 'YOUR-USER-ID';

-- Jika is_ghost_mode = TRUE = ini masalahnya
```

**Solution:**
```sql
-- Matikan ghost mode
UPDATE profiles 
SET is_ghost_mode = FALSE 
WHERE id = 'YOUR-USER-ID';
```

---

### ❌ Problem 4: Lokasi Belum Di-Set

**Symptoms:**
- Map muncul tapi tidak ada marker
- Console log: "RPC returned 0 users"

**Diagnosis:**
```sql
-- Cek apakah lokasi sudah di-set (ganti YOUR-USER-ID)
SELECT id, username, last_lat, last_lng 
FROM profiles 
WHERE id = 'YOUR-USER-ID';

-- Jika last_lat atau last_lng = NULL = lokasi belum di-set
```

**Solution:**
```sql
-- Set lokasi manual untuk testing (Jakarta)
UPDATE profiles 
SET 
  last_lat = -6.2088,
  last_lng = 106.8456,
  updated_at = NOW()
WHERE id = 'YOUR-USER-ID';
```

Atau tunggu web app update lokasi otomatis via geolocation API.

---

### ❌ Problem 5: RLS Policy Terlalu Ketat

**Symptoms:**
- RPC function return empty array
- Error: "permission denied for table profiles"

**Diagnosis:**
```sql
-- Cek RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';
```

**Solution:**
File `SUPABASE_FIX_LOCATION.sql` sudah include RLS policies yang benar.

---

### ❌ Problem 6: Tidak Ada User Lain di Sekitar

**Symptoms:**
- Map muncul, marker Anda ada
- Tapi tidak ada user lain

**Diagnosis:**
```sql
-- Cek berapa user yang punya lokasi (selain Anda)
SELECT COUNT(*) 
FROM profiles 
WHERE last_lat IS NOT NULL 
AND last_lng IS NOT NULL
AND is_ghost_mode = FALSE
AND id != 'YOUR-USER-ID';

-- Jika return 0 = memang tidak ada user lain
```

**Solution:**
Buat test user atau tunggu user lain online.

---

## 🚀 Step-by-Step Fix

### Step 1: Run Fix Script

```bash
1. Login ke Supabase Dashboard
2. Buka SQL Editor
3. Copy paste isi file: SUPABASE_FIX_LOCATION.sql
4. Click "Run" (atau F5)
5. Tunggu sampai selesai (no errors)
```

### Step 2: Verify Setup

```sql
-- 1. Cek RPC function ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_nearby_users', 'get_visible_users');
-- Should return 2 rows

-- 2. Cek kolom profiles lengkap
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('last_lat', 'last_lng', 'is_ghost_mode', 'is_public');
-- Should return 4 rows

-- 3. Cek RLS policies
SELECT COUNT(*) 
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';
-- Should return >= 4
```

### Step 3: Set Test Data

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Set your location (ganti YOUR-USER-ID)
UPDATE profiles 
SET 
  last_lat = -6.2088,
  last_lng = 106.8456,
  is_ghost_mode = FALSE,
  is_public = TRUE,
  updated_at = NOW()
WHERE id = 'YOUR-USER-ID';
```

### Step 4: Test RPC Function

```sql
-- Test RPC (ganti YOUR-USER-ID)
SELECT * FROM get_nearby_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);

-- Should return array of users (bisa kosong jika tidak ada user lain)
```

### Step 5: Test Web Application

```bash
1. Buka web: http://localhost:3000 (atau Vercel URL)
2. Login
3. Buka browser console (F12)
4. Lihat log: "[Map] RPC get_nearby_users..."
5. Map harus muncul dengan marker Anda
```

### Step 6: Test REST API

```bash
# Get your token first (dari browser console atau login response)
TOKEN="your-access-token"

# Test endpoint
curl "http://localhost:3000/api/map/visible?lat=-6.2088&lng=106.8456" \
  -H "Authorization: Bearer $TOKEN"

# Should return JSON array of users
```

---

## 🧪 Testing Checklist

- [ ] ✅ RPC function `get_nearby_users` exists
- [ ] ✅ RPC function `get_visible_users` exists (alias)
- [ ] ✅ Table `profiles` has columns: last_lat, last_lng, is_ghost_mode, is_public
- [ ] ✅ RLS policies enabled on profiles table
- [ ] ✅ Your profile has valid coordinates (not NULL)
- [ ] ✅ Your ghost_mode = FALSE
- [ ] ✅ Your is_public = TRUE
- [ ] ✅ RPC function returns data when called manually
- [ ] ✅ Web map shows your location marker
- [ ] ✅ REST API endpoint returns 200 OK
- [ ] ✅ Console shows no errors

---

## 📊 Common Error Messages

### Error: "function get_nearby_users does not exist"

**Cause:** RPC function belum dibuat di Supabase

**Fix:** Run `SUPABASE_FIX_LOCATION.sql`

---

### Error: "column last_lat does not exist"

**Cause:** Kolom location belum ada di tabel profiles

**Fix:** Run `SUPABASE_FIX_LOCATION.sql` (auto add columns)

---

### Error: "permission denied for table profiles"

**Cause:** RLS policy terlalu ketat atau tidak ada

**Fix:** Run `SUPABASE_FIX_LOCATION.sql` (create proper policies)

---

### Error: "RPC returned 0 users"

**Cause:** 
1. Tidak ada user lain di sekitar
2. Ghost mode aktif
3. Lokasi belum di-set

**Fix:**
```sql
-- Cek status Anda
SELECT id, username, last_lat, last_lng, is_ghost_mode, is_public
FROM profiles
WHERE id = 'YOUR-USER-ID';

-- Fix jika perlu
UPDATE profiles 
SET 
  last_lat = -6.2088,
  last_lng = 106.8456,
  is_ghost_mode = FALSE,
  is_public = TRUE
WHERE id = 'YOUR-USER-ID';
```

---

## 🔄 Reset Everything (Nuclear Option)

Jika semua cara di atas gagal, reset database:

```sql
-- ⚠️ WARNING: This will delete ALL data!
-- Backup your data first!

-- 1. Drop everything
DROP FUNCTION IF EXISTS public.get_nearby_users CASCADE;
DROP FUNCTION IF EXISTS public.get_visible_users CASCADE;

-- 2. Run SUPABASE_FIX_LOCATION.sql

-- 3. Re-create test data
```

---

## 📞 Still Not Working?

Jika masih tidak berfungsi setelah semua langkah di atas:

### Debug Checklist:

1. **Check Browser Console**
   ```
   F12 → Console tab
   Look for errors starting with "[Map]"
   ```

2. **Check Network Tab**
   ```
   F12 → Network tab
   Filter: "visible"
   Check response status and body
   ```

3. **Check Supabase Logs**
   ```
   Supabase Dashboard → Logs → API
   Look for errors related to RPC calls
   ```

4. **Check Vercel Logs** (if deployed)
   ```
   Vercel Dashboard → Your Project → Logs
   Look for errors in /api/map/visible
   ```

5. **Manual RPC Test**
   ```sql
   -- Run this in Supabase SQL Editor
   SELECT * FROM get_nearby_users(
     'YOUR-USER-ID'::UUID,
     -6.2088,
     106.8456
   );
   
   -- If this works but web doesn't, problem is in web code
   -- If this fails, problem is in database
   ```

---

## 📝 Summary

**Most Common Issues:**
1. ⭐ RPC function tidak ada → Run `SUPABASE_FIX_LOCATION.sql`
2. ⭐ Ghost mode aktif → Set `is_ghost_mode = FALSE`
3. ⭐ Lokasi belum di-set → Update `last_lat`, `last_lng`
4. ⭐ Tidak ada user lain → Buat test user atau tunggu

**Quick Fix:**
```bash
1. Run SUPABASE_FIX_LOCATION.sql
2. Set your location manually
3. Disable ghost mode
4. Refresh web page
```

**Verification:**
```sql
-- This should return your data
SELECT * FROM get_nearby_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);
```

---

**Last Updated:** May 12, 2026  
**Status:** Ready to Fix 🔧
