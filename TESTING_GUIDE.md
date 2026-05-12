# 🧪 TESTING GUIDE - ZMAYY LOCATION TRACKING

## 📋 QUICK START

Panduan lengkap untuk testing fitur location tracking setelah implementasi perbaikan.

---

## 🎯 PRE-REQUISITES

### 1. Database Setup ✅
SQL script sudah dijalankan di Supabase (`SUPABASE_FIX_LOCATION.sql`)

### 2. Verifikasi Database
Buka Supabase SQL Editor dan jalankan:

```sql
-- Check RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_nearby_users', 'get_visible_users');

-- Expected: 2 rows (get_nearby_users, get_visible_users)
```

```sql
-- Check profile columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('last_lat', 'last_lng', 'is_ghost_mode', 'is_public', 'updated_at')
ORDER BY column_name;

-- Expected: 5 rows with correct data types
```

---

## 🌐 WEB APPLICATION TESTING

### Step 1: Login
1. Buka https://zmayy.vercel.app (atau localhost:3000)
2. Login dengan akun test
3. **Check Console Logs**:
   ```
   [Dashboard] User authenticated: <user-id>
   [Dashboard] Profile loaded: { id, username, last_lat, last_lng, ... }
   ```

### Step 2: Location Permission
1. Browser akan meminta permission untuk akses lokasi
2. Klik **Allow**
3. **Check Console Logs**:
   ```
   [Map] Starting geolocation watch
   [Map] Location updated: (lat, lng)
   [Map] Location saved to database
   ```

### Step 3: Verify Location in Database
Buka Supabase SQL Editor:
```sql
SELECT id, username, last_lat, last_lng, is_ghost_mode, is_public, updated_at
FROM profiles
WHERE id = 'YOUR-USER-ID';
```

**Expected**:
- `last_lat` dan `last_lng` NOT NULL
- `is_ghost_mode` = false
- `is_public` = true
- `updated_at` = recent timestamp

### Step 4: Test Nearby Users
1. Map harus menampilkan:
   - **Gold marker** = current user (you)
   - **Gold markers with initials** = friends online
   - **Gray markers with initials** = strangers nearby (within 1km)

2. **Check Console Logs**:
   ```
   [Map] Fetching visible users at (lat, lng)
   [Map] Loaded X visible users
   ```

3. **Check Badges** (bottom left):
   - "X pengguna di sekitar" (strangers)
   - "X teman online" (friends)

### Step 5: Test Ghost Mode
1. Klik **Profile** icon (bottom nav)
2. Toggle **Mode Hantu** ON
3. **Expected Behavior**:
   - User marker hilang dari map
   - Map overlay menjadi blur
   - Badges menampilkan "—"
   - Toast notification: "Mode Hantu Aktif"

4. **Check Console Logs**:
   ```
   [Map] Ghost mode activated, wiping location from DB
   [Map] Ghost Mode: coordinates wiped from DB
   [Map] Ghost mode enabled, skipping geolocation
   ```

5. **Verify in Database**:
   ```sql
   SELECT last_lat, last_lng, is_ghost_mode
   FROM profiles
   WHERE id = 'YOUR-USER-ID';
   ```
   **Expected**: `last_lat` = NULL, `last_lng` = NULL, `is_ghost_mode` = true

6. Toggle **Mode Hantu** OFF
7. **Expected**:
   - Location tracking resume
   - User marker muncul kembali
   - Toast: "Mode Hantu Nonaktif"

### Step 6: Test Privacy Settings
1. Klik **Profile** → **Privasi & Keamanan**
2. Toggle **Profil Publik** OFF
3. **Expected**:
   - Perubahan langsung tersimpan (no save button)
   - Toast: "Profil sekarang privat"
   - Hanya teman yang bisa lihat lokasi

4. Toggle **Profil Publik** ON
5. **Expected**:
   - Toast: "Profil sekarang publik"
   - Strangers dalam 1km bisa lihat lokasi

### Step 7: Test Notifications Settings
1. Klik **Profile** → **Notifikasi**
2. Toggle **Aktifkan Notifikasi** OFF
3. **Expected**:
   - Perubahan langsung tersimpan
   - Toast: "Notifikasi dimatikan"

4. Toggle individual notifications (Permintaan Teman, Pesan, Suara)
5. **Expected**: Each toggle saves instantly

---

## 🔌 REST API TESTING

### Setup
1. Login untuk mendapatkan access token:
   ```bash
   curl -X POST https://zmayy.vercel.app/api/auth/mobile-login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. Copy `access_token` dari response
3. Set sebagai environment variable:
   ```bash
   export TOKEN="your-access-token-here"
   ```

### Test 1: Get Session
```bash
curl https://zmayy.vercel.app/api/auth/mobile-session \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "user": { "id": "...", "email": "..." },
  "profile": {
    "id": "...",
    "username": "...",
    "display_name": "...",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "is_ghost_mode": false,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Test 2: Update Location
```bash
curl -X POST https://zmayy.vercel.app/api/map/update-location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":-6.2088,"lng":106.8456}'
```

**Expected Response**:
```json
{
  "success": true,
  "lat": -6.2088,
  "lng": 106.8456
}
```

### Test 3: Get Visible Users
```bash
curl "https://zmayy.vercel.app/api/map/visible?lat=-6.2088&lng=106.8456" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
[
  {
    "id": "...",
    "username": "...",
    "display_name": "...",
    "avatar_initials": "AB",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "updated_at": "...",
    "relation_type": "friend",
    "is_friend": true,
    "is_online": true,
    "last_seen_label": "Online sekarang",
    "distance_km": 0.5
  },
  {
    "id": "...",
    "username": "...",
    "display_name": "...",
    "avatar_initials": "CD",
    "last_lat": -6.2090,
    "last_lng": 106.8460,
    "updated_at": "...",
    "relation_type": "stranger",
    "is_friend": false,
    "is_online": false,
    "last_seen_label": "Terakhir aktif 5 menit lalu",
    "distance_km": 0.8
  }
]
```

### Test 4: Update Profile
```bash
curl -X POST https://zmayy.vercel.app/api/profile/update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_ghost_mode":true}'
```

**Expected Response**:
```json
{
  "success": true,
  "profile": {
    "id": "...",
    "is_ghost_mode": true,
    "last_lat": null,
    "last_lng": null,
    ...
  }
}
```

---

## 🐛 DEBUGGING

### Browser Console
Buka Developer Tools (F12) → Console tab

**Key Logs to Look For**:
```
✅ [Dashboard] User authenticated: <id>
✅ [Dashboard] Profile loaded: { ... }
✅ [Map] Starting geolocation watch
✅ [Map] Location updated: (lat, lng)
✅ [Map] Location saved to database
✅ [Map] Fetching visible users at (lat, lng)
✅ [Map] Loaded X visible users
```

**Error Logs**:
```
❌ [Map] Geolocation error: ...
❌ [Map] Failed to update location in DB: ...
❌ [Map] RPC error: ...
```

### Network Tab
Buka Developer Tools → Network tab

**Check Requests**:
1. Filter: `visible` → Check `/api/map/visible` response
2. Filter: `update-location` → Check request/response
3. Filter: `mobile-session` → Check profile data

### Database Queries
```sql
-- Check your current location
SELECT id, username, last_lat, last_lng, is_ghost_mode, updated_at
FROM profiles
WHERE id = 'YOUR-USER-ID';

-- Check all users with location
SELECT id, username, last_lat, last_lng, is_ghost_mode, is_public, updated_at
FROM profiles
WHERE last_lat IS NOT NULL
ORDER BY updated_at DESC;

-- Test RPC function manually
SELECT * FROM get_nearby_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);

-- Check friendships
SELECT * FROM friendships
WHERE requester_id = 'YOUR-USER-ID' OR addressee_id = 'YOUR-USER-ID';
```

### Debug Tools (Browser Console)
```javascript
// Check current profile
window.zmayy.getProfile()

// Check visible users
window.zmayy.getVisibleUsers()

// Test location update
window.zmayy.testLocationUpdate(-6.2088, 106.8456)
```

---

## ❌ COMMON ISSUES

### Issue 1: Map tidak menampilkan users
**Symptoms**: Map kosong, no markers

**Debug Steps**:
1. Check console logs untuk RPC errors
2. Verify RPC function exists:
   ```sql
   SELECT * FROM get_nearby_users('YOUR-ID'::UUID, -6.2088, 106.8456);
   ```
3. Check if users have valid coordinates:
   ```sql
   SELECT COUNT(*) FROM profiles WHERE last_lat IS NOT NULL;
   ```

**Solution**:
- If RPC error → Re-run `SUPABASE_FIX_LOCATION.sql`
- If no coordinates → Users need to enable location permission

### Issue 2: Location tidak update
**Symptoms**: `last_lat` dan `last_lng` tetap NULL

**Debug Steps**:
1. Check browser permission (Settings → Site Settings → Location)
2. Check console logs: `[Map] Location updated`
3. Check ghost mode status

**Solution**:
- Enable browser location permission
- Disable ghost mode
- Refresh page

### Issue 3: Ghost mode tidak work
**Symptoms**: Coordinates tidak di-wipe saat ghost mode ON

**Debug Steps**:
1. Check console logs: `[Map] Ghost mode activated`
2. Check database:
   ```sql
   SELECT is_ghost_mode, last_lat, last_lng FROM profiles WHERE id = 'YOUR-ID';
   ```

**Solution**:
- Check ProfileModal toggle handler
- Verify database update query
- Check Supabase RLS policies (should be disabled)

### Issue 4: REST API returns 401
**Symptoms**: `Unauthorized` error

**Debug Steps**:
1. Check Authorization header format: `Bearer TOKEN`
2. Verify token not expired:
   ```bash
   curl https://zmayy.vercel.app/api/auth/mobile-session \
     -H "Authorization: Bearer $TOKEN"
   ```

**Solution**:
- Get new token via `/api/auth/mobile-login`
- Check token format (no extra spaces)
- Verify CORS headers

### Issue 5: Strangers tidak muncul
**Symptoms**: Only friends visible, no strangers

**Debug Steps**:
1. Check `is_public` setting:
   ```sql
   SELECT is_public FROM profiles WHERE id = 'YOUR-ID';
   ```
2. Check distance (must be < 1km)
3. Check if strangers have `is_public = true`

**Solution**:
- Enable "Profil Publik" in Privacy Settings
- Move closer to other users (< 1km)
- Ask other users to enable public profile

---

## ✅ SUCCESS CRITERIA

### Web Application
- [ ] Login berhasil
- [ ] Location permission granted
- [ ] User marker muncul di map
- [ ] Coordinates tersimpan di database
- [ ] Friends muncul dengan gold markers
- [ ] Strangers muncul dengan gray markers
- [ ] Badges menampilkan count yang benar
- [ ] Ghost mode ON → coordinates wiped
- [ ] Ghost mode OFF → location tracking resume
- [ ] Privacy settings instant save
- [ ] Notifications settings instant save

### REST API
- [ ] `/api/auth/mobile-login` returns token + profile
- [ ] `/api/auth/mobile-session` returns complete profile
- [ ] `/api/map/update-location` updates coordinates
- [ ] `/api/map/visible` returns nearby users
- [ ] All responses include correct CORS headers
- [ ] Token authentication works
- [ ] Error responses are descriptive

### Database
- [ ] RPC functions exist and work
- [ ] Profile columns match schema
- [ ] Indexes created for performance
- [ ] Triggers work (updated_at auto-update)
- [ ] RLS policies configured (or disabled)

---

## 📊 PERFORMANCE TESTING

### Load Testing
```bash
# Test concurrent location updates
for i in {1..10}; do
  curl -X POST https://zmayy.vercel.app/api/map/update-location \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"lat\":-6.208$i,\"lng\":106.845$i}" &
done
wait
```

### RPC Performance
```sql
-- Test RPC function performance
EXPLAIN ANALYZE
SELECT * FROM get_nearby_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);
```

**Expected**: Query time < 100ms

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploy
- [ ] All tests passing locally
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Database setup complete
- [ ] Environment variables set

### After Deploy
- [ ] Test login on production URL
- [ ] Test location tracking
- [ ] Test REST API endpoints
- [ ] Check Vercel deployment logs
- [ ] Monitor Supabase logs
- [ ] Test from mobile device

### Monitoring
- [ ] Setup error tracking (Sentry)
- [ ] Monitor API response times
- [ ] Track location update frequency
- [ ] Monitor database query performance

---

## 📞 SUPPORT

Jika masih ada masalah setelah mengikuti guide ini:

1. **Check Logs**:
   - Browser console
   - Vercel deployment logs
   - Supabase logs

2. **Verify Setup**:
   - Database schema
   - RPC functions
   - Environment variables

3. **Test Manually**:
   - SQL queries in Supabase
   - REST API with curl
   - Browser DevTools

4. **Document Issue**:
   - Error messages
   - Console logs
   - Network requests
   - Database state

---

**Happy Testing! 🎉**
