# 📱 Zmayy REST API Documentation for Flutter

**Base URL (Production):** `https://zmayy.vercel.app`  
**Base URL (Development):** `http://localhost:3000`

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```dart
headers: {
  'Authorization': 'Bearer $accessToken',
  'Content-Type': 'application/json',
}
```

---

## 📋 Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Profile Endpoints](#profile-endpoints)
3. [Map/Location Endpoints](#maplocation-endpoints)
4. [Friends Endpoints](#friends-endpoints)
5. [Chat Endpoints](#chat-endpoints)
6. [Error Handling](#error-handling)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## 🔑 Authentication Endpoints

### 1. Register New User

**Endpoint:** `POST /api/auth/mobile-register`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (201):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_at": 1234567890,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "profile": {
    "id": "uuid",
    "username": "user",
    "display_name": "user",
    "avatar_initials": "US",
    "last_lat": null,
    "last_lng": null,
    "is_ghost_mode": false,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true
  }
}
```

**Email Confirmation Response (201):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "profile": { ... },
  "requires_confirmation": true,
  "message": "Account created. Please confirm your email before logging in."
}
```

**Error Response (400):**
```json
{
  "error": "Email and password are required."
}
```

---

### 2. Login

**Endpoint:** `POST /api/auth/mobile-login`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_at": 1234567890,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "profile": {
    "id": "uuid",
    "username": "user",
    "display_name": "User Name",
    "avatar_initials": "UN",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "updated_at": "2026-05-12T10:30:00Z",
    "is_ghost_mode": false,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid login credentials."
}
```

---

### 3. Validate Session & Get Current Profile

**Endpoint:** `GET /api/auth/mobile-session`  
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "user_id": "uuid",
  "profile": {
    "id": "uuid",
    "username": "user",
    "display_name": "User Name",
    "avatar_initials": "UN",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "updated_at": "2026-05-12T10:30:00Z",
    "is_ghost_mode": false,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true
  },
  "session_valid": true
}
```

**⚠️ IMPORTANT:** Call this endpoint after login to get the latest profile data from server, not just from local storage!

---

## 👤 Profile Endpoints

### 4. Update Profile

**Endpoint:** `PATCH /api/profile/update`  
**Auth Required:** Yes

**Request Body (all fields optional):**
```json
{
  "username": "newusername",
  "display_name": "New Display Name",
  "avatar_initials": "ND",
  "is_ghost_mode": false,
  "is_public": true,
  "notify_global": true,
  "notify_requests": true,
  "notify_messages": true,
  "notify_sound": true
}
```

**Success Response (200):**
```json
{
  "profile": {
    "id": "uuid",
    "username": "newusername",
    "display_name": "New Display Name",
    "avatar_initials": "ND",
    "last_lat": -6.2088,
    "last_lng": 106.8456,
    "updated_at": "2026-05-12T10:35:00Z",
    "is_ghost_mode": false,
    "is_public": true,
    "notify_global": true,
    "notify_requests": true,
    "notify_messages": true,
    "notify_sound": true
  }
}
```

**Error Response (400):**
```json
{
  "error": "No valid fields to update."
}
```

---

## 🗺️ Map/Location Endpoints

### 5. Update Current Location

**Endpoint:** `POST /api/map/update-location`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "lat": -6.2088,
  "lng": 106.8456
}
```

**Success Response (200):**
```json
{
  "success": true,
  "lat": -6.2088,
  "lng": 106.8456
}
```

**Error Response (400):**
```json
{
  "error": "Latitude must be between -90 and 90."
}
```

---

### 6. Get Visible Users (Friends + Nearby Public Users)

**Endpoint:** `GET /api/map/visible?lat={lat}&lng={lng}`  
**Auth Required:** Yes

**Query Parameters:**
- `lat` (required): Current latitude (-90 to 90)
- `lng` (required): Current longitude (-180 to 180)

**Example Request:**
```
GET /api/map/visible?lat=-6.2088&lng=106.8456
```

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "username": "friend1",
    "display_name": "Friend One",
    "avatar_initials": "FO",
    "last_lat": -6.2090,
    "last_lng": 106.8460,
    "updated_at": "2026-05-12T10:30:00Z",
    "relation_type": "friend",
    "is_friend": true,
    "is_online": true,
    "last_seen_label": "Online sekarang",
    "distance_km": 0.05
  },
  {
    "id": "uuid2",
    "username": "stranger1",
    "display_name": "Public User",
    "avatar_initials": "PU",
    "last_lat": -6.2095,
    "last_lng": 106.8465,
    "updated_at": "2026-05-12T10:25:00Z",
    "relation_type": "stranger",
    "is_friend": false,
    "is_online": false,
    "last_seen_label": "Terakhir aktif 5 menit lalu",
    "distance_km": 0.8
  }
]
```

**⚠️ IMPORTANT NOTES:**
1. Only returns users within **1 km** radius
2. Returns **all friends** regardless of distance
3. Returns **public strangers** within 1 km only
4. If `is_ghost_mode = true` in your profile, this endpoint will return empty array
5. Requires valid coordinates in query parameters

---

## 👥 Friends Endpoints

### 7. Get Friends List

**Endpoint:** `GET /api/friends`  
**Auth Required:** Yes

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "username": "friend1",
    "display_name": "Friend One",
    "avatar_initials": "FO",
    "last_lat": -6.2090,
    "last_lng": 106.8460,
    "updated_at": "2026-05-12T10:30:00Z",
    "is_ghost_mode": false,
    "is_public": true
  },
  {
    "id": "uuid2",
    "username": "friend2",
    "display_name": "Friend Two",
    "avatar_initials": "FT",
    "last_lat": -6.3000,
    "last_lng": 106.9000,
    "updated_at": "2026-05-12T09:00:00Z",
    "is_ghost_mode": false,
    "is_public": true
  }
]
```

---

### 8. Get Pending Friend Requests

**Endpoint:** `GET /api/friends/requests`  
**Auth Required:** Yes

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "username": "requester1",
    "display_name": "Requester One",
    "avatar_initials": "RO",
    "last_lat": -6.2100,
    "last_lng": 106.8500,
    "updated_at": "2026-05-12T10:00:00Z",
    "is_ghost_mode": false,
    "is_public": true
  }
]
```

---

### 9. Send Friend Request

**Endpoint:** `POST /api/friends/send`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "addressee_id": "uuid-of-user-to-add"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "friendship": {
    "id": "friendship-uuid",
    "requester_id": "your-uuid",
    "addressee_id": "their-uuid",
    "status": "pending",
    "created_at": "2026-05-12T10:40:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Already friends with this user."
}
```

**Error Response (400):**
```json
{
  "error": "Friend request already sent."
}
```

---

### 10. Accept Friend Request

**Endpoint:** `POST /api/friends/accept`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "requester_id": "uuid-of-requester"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

### 11. Reject Friend Request

**Endpoint:** `POST /api/friends/reject`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "requester_id": "uuid-of-requester"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

## 💬 Chat Endpoints

### 12. Get Chat History

**Endpoint:** `GET /api/chat/history`  
**Auth Required:** Yes

**Success Response (200):**
```json
[
  {
    "id": "message-uuid",
    "sender_id": "sender-uuid",
    "content": "Hello!",
    "created_at": "2026-05-12T10:30:00Z",
    "sender_profile": {
      "id": "sender-uuid",
      "username": "sender",
      "display_name": "Sender Name",
      "avatar_initials": "SN"
    },
    "is_mine": false
  },
  {
    "id": "message-uuid-2",
    "sender_id": "your-uuid",
    "content": "Hi there!",
    "created_at": "2026-05-12T10:31:00Z",
    "sender_profile": {
      "id": "your-uuid",
      "username": "you",
      "display_name": "Your Name",
      "avatar_initials": "YN"
    },
    "is_mine": true
  }
]
```

**⚠️ IMPORTANT NOTES:**
1. Only returns messages from **last 3 hours**
2. Returns maximum **10 most recent messages**
3. Includes messages you sent OR received
4. `is_mine` indicates if you are the sender

---

### 13. Send Message

**Endpoint:** `POST /api/chat/send`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "receiver_id": "uuid-of-receiver",
  "content": "Hello, how are you?"
}
```

**Success Response (200):**
```json
{
  "id": "message-uuid",
  "sender_id": "your-uuid",
  "receiver_id": "receiver-uuid",
  "content": "Hello, how are you?",
  "created_at": "2026-05-12T10:45:00Z"
}
```

**Error Response (400):**
```json
{
  "error": "receiver_id and content are required."
}
```

---

## ⚠️ Error Handling

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes:

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - Access denied (RLS policy)
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

### Example Error Handling in Flutter:

```dart
try {
  final response = await http.get(
    Uri.parse('$baseUrl/api/auth/mobile-session'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    // Handle success
  } else if (response.statusCode == 401) {
    // Token expired or invalid - redirect to login
    final error = jsonDecode(response.body);
    print('Auth error: ${error['error']}');
    // Navigate to login screen
  } else {
    // Other errors
    final error = jsonDecode(response.body);
    print('Error: ${error['error']}');
    // Show error to user
  }
} catch (e) {
  print('Network error: $e');
  // Handle network errors
}
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Peta tidak menampilkan lokasi"

**Possible Causes:**
1. ✅ **Ghost mode is enabled** - Check `is_ghost_mode` in profile
2. ✅ **No location permission** - Request location permission in Flutter
3. ✅ **Location not updated** - Call `/api/map/update-location` first
4. ✅ **RPC function not found** - Check Supabase database for `get_visible_users` or `get_nearby_users` function

**Solution:**
```dart
// 1. Check ghost mode
final session = await getSession();
if (session.profile.isGhostMode) {
  // Disable ghost mode
  await updateProfile({'is_ghost_mode': false});
}

// 2. Update location first
await updateLocation(lat, lng);

// 3. Then fetch visible users
final users = await getVisibleUsers(lat, lng);
```

---

### Issue 2: "Teman tidak muncul"

**Possible Causes:**
1. ✅ **No friends in database** - Check friendships table
2. ✅ **Friend requests not accepted** - Check pending requests
3. ✅ **RLS policy blocking** - Check Supabase RLS policies

**Solution:**
```dart
// Check if you have friends
final friends = await getFriends();
print('Friends count: ${friends.length}');

// Check pending requests
final requests = await getFriendRequests();
print('Pending requests: ${requests.length}');
```

---

### Issue 3: "Pesan tidak muncul"

**Possible Causes:**
1. ✅ **Messages older than 3 hours** - Only last 3 hours shown
2. ✅ **No messages in database** - Send a test message
3. ✅ **RLS policy blocking** - Check Supabase RLS policies

**Solution:**
```dart
// Send a test message
await sendMessage(friendId, 'Test message');

// Wait a moment
await Future.delayed(Duration(seconds: 1));

// Fetch history
final messages = await getChatHistory();
print('Messages count: ${messages.length}');
```

---

### Issue 4: "Settings tidak sync dengan web"

**Possible Causes:**
1. ✅ **Profile not refreshed from server** - Only reading from local storage
2. ✅ **Cache outdated** - Need to call `/api/auth/mobile-session`

**Solution:**
```dart
// After login, ALWAYS refresh profile from server
await login(email, password);

// DON'T just load from local storage
// await loadProfileFromStorage(); // ❌ WRONG

// DO refresh from server
await refreshProfileFromServer(); // ✅ CORRECT

// Implementation:
Future<void> refreshProfileFromServer() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/auth/mobile-session'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    final profile = data['profile'];
    
    // Update local storage
    await saveProfileToStorage(profile);
    
    // Update app state
    setState(() {
      currentProfile = profile;
    });
  }
}
```

---

### Issue 5: "Registrasi gagal"

**Possible Causes:**
1. ✅ **Email already exists** - User already registered
2. ✅ **Email confirmation required** - Supabase requires email verification
3. ✅ **Weak password** - Password doesn't meet requirements

**Solution:**
```dart
final response = await register(email, password);

if (response.containsKey('requires_confirmation')) {
  // Email confirmation required
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Konfirmasi Email'),
      content: Text('Silakan cek email Anda untuk mengkonfirmasi akun.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('OK'),
        ),
      ],
    ),
  );
} else if (response.containsKey('access_token')) {
  // Registration successful, auto-login
  await saveToken(response['access_token']);
  await saveProfile(response['profile']);
  // Navigate to home
}
```

---

## 📝 Best Practices

### 1. Token Management

```dart
// Save token securely
await secureStorage.write(key: 'access_token', value: token);

// Always include token in requests
final headers = {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
};

// Handle token expiration
if (response.statusCode == 401) {
  // Token expired - redirect to login
  await clearToken();
  Navigator.pushReplacementNamed(context, '/login');
}
```

### 2. Profile Sync

```dart
// After login
await login(email, password);
await refreshProfileFromServer(); // ✅ Always refresh

// After updating profile
await updateProfile(data);
await refreshProfileFromServer(); // ✅ Get latest data

// On app start
await loadProfileFromStorage(); // Load cached data first
await refreshProfileFromServer(); // Then refresh from server
```

### 3. Location Updates

```dart
// Update location periodically
Timer.periodic(Duration(seconds: 30), (timer) async {
  final position = await Geolocator.getCurrentPosition();
  await updateLocation(position.latitude, position.longitude);
});

// Update location before fetching visible users
await updateLocation(lat, lng);
final users = await getVisibleUsers(lat, lng);
```

### 4. Error Display

```dart
// Show errors to user
void showError(String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: Colors.red,
      duration: Duration(seconds: 3),
    ),
  );
}

// Use in API calls
try {
  final result = await apiCall();
  // Handle success
} catch (e) {
  showError('Terjadi kesalahan: $e');
}
```

---

## 🚀 Quick Start Checklist

After deploying to Vercel, follow these steps:

### Backend (Next.js) Checklist:

- [x] ✅ Deploy to Vercel
- [ ] ✅ Set environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] ✅ Check Supabase RLS policies are enabled
- [ ] ✅ Create RPC function `get_visible_users` or `get_nearby_users` in Supabase
- [ ] ✅ Test endpoints with Postman/curl

### Flutter Checklist:

- [ ] ✅ Update base URL to Vercel URL
- [ ] ✅ Implement `refreshProfileFromServer()` method
- [ ] ✅ Call refresh after login
- [ ] ✅ Add error display in UI (SnackBar)
- [ ] ✅ Test all endpoints
- [ ] ✅ Handle token expiration
- [ ] ✅ Add loading indicators

---

## 📞 Support

If you encounter issues:

1. Check this documentation first
2. Check Vercel deployment logs
3. Check Supabase logs
4. Check Flutter console for errors
5. Test endpoints with Postman/curl

---

**Last Updated:** May 12, 2026  
**API Version:** 2.0  
**Next.js Version:** 16  
**Supabase:** PostgreSQL with RLS
