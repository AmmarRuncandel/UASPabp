# 🚀 Zmayy Deployment & Configuration Guide

Panduan lengkap untuk deploy Next.js ke Vercel dan konfigurasi Flutter.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Next.js Deployment to Vercel](#nextjs-deployment-to-vercel)
4. [Flutter Configuration](#flutter-configuration)
5. [Testing & Verification](#testing--verification)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- [x] Akun Supabase (https://supabase.com)
- [x] Akun Vercel (https://vercel.com)
- [x] Git installed
- [x] Node.js 18+ installed
- [x] Flutter SDK installed
- [x] Code editor (VS Code recommended)

---

## 🗄️ Supabase Setup

### Step 1: Create Supabase Project

1. Login ke https://supabase.com
2. Click **"New Project"**
3. Isi detail project:
   - **Name:** zmayy (atau nama lain)
   - **Database Password:** Simpan password ini dengan aman
   - **Region:** Pilih yang terdekat (Singapore recommended)
4. Click **"Create new project"**
5. Tunggu ~2 menit sampai project selesai dibuat

### Step 2: Get Supabase Credentials

1. Di dashboard Supabase, klik **Settings** (icon gear)
2. Klik **API** di sidebar
3. Copy credentials berikut:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon public** key (key yang panjang)

**⚠️ PENTING:** Simpan credentials ini, akan digunakan di Next.js dan Flutter!

### Step 3: Run Database Setup Script

1. Di dashboard Supabase, klik **SQL Editor** di sidebar
2. Click **"New query"**
3. Copy seluruh isi file `SUPABASE_SETUP_COMPLETE.sql`
4. Paste ke SQL Editor
5. Click **"Run"** (atau tekan F5)
6. Tunggu sampai selesai (akan muncul "Success. No rows returned")

### Step 4: Verify Database Setup

Jalankan query verifikasi ini di SQL Editor:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'friendships', 'messages');

-- Should return 3 rows: profiles, friendships, messages
```

```sql
-- Check RPC functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_visible_users', 'get_nearby_users');

-- Should return 2 rows: get_visible_users, get_nearby_users
```

### Step 5: Disable Email Confirmation (Optional - for testing)

Jika ingin registrasi langsung tanpa konfirmasi email:

1. Klik **Authentication** di sidebar
2. Klik **Settings**
3. Scroll ke **Email Auth**
4. **Disable** "Enable email confirmations"
5. Click **Save**

**⚠️ WARNING:** Untuk production, sebaiknya enable email confirmation!

---

## 🌐 Next.js Deployment to Vercel

### Step 1: Prepare Repository

1. Pastikan semua perubahan sudah di-commit:

```bash
git add .
git commit -m "Add new endpoints and documentation"
git push origin main
```

2. Jika belum ada remote repository, buat di GitHub:
   - Buka https://github.com/new
   - Buat repository baru (contoh: `zmayy-backend`)
   - Follow instruksi untuk push existing repository

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Login ke https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Pilih repository Anda (zmayy-backend)
5. Click **"Import"**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

### Step 3: Configure Environment Variables

1. Di Vercel dashboard, buka project Anda
2. Click **"Settings"** tab
3. Click **"Environment Variables"** di sidebar
4. Add 2 environment variables:

**Variable 1:**
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://xxxxx.supabase.co` (dari Supabase)
- **Environment:** Production, Preview, Development (check all)

**Variable 2:**
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGc...` (anon key dari Supabase)
- **Environment:** Production, Preview, Development (check all)

5. Click **"Save"**

### Step 4: Redeploy

1. Click **"Deployments"** tab
2. Click **"..."** pada deployment terakhir
3. Click **"Redeploy"**
4. Tunggu sampai deployment selesai (~2 menit)

### Step 5: Get Deployment URL

1. Setelah deployment selesai, copy URL production
2. Contoh: `https://zmayy.vercel.app`
3. **Simpan URL ini untuk konfigurasi Flutter!**

### Step 6: Test Deployment

Test endpoint dengan curl atau Postman:

```bash
# Test health endpoint (should return 200)
curl https://zmayy.vercel.app/api/health

# Test login endpoint
curl -X POST https://zmayy.vercel.app/api/auth/mobile-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 📱 Flutter Configuration

### Step 1: Update Base URL

Buka file Flutter yang berisi API configuration (biasanya `lib/config/api_config.dart` atau `lib/services/api_client.dart`):

```dart
// BEFORE (local development)
const String baseUrl = 'http://localhost:3000';

// AFTER (production)
const String baseUrl = 'https://zmayy.vercel.app';
```

**💡 TIP:** Gunakan environment variables untuk switch antara dev dan prod:

```dart
class ApiConfig {
  static const bool isProduction = true; // Change to false for local dev
  
  static String get baseUrl {
    return isProduction 
      ? 'https://zmayy.vercel.app'
      : 'http://localhost:3000';
  }
}
```

### Step 2: Implement Profile Refresh

Tambahkan method untuk refresh profile dari server:

```dart
// lib/core/app_state.dart atau lib/services/auth_service.dart

Future<void> refreshProfileFromServer() async {
  try {
    final token = await _secureStorage.read(key: 'access_token');
    if (token == null) {
      throw Exception('No token found');
    }

    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/auth/mobile-session'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final profile = Profile.fromJson(data['profile']);
      
      // Save to local storage
      await _secureStorage.write(
        key: 'profile',
        value: jsonEncode(profile.toJson()),
      );
      
      // Update app state
      _currentProfile = profile;
      notifyListeners();
      
      print('✅ Profile refreshed from server');
    } else if (response.statusCode == 401) {
      // Token expired - logout
      await logout();
      throw Exception('Session expired');
    } else {
      throw Exception('Failed to refresh profile: ${response.statusCode}');
    }
  } catch (e) {
    print('❌ Error refreshing profile: $e');
    rethrow;
  }
}
```

### Step 3: Update Login Flow

Ubah login flow untuk refresh profile setelah login:

```dart
// lib/features/auth/login_screen.dart atau auth_service.dart

Future<void> login(String email, String password) async {
  try {
    // 1. Login
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/auth/mobile-login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      
      // 2. Save token
      await _secureStorage.write(
        key: 'access_token',
        value: data['access_token'],
      );
      
      // 3. Save profile
      await _secureStorage.write(
        key: 'profile',
        value: jsonEncode(data['profile']),
      );
      
      // 4. ✅ IMPORTANT: Refresh profile from server
      await refreshProfileFromServer();
      
      print('✅ Login successful');
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Login failed');
    }
  } catch (e) {
    print('❌ Login error: $e');
    rethrow;
  }
}
```

### Step 4: Update App Initialization

Ubah app initialization untuk refresh profile saat app start:

```dart
// lib/app_shell.dart atau main.dart

@override
void initState() {
  super.initState();
  
  WidgetsBinding.instance.addPostFrameCallback((_) async {
    final appState = Provider.of<AppState>(context, listen: false);
    
    // 1. Load from local storage first (fast)
    await appState.loadProfileFromStorage();
    
    // 2. ✅ Then refresh from server (accurate)
    try {
      await appState.refreshProfileFromServer();
    } catch (e) {
      print('⚠️ Could not refresh profile: $e');
      // Continue with cached profile
    }
    
    // 3. Load other data
    await appState.loadChatHistory();
  });
}
```

### Step 5: Add Error Display

Tambahkan error display di UI:

```dart
// lib/features/map/map_screen.dart

@override
Widget build(BuildContext context) {
  final appState = Provider.of<AppState>(context);
  
  return Scaffold(
    body: Stack(
      children: [
        // Map widget
        MapWidget(),
        
        // ✅ Error display
        if (appState.mapError != null)
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Material(
              color: Colors.red,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.error, color: Colors.white),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        appState.mapError!,
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: Colors.white),
                      onPressed: () => appState.clearMapError(),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    ),
  );
}
```

### Step 6: Test Flutter App

1. Build dan run Flutter app:

```bash
flutter clean
flutter pub get
flutter run
```

2. Test semua fitur:
   - [ ] Login
   - [ ] Registrasi
   - [ ] Peta menampilkan lokasi
   - [ ] Teman muncul
   - [ ] Request pertemanan
   - [ ] Chat
   - [ ] Settings sync

---

## ✅ Testing & Verification

### Test Checklist

#### Backend (Next.js + Supabase)

- [ ] **Database Setup**
  ```sql
  -- Run in Supabase SQL Editor
  SELECT * FROM public.profiles LIMIT 1;
  SELECT * FROM public.friendships LIMIT 1;
  SELECT * FROM public.messages LIMIT 1;
  ```

- [ ] **RPC Functions**
  ```sql
  -- Test with your user ID
  SELECT * FROM public.get_visible_users(
    'YOUR-USER-ID'::UUID,
    -6.2088,
    106.8456
  );
  ```

- [ ] **API Endpoints**
  ```bash
  # Test login
  curl -X POST https://zmayy.vercel.app/api/auth/mobile-login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}'
  
  # Test session (replace TOKEN)
  curl https://zmayy.vercel.app/api/auth/mobile-session \
    -H "Authorization: Bearer TOKEN"
  
  # Test map (replace TOKEN)
  curl "https://zmayy.vercel.app/api/map/visible?lat=-6.2088&lng=106.8456" \
    -H "Authorization: Bearer TOKEN"
  ```

#### Frontend (Flutter)

- [ ] **Login Flow**
  - Input email & password
  - Click login
  - Should navigate to home
  - Profile should show correct data

- [ ] **Map Feature**
  - Open map screen
  - Should request location permission
  - Should show your location
  - Should show nearby users (if any)

- [ ] **Friends Feature**
  - Open friends screen
  - Should show friends list
  - Should show pending requests
  - Can send friend request
  - Can accept/reject request

- [ ] **Chat Feature**
  - Open chat screen
  - Should show recent messages
  - Can send message
  - Message appears in list

- [ ] **Settings Feature**
  - Open settings
  - Change display name
  - Save
  - Logout and login again
  - Display name should persist

---

## 🔧 Troubleshooting

### Issue 1: "Peta tidak menampilkan lokasi"

**Symptoms:**
- Map loads but no markers
- Empty user list

**Diagnosis:**

1. Check ghost mode:
```sql
-- In Supabase SQL Editor
SELECT id, username, is_ghost_mode, last_lat, last_lng 
FROM profiles 
WHERE id = 'YOUR-USER-ID';
```

2. Check RPC function:
```sql
SELECT * FROM get_visible_users(
  'YOUR-USER-ID'::UUID,
  -6.2088,
  106.8456
);
```

**Solutions:**

```sql
-- Solution 1: Disable ghost mode
UPDATE profiles 
SET is_ghost_mode = FALSE 
WHERE id = 'YOUR-USER-ID';

-- Solution 2: Update location
UPDATE profiles 
SET last_lat = -6.2088, last_lng = 106.8456, updated_at = NOW()
WHERE id = 'YOUR-USER-ID';
```

---

### Issue 2: "401 Unauthorized"

**Symptoms:**
- All API calls return 401
- User gets logged out immediately

**Diagnosis:**

1. Check token in Flutter:
```dart
final token = await secureStorage.read(key: 'access_token');
print('Token: $token');
```

2. Test token with curl:
```bash
curl https://zmayy.vercel.app/api/auth/mobile-session \
  -H "Authorization: Bearer YOUR-TOKEN"
```

**Solutions:**

1. **Token expired** - Logout and login again
2. **Token not saved** - Check SecureStorage implementation
3. **Wrong token format** - Should be `Bearer <token>`, not just `<token>`

---

### Issue 3: "Registrasi gagal"

**Symptoms:**
- Registration returns error
- Email already exists

**Diagnosis:**

1. Check if email exists:
```sql
SELECT id, email FROM auth.users WHERE email = 'test@example.com';
```

2. Check Supabase auth settings:
   - Go to Authentication → Settings
   - Check "Enable email confirmations"

**Solutions:**

1. **Email exists** - Use different email or login instead
2. **Email confirmation required** - Check email for confirmation link
3. **Weak password** - Use stronger password (min 6 characters)

---

### Issue 4: "Teman tidak muncul"

**Symptoms:**
- Friends list empty
- Friend requests not showing

**Diagnosis:**

1. Check friendships table:
```sql
SELECT * FROM friendships 
WHERE requester_id = 'YOUR-USER-ID' 
   OR addressee_id = 'YOUR-USER-ID';
```

2. Test friends endpoint:
```bash
curl https://zmayy.vercel.app/api/friends \
  -H "Authorization: Bearer TOKEN"
```

**Solutions:**

1. **No friends in database** - Add friends from web or send friend request
2. **RLS blocking** - Check RLS policies are created
3. **Wrong endpoint** - Make sure using `/api/friends` not `/api/friend`

---

### Issue 5: "Pesan tidak muncul"

**Symptoms:**
- Chat history empty
- Messages not loading

**Diagnosis:**

1. Check messages table:
```sql
SELECT * FROM messages 
WHERE sender_id = 'YOUR-USER-ID' 
   OR receiver_id = 'YOUR-USER-ID'
ORDER BY created_at DESC
LIMIT 10;
```

2. Check message age:
```sql
SELECT 
  id, 
  content, 
  created_at,
  NOW() - created_at AS age
FROM messages 
WHERE sender_id = 'YOUR-USER-ID' 
   OR receiver_id = 'YOUR-USER-ID'
ORDER BY created_at DESC;
```

**Solutions:**

1. **Messages older than 3 hours** - Send new message
2. **No messages in database** - Send test message
3. **RLS blocking** - Check RLS policies

---

### Issue 6: "Settings tidak sync"

**Symptoms:**
- Changes in web not reflected in mobile
- Old data showing

**Diagnosis:**

1. Check profile in database:
```sql
SELECT * FROM profiles WHERE id = 'YOUR-USER-ID';
```

2. Check Flutter local storage:
```dart
final profile = await secureStorage.read(key: 'profile');
print('Cached profile: $profile');
```

**Solutions:**

1. **Not calling refresh** - Add `refreshProfileFromServer()` after login
2. **Cache outdated** - Clear app data and login again
3. **Wrong user ID** - Check token is for correct user

---

### Issue 7: "CORS Error"

**Symptoms:**
- Browser shows CORS error
- Mobile app works but web doesn't

**Diagnosis:**

Check browser console for error message.

**Solutions:**

1. **Wrong origin** - Add your domain to `ALLOWED_ORIGINS` in `mobile-rest.ts`
2. **Missing headers** - Check `buildCorsHeaders()` function
3. **Preflight failed** - Make sure OPTIONS handler exists

---

### Issue 8: "RPC Function Not Found"

**Symptoms:**
- Map returns error: "function does not exist"

**Diagnosis:**

```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_visible_users', 'get_nearby_users');
```

**Solutions:**

1. **Function not created** - Run `SUPABASE_SETUP_COMPLETE.sql` again
2. **Wrong function name** - Check endpoint uses correct name
3. **Permission denied** - Grant execute permission:

```sql
GRANT EXECUTE ON FUNCTION public.get_visible_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_users TO authenticated;
```

---

## 📞 Support & Resources

### Documentation

- **API Documentation:** `API_DOCUMENTATION_FOR_FLUTTER.md`
- **Database Setup:** `SUPABASE_SETUP_COMPLETE.sql`
- **Analysis:** `ANALISIS_ALUR_DATA_DAN_MASALAH.txt`

### Useful Links

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Flutter Docs:** https://flutter.dev/docs

### Debugging Tools

- **Supabase SQL Editor:** For database queries
- **Vercel Logs:** For backend errors
- **Flutter DevTools:** For mobile debugging
- **Postman:** For API testing
- **curl:** For quick endpoint tests

---

## ✅ Final Checklist

Before going to production:

### Backend
- [ ] Supabase project created
- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] RPC functions created
- [ ] Environment variables set in Vercel
- [ ] Deployed to Vercel
- [ ] All endpoints tested

### Frontend
- [ ] Base URL updated to Vercel URL
- [ ] Profile refresh implemented
- [ ] Error display added
- [ ] All features tested
- [ ] Token handling correct
- [ ] Location permission working

### Security
- [ ] RLS enabled on all tables
- [ ] Email confirmation enabled (production)
- [ ] Strong password policy
- [ ] HTTPS only
- [ ] Tokens stored securely

---

**Last Updated:** May 12, 2026  
**Version:** 2.0  
**Status:** Ready for Production ✅
