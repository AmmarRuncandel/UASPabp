# 🗺️ Zmayy - Location-Based Social Network

Zmayy adalah aplikasi social network berbasis lokasi yang memungkinkan pengguna untuk:
- 📍 Melihat teman dan orang terdekat di peta
- 💬 Chat dengan teman
- 👥 Menambah dan mengelola pertemanan
- 🔒 Kontrol privasi dengan ghost mode

## 🏗️ Arsitektur

```
Flutter Mobile App → Next.js REST API → Supabase PostgreSQL
```

- **Frontend:** Flutter (Mobile)
- **Backend:** Next.js 16 (REST API)
- **Database:** Supabase (PostgreSQL + RLS)
- **Deployment:** Vercel (Backend)

---

## 📚 Dokumentasi Lengkap

### 🚀 Quick Start

1. **[PERBAIKAN_LOKASI_FINAL.md](./PERBAIKAN_LOKASI_FINAL.md)** ⭐ **BACA INI JIKA LOKASI TIDAK MUNCUL**
   - Fix untuk masalah view lokasi yang tidak berfungsi
   - Step-by-step perbaikan database
   - Testing & verification

2. **[RINGKASAN_PERBAIKAN_FINAL.md](./RINGKASAN_PERBAIKAN_FINAL.md)** ⭐ **UNTUK FLUTTER DEVELOPER**
   - Ringkasan lengkap semua perbaikan (Bahasa Indonesia)
   - Langkah deploy ringkas
   - Quick test commands

3. **[QUICK_FIX_SUMMARY.md](./QUICK_FIX_SUMMARY.md)**
   - Summary cepat masalah & solusi
   - Quick reference untuk troubleshooting

### 📖 Deployment & Setup

4. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** ⭐ **PENTING**
   - Step-by-step deployment ke Vercel
   - Setup Supabase lengkap
   - Konfigurasi Flutter
   - Troubleshooting guide

5. **[SUPABASE_FIX_LOCATION.sql](./SUPABASE_FIX_LOCATION.sql)** ⭐ **WAJIB DIJALANKAN**
   - Script fix database untuk masalah lokasi
   - Auto-add missing columns
   - Create RPC functions
   - Setup RLS policies

6. **[SUPABASE_SETUP_COMPLETE.sql](./SUPABASE_SETUP_COMPLETE.sql)**
   - Script setup database lengkap (fresh install)
   - Create tables, indexes, RLS policies
   - Create RPC functions
   - Verification queries

### 💻 Development

7. **[API_DOCUMENTATION_FOR_FLUTTER.md](./API_DOCUMENTATION_FOR_FLUTTER.md)** ⭐ **UNTUK FLUTTER DEV**
   - Dokumentasi lengkap 13 REST API endpoints
   - Request/response examples
   - Error handling
   - Common issues & solutions
   - Best practices

8. **[FLUTTER_IMPLEMENTATION_GUIDE.md](./FLUTTER_IMPLEMENTATION_GUIDE.md)** ⭐ **UNTUK FLUTTER DEV**
   - Panduan implementasi lengkap
   - Contoh kode untuk setiap perubahan
   - Testing checklist

9. **[FLUTTER_LOCATION_SYNC.md](./FLUTTER_LOCATION_SYNC.md)** ⭐ **UNTUK FLUTTER DEV**
   - Panduan sync lokasi antara Flutter dan Web
   - Konsistensi struktur data
   - Implementation examples

### ✅ Testing & Verification

10. **[VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)**
    - Checklist verifikasi lengkap
    - Test semua endpoint
    - Test semua fitur
    - Performance & security checks

11. **[TROUBLESHOOTING_LOCATION.md](./TROUBLESHOOTING_LOCATION.md)** ⭐ **JIKA ADA MASALAH**
    - Troubleshooting untuk masalah lokasi
    - Root cause analysis
    - Step-by-step fixes
    - Common errors & solutions

### 📊 Analysis (Historical)

12. **[ANALISIS_ALUR_DATA_DAN_MASALAH.txt](./ANALISIS_ALUR_DATA_DAN_MASALAH.txt)**
    - Analisis detail masalah original
    - Root cause analysis
    - Rekomendasi perbaikan

13. **[RINGKASAN_ANALISIS_MASALAH.txt](./RINGKASAN_ANALISIS_MASALAH.txt)**
    - Ringkasan analisis masalah

---

## 🎯 Status Perbaikan

| Masalah | Status | Solusi |
|---------|--------|--------|
| Login berhasil | ✅ OK | No changes needed |
| Peta tidak tampil | ✅ FIXED | RPC fallback + ghost mode check |
| Teman tidak muncul | ✅ FIXED | Endpoints ready |
| Request tidak muncul | ✅ FIXED | Endpoints ready |
| Pesan tidak muncul | ✅ FIXED | Endpoints ready |
| Settings tidak sync | ✅ FIXED | Profile refresh added |
| Registrasi gagal | ✅ FIXED | Email confirmation handling |

**Overall Status:** ✅ READY FOR DEPLOYMENT

---

## 🚀 Quick Deploy

### 1. Setup Supabase (15 menit)

```bash
1. Login ke https://supabase.com
2. Create new project
3. Copy URL dan anon key
4. Run SUPABASE_SETUP_COMPLETE.sql di SQL Editor
```

### 2. Deploy Next.js ke Vercel (10 menit)

```bash
# Commit changes
git add .
git commit -m "Ready for deployment"
git push

# Deploy to Vercel
1. Login ke https://vercel.com
2. Import repository
3. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Deploy
```

### 3. Update Flutter (30 menit)

```dart
// Update base URL
const String baseUrl = 'https://zmayy.vercel.app';

// Add profile refresh
await refreshProfileFromServer();

// Add error display
// See FLUTTER_IMPLEMENTATION_GUIDE.md
```

**Total Time: ~75 menit**

---

## 📋 API Endpoints

### Authentication
- `POST /api/auth/mobile-login` - Login
- `POST /api/auth/mobile-register` - Register
- `GET /api/auth/mobile-session` - Get current profile

### Profile
- `PATCH /api/profile/update` - Update profile

### Map
- `GET /api/map/visible?lat=X&lng=Y` - Get nearby users
- `POST /api/map/update-location` - Update location

### Friends
- `GET /api/friends` - Get friends list
- `GET /api/friends/requests` - Get pending requests
- `POST /api/friends/send` - Send friend request
- `POST /api/friends/accept` - Accept request
- `POST /api/friends/reject` - Reject request

### Chat
- `GET /api/chat/history` - Get messages (last 3 hours)
- `POST /api/chat/send` - Send message

**Total: 13 endpoints - ALL WORKING ✅**

---

## 🧪 Quick Test

```bash
# Test login
curl -X POST https://zmayy.vercel.app/api/auth/mobile-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test session (replace YOUR-TOKEN)
curl https://zmayy.vercel.app/api/auth/mobile-session \
  -H "Authorization: Bearer YOUR-TOKEN"

# Test map
curl "https://zmayy.vercel.app/api/map/visible?lat=-6.2088&lng=106.8456" \
  -H "Authorization: Bearer YOUR-TOKEN"
```

---

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 🏗️ Project Structure

```
├── app/
│   ├── api/                    # REST API endpoints
│   │   ├── auth/              # Authentication
│   │   ├── profile/           # Profile management
│   │   ├── map/               # Map & location
│   │   ├── friends/           # Friends management
│   │   ├── chat/              # Chat messaging
│   │   └── _lib/              # Shared utilities
│   ├── components/            # React components
│   └── ...
├── utils/
│   └── supabase/              # Supabase client & types
├── public/                    # Static assets
├── proxy.ts                   # Auth middleware
└── Documentation files        # See list above
```

---

## 🔒 Security

- ✅ JWT token authentication
- ✅ Row Level Security (RLS) di Supabase
- ✅ CORS configuration
- ✅ Header sanitization
- ✅ Input validation
- ✅ HTTPS enforced

---

## 📞 Support

### Dokumentasi:
- **API:** `API_DOCUMENTATION_FOR_FLUTTER.md`
- **Deployment:** `DEPLOYMENT_GUIDE.md`
- **Flutter:** `FLUTTER_IMPLEMENTATION_GUIDE.md`
- **Testing:** `VERIFICATION_CHECKLIST.md`

### Quick Checks:
- **Backend:** Check Vercel logs
- **Database:** Check Supabase logs
- **Frontend:** Check Flutter console

---

## 📝 License

This project is private and proprietary.

---

## 👥 Team

- **Backend:** Next.js + Supabase
- **Frontend:** Flutter
- **AI Assistant:** Kiro (Documentation & Fixes)

---

**Last Updated:** May 12, 2026  
**Version:** 2.0  
**Status:** ✅ Ready for Production

**Selamat deploy! 🚀**
