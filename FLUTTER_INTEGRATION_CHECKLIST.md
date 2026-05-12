# ✅ Flutter Integration Checklist

## 📋 Pre-Integration Verification

### Server-Side Checks

- [x] **Profile Update Endpoint**
  - [x] `PATCH /api/profile` endpoint created
  - [x] `PATCH /api/profile/update` endpoint verified
  - [x] Authentication flow implemented
  - [x] Field validation working
  - [x] Response normalization applied
  - [x] No TypeScript errors

- [x] **Friends List Endpoint**
  - [x] Foreign key ambiguity resolved
  - [x] Separate queries for requester/addressee paths
  - [x] Deduplication logic implemented
  - [x] Response normalization applied
  - [x] No TypeScript errors

- [x] **Map Visibility Endpoint**
  - [x] Parameter extraction validated
  - [x] Numeric conversion with null safety
  - [x] Geographic bounds validation
  - [x] RPC call with validated parameters
  - [x] No TypeScript errors

---

## 🧪 Testing Checklist

### 1. Profile Update Tests

#### Test Case 1.1: Full Profile Update
```bash
curl -X PATCH https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "display_name": "Test User",
    "avatar_initials": "TU",
    "is_ghost_mode": false,
    "is_public": true
  }'
```
- [ ] Returns 200 status
- [ ] Response contains updated profile
- [ ] Database reflects changes
- [ ] All fields properly saved

#### Test Case 1.2: Partial Profile Update
```bash
curl -X PATCH https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "New Display Name"
  }'
```
- [ ] Returns 200 status
- [ ] Only display_name updated
- [ ] Other fields unchanged
- [ ] Database reflects changes

#### Test Case 1.3: Empty Update Request
```bash
curl -X PATCH https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- [ ] Returns 400 status
- [ ] Error message: "No valid fields to update."
- [ ] Database unchanged

#### Test Case 1.4: Invalid Token
```bash
curl -X PATCH https://your-domain.com/api/profile \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "test"}'
```
- [ ] Returns 401 status
- [ ] Error message about invalid token
- [ ] Database unchanged

#### Test Case 1.5: Missing Token
```bash
curl -X PATCH https://your-domain.com/api/profile \
  -H "Content-Type: application/json" \
  -d '{"username": "test"}'
```
- [ ] Returns 401 status
- [ ] Error message about missing token
- [ ] Database unchanged

---

### 2. Friends List Tests

#### Test Case 2.1: Get Friends List (User with Friends)
```bash
curl -X GET https://your-domain.com/api/friends \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 200 status
- [ ] Response is array of profiles
- [ ] No duplicate profiles
- [ ] All profiles have required fields
- [ ] Friend count matches database

#### Test Case 2.2: Get Friends List (User without Friends)
```bash
curl -X GET https://your-domain.com/api/friends \
  -H "Authorization: Bearer NEW_USER_TOKEN"
```
- [ ] Returns 200 status
- [ ] Response is empty array `[]`
- [ ] No errors thrown

#### Test Case 2.3: Bidirectional Friendship
Setup: User A and User B are friends (A requested, B accepted)
```bash
# As User A
curl -X GET https://your-domain.com/api/friends \
  -H "Authorization: Bearer USER_A_TOKEN"

# As User B
curl -X GET https://your-domain.com/api/friends \
  -H "Authorization: Bearer USER_B_TOKEN"
```
- [ ] User A sees User B in friends list
- [ ] User B sees User A in friends list
- [ ] No duplicates in either list
- [ ] Profile data consistent

#### Test Case 2.4: Invalid Token
```bash
curl -X GET https://your-domain.com/api/friends \
  -H "Authorization: Bearer INVALID_TOKEN"
```
- [ ] Returns 401 status
- [ ] Error message about invalid token

---

### 3. Map Visibility Tests

#### Test Case 3.1: Valid Coordinates
```bash
curl -X GET "https://your-domain.com/api/map/visible?lat=-6.2088&lng=106.8456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 200 status
- [ ] Response is array of visible users
- [ ] All users within 1km radius
- [ ] `distance_km` field present and accurate
- [ ] `is_online` and `last_seen_label` present

#### Test Case 3.2: Missing Parameters
```bash
curl -X GET "https://your-domain.com/api/map/visible" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 400 status
- [ ] Error message about missing parameters

#### Test Case 3.3: Invalid Latitude
```bash
curl -X GET "https://your-domain.com/api/map/visible?lat=100&lng=106.8456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 400 status
- [ ] Error message: "Latitude must be between -90 and 90"

#### Test Case 3.4: Invalid Longitude
```bash
curl -X GET "https://your-domain.com/api/map/visible?lat=-6.2088&lng=200" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 400 status
- [ ] Error message: "Longitude must be between -180 and 180"

#### Test Case 3.5: Non-Numeric Parameters
```bash
curl -X GET "https://your-domain.com/api/map/visible?lat=abc&lng=def" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 400 status
- [ ] Error message about invalid coordinates

#### Test Case 3.6: Empty Area (No Nearby Users)
```bash
curl -X GET "https://your-domain.com/api/map/visible?lat=0&lng=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
- [ ] Returns 200 status
- [ ] Response is empty array `[]`
- [ ] No errors thrown

---

## 📱 Flutter Client Implementation

### HTTP Client Setup

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiClient {
  final String baseUrl = 'https://your-domain.com';
  String? _token;
  
  void setToken(String token) {
    _token = token;
  }
  
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };
  
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/profile'),
      headers: _headers,
      body: jsonEncode(data),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update profile: ${response.body}');
    }
  }
  
  Future<List<dynamic>> getFriends() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/friends'),
      headers: _headers,
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get friends: ${response.body}');
    }
  }
  
  Future<List<dynamic>> getVisibleUsers(double lat, double lng) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/map/visible?lat=$lat&lng=$lng'),
      headers: _headers,
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get visible users: ${response.body}');
    }
  }
}
```

### Model Classes

```dart
class Profile {
  final String id;
  final String? username;
  final String? displayName;
  final String? avatarInitials;
  final double? lastLat;
  final double? lastLng;
  final String? updatedAt;
  final bool isGhostMode;
  final bool notificationsEnabled;
  final bool isPublic;
  final bool notifyGlobal;
  final bool notifyRequests;
  final bool notifyMessages;
  final bool notifySound;
  final String? createdAt;
  
  Profile({
    required this.id,
    this.username,
    this.displayName,
    this.avatarInitials,
    this.lastLat,
    this.lastLng,
    this.updatedAt,
    required this.isGhostMode,
    required this.notificationsEnabled,
    required this.isPublic,
    required this.notifyGlobal,
    required this.notifyRequests,
    required this.notifyMessages,
    required this.notifySound,
    this.createdAt,
  });
  
  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'],
      username: json['username'],
      displayName: json['display_name'],
      avatarInitials: json['avatar_initials'],
      lastLat: json['last_lat']?.toDouble(),
      lastLng: json['last_lng']?.toDouble(),
      updatedAt: json['updated_at'],
      isGhostMode: json['is_ghost_mode'] ?? false,
      notificationsEnabled: json['notifications_enabled'] ?? true,
      isPublic: json['is_public'] ?? true,
      notifyGlobal: json['notify_global'] ?? true,
      notifyRequests: json['notify_requests'] ?? true,
      notifyMessages: json['notify_messages'] ?? true,
      notifySound: json['notify_sound'] ?? true,
      createdAt: json['created_at'],
    );
  }
}

class VisibleUser {
  final String id;
  final String? username;
  final String? displayName;
  final String? avatarInitials;
  final double lastLat;
  final double lastLng;
  final String? updatedAt;
  final String relationType;
  final bool isFriend;
  final bool isOnline;
  final String lastSeenLabel;
  final double distanceKm;
  
  VisibleUser({
    required this.id,
    this.username,
    this.displayName,
    this.avatarInitials,
    required this.lastLat,
    required this.lastLng,
    this.updatedAt,
    required this.relationType,
    required this.isFriend,
    required this.isOnline,
    required this.lastSeenLabel,
    required this.distanceKm,
  });
  
  factory VisibleUser.fromJson(Map<String, dynamic> json) {
    return VisibleUser(
      id: json['id'],
      username: json['username'],
      displayName: json['display_name'],
      avatarInitials: json['avatar_initials'],
      lastLat: json['last_lat'].toDouble(),
      lastLng: json['last_lng'].toDouble(),
      updatedAt: json['updated_at'],
      relationType: json['relation_type'],
      isFriend: json['is_friend'],
      isOnline: json['is_online'],
      lastSeenLabel: json['last_seen_label'],
      distanceKm: json['distance_km'].toDouble(),
    );
  }
}
```

### Usage Examples

```dart
// Update profile
final apiClient = ApiClient();
apiClient.setToken(userToken);

try {
  final result = await apiClient.updateProfile({
    'display_name': 'New Name',
    'is_ghost_mode': false,
  });
  
  final profile = Profile.fromJson(result['profile']);
  print('Profile updated: ${profile.displayName}');
} catch (e) {
  print('Error: $e');
}

// Get friends list
try {
  final friendsJson = await apiClient.getFriends();
  final friends = friendsJson.map((json) => Profile.fromJson(json)).toList();
  print('Found ${friends.length} friends');
} catch (e) {
  print('Error: $e');
}

// Get visible users on map
try {
  final visibleJson = await apiClient.getVisibleUsers(-6.2088, 106.8456);
  final visibleUsers = visibleJson.map((json) => VisibleUser.fromJson(json)).toList();
  print('Found ${visibleUsers.length} nearby users');
} catch (e) {
  print('Error: $e');
}
```

---

## 🔍 Integration Testing Checklist

### End-to-End Tests

- [ ] **User Registration Flow**
  - [ ] Register new user
  - [ ] Receive JWT token
  - [ ] Update profile with username and display name
  - [ ] Verify profile saved correctly

- [ ] **Friend Request Flow**
  - [ ] User A sends friend request to User B
  - [ ] User B sees request in `/api/friends/requests`
  - [ ] User B accepts request
  - [ ] Both users see each other in `/api/friends`
  - [ ] No duplicates in friends list

- [ ] **Location Sharing Flow**
  - [ ] User updates location via `/api/map/update-location`
  - [ ] Friend queries `/api/map/visible` with their location
  - [ ] Friend sees user in visible users list
  - [ ] Distance calculation is accurate
  - [ ] Ghost mode hides user when enabled

- [ ] **Profile Update Flow**
  - [ ] Update display name
  - [ ] Update avatar initials
  - [ ] Toggle ghost mode
  - [ ] Toggle notification settings
  - [ ] All changes persist across sessions

---

## 🚀 Deployment Checklist

### Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- [ ] Supabase RLS policies enabled
- [ ] Database functions deployed (`get_nearby_users`)

### Server Configuration

- [ ] CORS origins configured in `mobile-rest.ts`
- [ ] Proxy middleware active (`proxy.ts`)
- [ ] SSL/TLS certificates valid
- [ ] Rate limiting configured (if applicable)

### Database

- [ ] `profiles` table exists with all columns
- [ ] `friendships` table exists with foreign keys
- [ ] RLS policies active and tested
- [ ] Indexes created for performance
- [ ] PostGIS extension enabled (for map queries)

### Monitoring

- [ ] Error logging configured
- [ ] Performance monitoring active
- [ ] API usage tracking enabled
- [ ] Alert thresholds set

---

## 📊 Performance Benchmarks

### Expected Response Times

- [ ] Profile update: < 200ms
- [ ] Friends list (50 friends): < 300ms
- [ ] Map visible users (20 users): < 400ms

### Load Testing

- [ ] 100 concurrent users: No errors
- [ ] 1000 requests/minute: < 5% error rate
- [ ] Database connection pool: No exhaustion

---

## 🐛 Known Issues & Workarounds

### Issue 1: Token Expiration
**Symptom:** 401 errors after extended session
**Workaround:** Implement token refresh in Flutter app
**Status:** Expected behavior

### Issue 2: Stale Friends List
**Symptom:** Friends list not updating immediately after accept
**Workaround:** Refetch friends list after friendship actions
**Status:** Expected behavior (no real-time updates yet)

---

## ✅ Sign-Off

### Backend Developer
- [ ] All endpoints implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed

**Name:** _________________  
**Date:** _________________

### Flutter Developer
- [ ] API integration complete
- [ ] All test cases passed
- [ ] Error handling implemented
- [ ] User experience validated

**Name:** _________________  
**Date:** _________________

### QA Engineer
- [ ] All test cases executed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for production

**Name:** _________________  
**Date:** _________________

---

## 📚 Additional Resources

- **API Documentation:** `API_DOCUMENTATION_FOR_FLUTTER.md`
- **Technical Summary:** `TECHNICAL_FIXES_SUMMARY.md`
- **Fix Details:** `FLUTTER_REST_API_FIXED.md`
- **Troubleshooting:** `TROUBLESHOOTING_LOCATION.md`
- **Testing Guide:** `TESTING_GUIDE.md`

---

**Last Updated:** 2026-05-13  
**Version:** 1.0.0  
**Status:** ✅ Ready for Integration
