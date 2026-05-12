# 🔧 Perbaikan REST API untuk Integrasi Flutter

## 📋 Ringkasan Perbaikan

Dokumen ini merangkum perbaikan yang telah dilakukan pada REST API Next.js untuk mengatasi masalah integrasi dengan aplikasi Flutter.

---

## ✅ Masalah yang Telah Diperbaiki

### 1. ✅ Endpoint Update Profil (PATCH)

**Status:** ✅ **SELESAI**

**Endpoint Tersedia:**
- `PATCH /api/profile` (baru)
- `PATCH /api/profile/update` (sudah ada)

**Lokasi File:**
- `app/api/profile/route.ts` (baru)
- `app/api/profile/update/route.ts` (sudah ada)

**Cara Kerja:**
1. Ekstrak `userId` dari header `x-user-id` (diset oleh proxy setelah verifikasi JWT)
2. Verifikasi token Bearer dari header `Authorization`
3. Ambil payload JSON dari body request
4. Update tabel `profiles` di Supabase berdasarkan `id = userId`
5. Return respons JSON sukses dengan profil yang telah diupdate

**Request Format:**
```http
PATCH /api/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "username": "john_doe",
  "display_name": "John Doe",
  "avatar_initials": "JD",
  "is_ghost_mode": false,
  "is_public": true,
  "notify_global": true,
  "notify_requests": true,
  "notify_messages": true,
  "notify_sound": true
}
```

**Response Format:**
```json
{
  "profile": {
    "id": "uuid",
    "username": "john_doe",
    "display_name": "John Doe",
    "avatar_initials": "JD",
    "last_lat": null,
    "last_lng": null,
    "updated_at": "2026-05-13T10:30:00Z",
    "is_ghost_mode": false,
    "notifications_enabled": true,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true,
    "created_at": "2026-05-01T08:00:00Z"
  }
}
```

**Catatan Penting:**
- Semua field bersifat opsional - hanya field yang dikirim yang akan diupdate
- Field string akan di-trim dan dikonversi ke `null` jika kosong
- Field boolean akan dikonversi ke `true`/`false`
- Endpoint akan return error 400 jika tidak ada field valid yang dikirim

---

### 2. ✅ Perbaikan Kueri Relasi Pertemanan

**Status:** ✅ **SELESAI**

**Endpoint:** `GET /api/friends`

**Lokasi File:** `app/api/friends/route.ts`

**Masalah Sebelumnya:**
- Error HTTP 500 karena ambiguitas foreign key saat join dari `friendships` ke `profiles`
- Query menggunakan `.or()` yang menyebabkan Supabase bingung menentukan jalur foreign key

**Solusi yang Diterapkan:**
Memisahkan query menjadi dua jalur eksplisit:

1. **Jalur 1:** User sebagai `addressee` (penerima request)
   ```typescript
   const { data: asAddressee } = await supabase
     .from('friendships')
     .select('requester_id, requester:profiles!friendships_requester_id_fkey(*)')
     .eq('status', 'accepted')
     .eq('addressee_id', userId);
   ```

2. **Jalur 2:** User sebagai `requester` (pengirim request)
   ```typescript
   const { data: asRequester } = await supabase
     .from('friendships')
     .select('addressee_id, addressee:profiles!friendships_addressee_id_fkey(*)')
     .eq('status', 'accepted')
     .eq('requester_id', userId);
   ```

3. **Merge & Deduplikasi:** Gabungkan hasil dari kedua query dan hapus duplikat berdasarkan `profile.id`

**Request Format:**
```http
GET /api/friends
Authorization: Bearer <jwt_token>
```

**Response Format:**
```json
[
  {
    "id": "uuid-1",
    "username": "friend1",
    "display_name": "Friend One",
    "avatar_initials": "F1",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "updated_at": "2026-05-13T10:25:00Z",
    "is_ghost_mode": false,
    "notifications_enabled": true,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true,
    "created_at": "2026-05-01T08:00:00Z"
  },
  {
    "id": "uuid-2",
    "username": "friend2",
    "display_name": "Friend Two",
    "avatar_initials": "F2",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "updated_at": "2026-05-13T10:20:00Z",
    "is_ghost_mode": false,
    "notifications_enabled": true,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true,
    "created_at": "2026-05-01T08:00:00Z"
  }
]
```

**Perbaikan yang Sama Diterapkan pada:**
- `GET /api/friends/requests` - sudah menggunakan pola yang benar

---

### 3. ✅ Validasi Parameter URL di Endpoint Peta

**Status:** ✅ **SUDAH BAIK**

**Endpoint:** `GET /api/map/visible`

**Lokasi File:** `app/api/map/visible/route.ts`

**Validasi yang Sudah Ada:**
1. ✅ Ekstraksi parameter `lat` dan `lng` dari `request.nextUrl.searchParams`
2. ✅ Konversi ke number dengan fungsi `toNumberOrNull()` yang aman
3. ✅ Validasi bahwa parameter bukan `null`, `NaN`, atau `Infinity`
4. ✅ Validasi rentang geografis:
   - Latitude: -90 hingga 90
   - Longitude: -180 hingga 180
5. ✅ Error handling yang jelas dengan pesan error deskriptif

**Request Format:**
```http
GET /api/map/visible?lat=-6.2088&lng=106.8456
Authorization: Bearer <jwt_token>
```

**Response Format:**
```json
[
  {
    "id": "uuid",
    "username": "nearby_user",
    "display_name": "Nearby User",
    "avatar_initials": "NU",
    "last_lat": -6.2090,
    "last_lng": 106.8458,
    "updated_at": "2026-05-13T10:30:00Z",
    "relation_type": "friend",
    "is_friend": true,
    "is_online": true,
    "last_seen_label": "Online sekarang",
    "distance_km": 0.25
  }
]
```

**Catatan:**
- Hanya mengembalikan user dalam radius 1km
- Filter otomatis untuk user dengan koordinat valid
- Menghitung jarak menggunakan formula Haversine

---

## 🔐 Autentikasi & Keamanan

Semua endpoint yang diperbaiki menggunakan sistem keamanan berlapis:

### 1. Proxy Layer (proxy.ts)
- Verifikasi JWT token dari header `Authorization`
- Set header internal `x-user-id` setelah verifikasi berhasil
- Sanitasi header untuk mencegah spoofing

### 2. Handler Layer
- Ekstrak `userId` dari header `x-user-id`
- Verifikasi ulang token Bearer untuk operasi sensitif (update, delete)
- Validasi bahwa `userId` dari header cocok dengan `userId` dari token

### 3. Database Layer (Supabase RLS)
- Row Level Security policies memastikan user hanya bisa akses data mereka sendiri
- Foreign key constraints menjaga integritas relasi

---

## 📝 Checklist untuk Flutter Developer

### Endpoint Update Profil
- [ ] Test `PATCH /api/profile` dengan semua field
- [ ] Test `PATCH /api/profile` dengan field parsial
- [ ] Test `PATCH /api/profile` dengan field kosong (harus return 400)
- [ ] Verifikasi bahwa perubahan tersimpan di database
- [ ] Test error handling untuk token invalid

### Endpoint Daftar Teman
- [ ] Test `GET /api/friends` dengan user yang punya teman
- [ ] Test `GET /api/friends` dengan user tanpa teman (harus return array kosong)
- [ ] Verifikasi tidak ada duplikat dalam response
- [ ] Verifikasi semua field profil teman lengkap
- [ ] Test error handling untuk token invalid

### Endpoint Peta
- [ ] Test `GET /api/map/visible` dengan koordinat valid
- [ ] Test `GET /api/map/visible` tanpa parameter (harus return 400)
- [ ] Test `GET /api/map/visible` dengan koordinat invalid (harus return 400)
- [ ] Verifikasi hanya user dalam radius 1km yang dikembalikan
- [ ] Verifikasi field `distance_km` akurat

---

## 🐛 Troubleshooting

### Error 401 Unauthorized
**Penyebab:**
- Token JWT tidak valid atau expired
- Header `Authorization` tidak ada atau format salah
- Header `x-user-id` tidak diset oleh proxy

**Solusi:**
1. Pastikan format header: `Authorization: Bearer <token>`
2. Pastikan token belum expired (cek dengan decode JWT)
3. Pastikan request melalui proxy yang benar

### Error 400 Bad Request
**Penyebab:**
- Parameter required tidak ada
- Format data tidak sesuai
- Validasi gagal

**Solusi:**
1. Cek format request body/query params
2. Pastikan tipe data sesuai (string, number, boolean)
3. Baca pesan error untuk detail spesifik

### Error 500 Internal Server Error
**Penyebab:**
- Database error
- Bug di server code
- Supabase RLS policy menolak akses

**Solusi:**
1. Cek log server untuk detail error
2. Verifikasi Supabase RLS policies
3. Pastikan foreign key relationships benar

---

## 📚 Referensi Tambahan

- **API Documentation:** `API_DOCUMENTATION_FOR_FLUTTER.md`
- **Flutter Implementation Guide:** `FLUTTER_IMPLEMENTATION_GUIDE.md`
- **Testing Guide:** `TESTING_GUIDE.md`
- **Troubleshooting:** `TROUBLESHOOTING_LOCATION.md`

---

## ✨ Perubahan File

### File yang Dimodifikasi:
1. `app/api/friends/route.ts` - Perbaikan query relasi pertemanan

### File yang Dibuat:
1. `app/api/profile/route.ts` - Endpoint alternatif untuk GET dan PATCH profil

### File yang Sudah Baik (Tidak Perlu Diubah):
1. `app/api/profile/update/route.ts` - Sudah lengkap dan fungsional
2. `app/api/map/visible/route.ts` - Validasi parameter sudah sempurna
3. `app/api/friends/requests/route.ts` - Query sudah menggunakan pola yang benar

---

## 🎯 Kesimpulan

Semua masalah integrasi REST API untuk Flutter telah diperbaiki:

1. ✅ **Endpoint update profil** - Tersedia di `/api/profile` dan `/api/profile/update`
2. ✅ **Query relasi pertemanan** - Diperbaiki dengan pemisahan jalur foreign key
3. ✅ **Validasi parameter peta** - Sudah sempurna dengan validasi geografis

API sekarang siap untuk dikonsumsi oleh aplikasi Flutter dengan error handling yang robust dan response format yang konsisten.
