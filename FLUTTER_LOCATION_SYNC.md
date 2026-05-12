# 📱 Flutter Location Sync - Implementation Guide

Panduan untuk memastikan Flutter dan Web Next.js menggunakan struktur data yang sama.

---

## 🎯 Konsep Arsitektur

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Flutter Mobile │ ◄─────► │  Next.js REST API│ ◄─────► │  Supabase DB    │
│                 │  HTTP   │                  │  RPC    │                 │
│  - Geolocation  │         │  - /api/map/*    │         │  - profiles     │
│  - Map Display  │         │  - Auth proxy    │         │  - friendships  │
│  - User markers │         │  - CORS          │         │  - RPC functions│
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## 📊 Data Structure Consistency

### Tabel: `profiles`

Pastikan Flutter model sesuai dengan struktur database:

```dart
// lib/models/profile.dart

class Profile {
  final String id;
  final String? username;
  final String? displayName;
  final String? avatarInitials;
  
  // ✅ LOCATION FIELDS - MUST MATCH DATABASE
  final double? lastLat;
  final double? lastLng;
  final DateTime? updatedAt;
  
  // ✅ PRIVACY FIELDS - MUST MATCH DATABASE
  final bool isGhostMode;
  final bool isPublic;
  
  // ✅ NOTIFICATION FIELDS
  final bool notifyGlobal;
  final bool notifyRequests;
  final bool notifyMessages;
  final bool notifySound;

  Profile({
    required this.id,
    this.username,
    this.displayName,
    this.avatarInitials,
    this.lastLat,
    this.lastLng,
    this.updatedAt,
    this.isGhostMode = false,
    this.isPublic = true,
    this.notifyGlobal = true,
    this.notifyRequests = true,
    this.notifyMessages = true,
    this.notifySound = true,
  });

  // ✅ FROM JSON - MUST MATCH API RESPONSE
  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      username: json['username'] as String?,
      displayName: json['display_name'] as String?,
      avatarInitials: json['avatar_initials'] as String?,
      lastLat: json['last_lat'] != null ? (json['last_lat'] as num).toDouble() : null,
      lastLng: json['last_lng'] != null ? (json['last_lng'] as num).toDouble() : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'] as String) : null,
      isGhostMode: json['is_ghost_mode'] as bool? ?? false,
      isPublic: json['is_public'] as bool? ?? true,
      notifyGlobal: json['notify_global'] as bool? ?? true,
      notifyRequests: json['notify_requests'] as bool? ?? true,
      notifyMessages: json['notify_messages'] as bool? ?? true,
      notifySound: json['notify_sound'] as bool? ?? true,
    );
  }

  // ✅ TO JSON - MUST MATCH API REQUEST
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'display_name': displayName,
      'avatar_initials': avatarInitials,
      'last_lat': lastLat,
      'last_lng': lastLng,
      'updated_at': updatedAt?.toIso8601String(),
      'is_ghost_mode': isGhostMode,
      'is_public': isPublic,
      'notify_global': notifyGlobal,
      'notify_requests': notifyRequests,
      'notify_messages': notifyMessages,
      'notify_sound': notifySound,
    };
  }
}
```

### Model: `VisibleUser`

```dart
// lib/models/visible_user.dart

class VisibleUser {
  final String id;
  final String? username;
  final String? displayName;
  final String? avatarInitials;
  
  // ✅ LOCATION - REQUIRED (not nullable in RPC response)
  final double lastLat;
  final double lastLng;
  final DateTime? updatedAt;
  
  // ✅ RELATION TYPE - MUST MATCH RPC RESPONSE
  final String relationType; // 'friend' or 'stranger'
  final bool isFriend;
  
  // ✅ COMPUTED FIELDS (from API)
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
    this.isOnline = false,
    this.lastSeenLabel = '—',
    this.distanceKm = 0.0,
  });

  // ✅ FROM JSON - MUST MATCH /api/map/visible RESPONSE
  factory VisibleUser.fromJson(Map<String, dynamic> json) {
    return VisibleUser(
      id: json['id'] as String,
      username: json['username'] as String?,
      displayName: json['display_name'] as String?,
      avatarInitials: json['avatar_initials'] as String?,
      lastLat: (json['last_lat'] as num).toDouble(),
      lastLng: (json['last_lng'] as num).toDouble(),
      updatedAt: json['updated_at'] != null 
        ? DateTime.parse(json['updated_at'] as String) 
        : null,
      relationType: json['relation_type'] as String,
      isFriend: json['is_friend'] as bool,
      isOnline: json['is_online'] as bool? ?? false,
      lastSeenLabel: json['last_seen_label'] as String? ?? '—',
      distanceKm: json['distance_km'] != null 
        ? (json['distance_km'] as num).toDouble() 
        : 0.0,
    );
  }
}
```

---

## 🔄 Location Update Flow

### Web (Next.js)

```typescript
// app/components/map/MapViewInner.tsx

// 1. Get location from browser
navigator.geolocation.watchPosition(
  async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    
    // 2. Update local state
    setUserPos([lat, lng]);
    
    // 3. Update database
    await supabase
      .from('profiles')
      .update({ 
        last_lat: lat, 
        last_lng: lng, 
        updated_at: new Date().toIso8601String() 
      })
      .eq('id', userId);
  },
  () => {/* error */},
  { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
);
```

### Flutter (Mobile)

```dart
// lib/services/location_service.dart

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class LocationService {
  final String baseUrl;
  final String Function() getToken;
  
  LocationService({
    required this.baseUrl,
    required this.getToken,
  });
  
  // ✅ SAME FLOW AS WEB
  Future<void> startLocationTracking() async {
    // 1. Request permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    if (permission == LocationPermission.deniedForever ||
        permission == LocationPermission.denied) {
      throw Exception('Location permission denied');
    }
    
    // 2. Watch position (same as web)
    Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // Update every 10 meters
      ),
    ).listen((Position position) async {
      // 3. Update via REST API (same endpoint as web uses internally)
      await updateLocation(position.latitude, position.longitude);
    });
  }
  
  // ✅ UPDATE LOCATION VIA REST API
  Future<void> updateLocation(double lat, double lng) async {
    try {
      final token = getToken();
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/map/update-location'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'lat': lat,
          'lng': lng,
        }),
      );
      
      if (response.statusCode == 200) {
        print('✅ Location updated: ($lat, $lng)');
      } else {
        print('❌ Failed to update location: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error updating location: $e');
    }
  }
}
```

---

## 🗺️ Fetch Visible Users

### Web (Next.js)

```typescript
// app/components/map/MapViewInner.tsx

const fetchVisibleUsers = useCallback(async () => {
  const lat = currentLat ?? DEFAULT_CENTER[0];
  const lng = currentLng ?? DEFAULT_CENTER[1];

  // Call RPC directly
  const { data, error } = await supabase.rpc('get_nearby_users', {
    caller_id: userId,
    user_lat: lat,
    user_lng: lng,
  });

  if (data) {
    setVisibleUsers(data as VisibleUser[]);
  }
}, [supabase, userId, currentLat, currentLng]);
```

### Flutter (Mobile)

```dart
// lib/services/map_service.dart

import 'package:http/http.dart' as http;
import 'dart:convert';

class MapService {
  final String baseUrl;
  final String Function() getToken;
  
  MapService({
    required this.baseUrl,
    required this.getToken,
  });
  
  // ✅ FETCH VIA REST API (calls same RPC internally)
  Future<List<VisibleUser>> getVisibleUsers(double lat, double lng) async {
    try {
      final token = getToken();
      
      final response = await http.get(
        Uri.parse('$baseUrl/api/map/visible?lat=$lat&lng=$lng'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => VisibleUser.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load visible users: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error fetching visible users: $e');
      rethrow;
    }
  }
}
```

---

## 🔒 Ghost Mode Handling

### Web (Next.js)

```typescript
// When ghost mode is activated
useEffect(() => {
  if (!wasGhost && isGhostMode) {
    // Wipe coordinates from DB
    supabase
      .from('profiles')
      .update({ last_lat: null, last_lng: null })
      .eq('id', userId);
  }
}, [isGhostMode, userId, supabase]);
```

### Flutter (Mobile)

```dart
// lib/services/profile_service.dart

Future<void> toggleGhostMode(bool enabled) async {
  try {
    final token = getToken();
    
    final response = await http.patch(
      Uri.parse('$baseUrl/api/profile/update'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'is_ghost_mode': enabled,
        // ✅ If enabling ghost mode, also clear location
        if (enabled) ...{
          'last_lat': null,
          'last_lng': null,
        },
      }),
    );
    
    if (response.statusCode == 200) {
      print('✅ Ghost mode ${enabled ? 'enabled' : 'disabled'}');
    }
  } catch (e) {
    print('❌ Error toggling ghost mode: $e');
    rethrow;
  }
}
```

---

## 📍 Map Display Logic

### Consistency Rules:

1. **Current User Marker:**
   - Only show if `isGhostMode = false`
   - Use gold/yellow color
   - Always centered initially

2. **Friend Markers:**
   - Show all friends regardless of distance
   - Use gold/yellow color
   - Label: "Teman"

3. **Stranger Markers:**
   - Only show if within 1km
   - Only show if `is_public = true`
   - Use gray color
   - Label: "Pengguna di sekitar"

4. **Ghost Mode:**
   - Hide current user marker
   - Don't send location updates
   - Don't fetch visible users
   - Show overlay/warning

### Web Implementation

```typescript
// app/components/map/MapViewInner.tsx

// Current user marker
{!isGhostMode && (
  <Marker position={userPos} icon={userIconRef.current!}>
    <Popup>Kamu</Popup>
  </Marker>
)}

// Visible users
{visibleUsers.map((u) => {
  const isFriend = u.relation_type === 'friend';
  const icon = makeFriendIcon(u.avatar_initials, isFriend);
  
  return (
    <Marker key={u.id} position={[u.last_lat, u.last_lng]} icon={icon}>
      <Popup>
        {u.display_name ?? u.username}
        <br />
        {isFriend ? 'Teman' : 'Pengguna di sekitar'}
      </Popup>
    </Marker>
  );
})}
```

### Flutter Implementation

```dart
// lib/screens/map_screen.dart

// Current user marker
if (!isGhostMode)
  Marker(
    markerId: MarkerId('current_user'),
    position: LatLng(currentLat, currentLng),
    icon: goldMarkerIcon,
    infoWindow: InfoWindow(title: 'Kamu'),
  ),

// Visible users
...visibleUsers.map((user) {
  final isFriend = user.relationType == 'friend';
  final icon = isFriend ? goldMarkerIcon : grayMarkerIcon;
  
  return Marker(
    markerId: MarkerId(user.id),
    position: LatLng(user.lastLat, user.lastLng),
    icon: icon,
    infoWindow: InfoWindow(
      title: user.displayName ?? user.username ?? 'User',
      snippet: isFriend ? 'Teman' : 'Pengguna di sekitar',
    ),
  );
}).toList(),
```

---

## ✅ Verification Checklist

### Database Setup
- [ ] ✅ Table `profiles` has columns: `last_lat`, `last_lng`, `is_ghost_mode`, `is_public`
- [ ] ✅ RPC function `get_nearby_users` exists
- [ ] ✅ RPC function `get_visible_users` exists (alias)
- [ ] ✅ RLS policies allow reading public profiles
- [ ] ✅ Indexes created for performance

### Web (Next.js)
- [ ] ✅ Geolocation API updates `last_lat`, `last_lng` in database
- [ ] ✅ Map calls `get_nearby_users` RPC
- [ ] ✅ Ghost mode clears location from database
- [ ] ✅ Markers show correctly (gold for friends, gray for strangers)
- [ ] ✅ REST API endpoint `/api/map/visible` works

### Flutter (Mobile)
- [ ] ✅ Model `Profile` matches database structure
- [ ] ✅ Model `VisibleUser` matches API response
- [ ] ✅ Location service calls `/api/map/update-location`
- [ ] ✅ Map service calls `/api/map/visible`
- [ ] ✅ Ghost mode calls `/api/profile/update`
- [ ] ✅ Markers show correctly (same logic as web)

### Consistency
- [ ] ✅ Same field names (snake_case in API, camelCase in Dart)
- [ ] ✅ Same data types (double for coordinates, bool for flags)
- [ ] ✅ Same logic (ghost mode, distance filter, friend/stranger)
- [ ] ✅ Same endpoints (both use REST API)

---

## 🧪 Testing

### Test 1: Location Update

**Web:**
```javascript
// Browser console
navigator.geolocation.getCurrentPosition((pos) => {
  console.log('Lat:', pos.coords.latitude);
  console.log('Lng:', pos.coords.longitude);
});
```

**Flutter:**
```dart
// Test location service
final position = await Geolocator.getCurrentPosition();
print('Lat: ${position.latitude}');
print('Lng: ${position.longitude}');

await locationService.updateLocation(position.latitude, position.longitude);
```

**Verify in Database:**
```sql
SELECT id, username, last_lat, last_lng, updated_at
FROM profiles
WHERE id = 'YOUR-USER-ID';
```

### Test 2: Fetch Visible Users

**Web:**
```javascript
// Browser console
const { data } = await supabase.rpc('get_nearby_users', {
  caller_id: 'YOUR-USER-ID',
  user_lat: -6.2088,
  user_lng: 106.8456,
});
console.log('Visible users:', data);
```

**Flutter:**
```dart
// Test map service
final users = await mapService.getVisibleUsers(-6.2088, 106.8456);
print('Visible users: ${users.length}');
```

**Verify via API:**
```bash
curl "http://localhost:3000/api/map/visible?lat=-6.2088&lng=106.8456" \
  -H "Authorization: Bearer YOUR-TOKEN"
```

### Test 3: Ghost Mode

**Web:**
```javascript
// Toggle ghost mode
await supabase
  .from('profiles')
  .update({ is_ghost_mode: true, last_lat: null, last_lng: null })
  .eq('id', 'YOUR-USER-ID');
```

**Flutter:**
```dart
// Toggle ghost mode
await profileService.toggleGhostMode(true);
```

**Verify:**
```sql
SELECT id, username, is_ghost_mode, last_lat, last_lng
FROM profiles
WHERE id = 'YOUR-USER-ID';
-- Should show: is_ghost_mode = TRUE, last_lat = NULL, last_lng = NULL
```

---

## 📝 Summary

**Key Points:**
1. ✅ Web dan Flutter menggunakan **struktur data yang sama**
2. ✅ Flutter menggunakan **REST API**, bukan direct Supabase
3. ✅ Web menggunakan **RPC function** langsung
4. ✅ Keduanya update lokasi ke **tabel profiles yang sama**
5. ✅ Logic ghost mode, distance filter, friend/stranger **konsisten**

**Files to Update:**
- `lib/models/profile.dart` - Match database structure
- `lib/models/visible_user.dart` - Match API response
- `lib/services/location_service.dart` - Use REST API
- `lib/services/map_service.dart` - Use REST API
- `lib/services/profile_service.dart` - Use REST API

**Next Steps:**
1. Run `SUPABASE_FIX_LOCATION.sql` di Supabase
2. Verify RPC function works
3. Update Flutter models
4. Test location update
5. Test fetch visible users
6. Test ghost mode

---

**Last Updated:** May 12, 2026  
**Status:** Ready for Implementation 🚀
