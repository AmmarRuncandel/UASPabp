# ✅ QUICK CHECKLIST - LOCATION TRACKING FIX

## 🎯 IMPLEMENTATION STATUS

### Code Changes: ✅ COMPLETE
- [x] Type definitions updated
- [x] API helpers fixed
- [x] Auth endpoints updated
- [x] Map endpoints fixed
- [x] Map components updated
- [x] Profile components fixed
- [x] Dashboard updated
- [x] No TypeScript errors
- [x] Documentation created

---

## 🧪 TESTING CHECKLIST

### 1. Database Setup
- [ ] SQL script dijalankan di Supabase
- [ ] RPC functions exist (get_nearby_users, get_visible_users)
- [ ] Profile columns complete (last_lat, last_lng, is_ghost_mode, is_public, etc.)
- [ ] Indexes created
- [ ] Triggers active

**Verify**:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('get_nearby_users', 'get_visible_users');
```

---

### 2. Web Application

#### Login & Profile
- [ ] Login berhasil
- [ ] Profile data muncul
- [ ] Avatar initials tampil
- [ ] Console log: `[Dashboard] User authenticated`
- [ ] Console log: `[Dashboard] Profile loaded`

#### Location Tracking
- [ ] Browser meminta permission lokasi
- [ ] User marker (gold teardrop) muncul di map
- [ ] Console log: `[Map] Starting geolocation watch`
- [ ] Console log: `[Map] Location updated: (lat, lng)`
- [ ] Console log: `[Map] Location saved to database`
- [ ] Coordinates tersimpan di database (last_lat, last_lng NOT NULL)

#### Nearby Users
- [ ] Teman muncul dengan gold markers
- [ ] Strangers muncul dengan gray markers
- [ ] Badge "X teman online" tampil
- [ ] Badge "X pengguna di sekitar" tampil
- [ ] Console log: `[Map] Loaded X visible users`
- [ ] Popup menampilkan nama & status

#### Ghost Mode
- [ ] Toggle ghost mode ON
- [ ] User marker hilang
- [ ] Map overlay blur
- [ ] Badges menampilkan "—"
- [ ] Toast: "Mode Hantu Aktif"
- [ ] Console log: `[Map] Ghost mode activated`
- [ ] Database: last_lat = NULL, last_lng = NULL
- [ ] Toggle ghost mode OFF
- [ ] Location tracking resume
- [ ] User marker muncul kembali

#### Privacy Settings
- [ ] Buka Profile → Privasi & Keamanan
- [ ] Toggle "Profil Publik" ON/OFF
- [ ] Perubahan langsung tersimpan (no save button)
- [ ] Toast notification muncul
- [ ] Database updated instantly

#### Notifications Settings
- [ ] Buka Profile → Notifikasi
- [ ] Toggle "Aktifkan Notifikasi" ON/OFF
- [ ] Toggle individual notifications
- [ ] Perubahan langsung tersimpan
- [ ] Toast notification muncul

---

### 3. REST API Testing

#### Setup
```bash
# Get token
curl -X POST https://zmayy.vercel.app/api/auth/mobile-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Set token
export TOKEN="your-access-token"
```

#### Endpoints
- [ ] **GET /api/auth/mobile-session**
  - Returns complete profile with all fields
  - Status: 200
  
- [ ] **POST /api/map/update-location**
  - Updates last_lat, last_lng
  - Returns: `{"success":true,"lat":...,"lng":...}`
  - Status: 200
  
- [ ] **GET /api/map/visible?lat=...&lng=...**
  - Returns array of nearby users
  - Each user has relation_type, is_friend
  - Status: 200
  
- [ ] **POST /api/profile/update**
  - Updates profile fields
  - Returns updated profile
  - Status: 200

---

### 4. Database Verification

```sql
-- Check your profile
SELECT id, username, last_lat, last_lng, is_ghost_mode, is_public, updated_at
FROM profiles
WHERE id = 'YOUR-USER-ID';

-- Test RPC function
SELECT * FROM get_nearby_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);

-- Check all users with location
SELECT COUNT(*) FROM profiles WHERE last_lat IS NOT NULL;
```

- [ ] Profile exists with correct data
- [ ] RPC function returns results
- [ ] Multiple users have coordinates

---

## 🐛 COMMON ISSUES

### Issue: Map tidak menampilkan users
- [ ] Check console logs untuk RPC errors
- [ ] Verify RPC function exists di database
- [ ] Check users have valid coordinates
- [ ] Test RPC function manually

### Issue: Location tidak update
- [ ] Check browser location permission
- [ ] Check console logs: `[Map] Location updated`
- [ ] Verify ghost mode OFF
- [ ] Check database update query

### Issue: Ghost mode tidak work
- [ ] Check console logs: `[Map] Ghost mode activated`
- [ ] Verify coordinates wiped (NULL) in database
- [ ] Check ProfileModal toggle handler

### Issue: REST API returns 401
- [ ] Check Authorization header: `Bearer TOKEN`
- [ ] Verify token not expired
- [ ] Get new token via login
- [ ] Check CORS headers

---

## 📊 SUCCESS METRICS

### Web Application
- [ ] 0 TypeScript errors
- [ ] 0 console errors
- [ ] Location updates every 5-10 seconds
- [ ] Nearby users refresh every 30 seconds
- [ ] Ghost mode toggle < 1 second
- [ ] Settings save < 500ms

### REST API
- [ ] All endpoints return 200 OK
- [ ] Response time < 500ms
- [ ] Correct CORS headers
- [ ] Proper error messages
- [ ] Token authentication works

### Database
- [ ] RPC function < 100ms
- [ ] Indexes used in queries
- [ ] No missing columns
- [ ] Triggers working
- [ ] Data consistency maintained

---

## 🚀 DEPLOYMENT

### Pre-Deploy
- [x] All code changes committed
- [x] No TypeScript errors
- [x] Documentation complete
- [ ] Local testing passed

### Deploy
- [ ] Push to Git repository
- [ ] Vercel auto-deploy triggered
- [ ] Check deployment logs
- [ ] Verify build success

### Post-Deploy
- [ ] Test production URL
- [ ] Verify environment variables
- [ ] Test REST API endpoints
- [ ] Monitor error logs
- [ ] Check Supabase logs

---

## 📝 DOCUMENTATION

### Created Files
- [x] `PERBAIKAN_LOKASI_FINAL.md` - Implementation guide
- [x] `TESTING_GUIDE.md` - Testing instructions
- [x] `IMPLEMENTATION_SUMMARY.md` - Summary
- [x] `QUICK_CHECKLIST.md` - This file

### Reference Files
- `SUPABASE_FIX_LOCATION.sql` - Database setup
- `API_DOCUMENTATION_FOR_FLUTTER.md` - API reference
- `FLUTTER_IMPLEMENTATION_GUIDE.md` - Flutter guide

---

## ✅ FINAL STATUS

### Implementation: ✅ COMPLETE
All code changes have been implemented and are ready for testing.

### Testing: ⏳ PENDING
User needs to run through testing checklist above.

### Deployment: ⏳ PENDING
Deploy after testing passes.

### Flutter Integration: ⏳ PENDING
Implement after web testing passes.

---

## 📞 NEXT STEPS

1. **NOW**: Run through testing checklist
2. **THEN**: Fix any issues found
3. **NEXT**: Deploy to production
4. **FINALLY**: Integrate with Flutter

---

**Last Updated**: May 12, 2026
**Status**: ✅ Ready for Testing
