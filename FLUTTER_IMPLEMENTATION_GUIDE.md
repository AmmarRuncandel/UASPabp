# 📱 Flutter Implementation Guide - Zmayy Mobile

Panduan lengkap implementasi perubahan di Flutter untuk fix semua masalah.

---

## 📋 Overview

File yang perlu diubah:
1. ✅ `lib/config/api_config.dart` - Update base URL
2. ✅ `lib/core/app_state.dart` - Tambah refresh profile method
3. ✅ `lib/app_shell.dart` - Update initialization
4. ✅ `lib/features/map/map_screen.dart` - Tambah error display
5. ✅ `lib/features/chat/chat_screen.dart` - Tambah error display
6. ✅ `lib/features/friends/friends_panel.dart` - Tambah error display

---

## 1️⃣ Update API Configuration

### File: `lib/config/api_config.dart`

```dart
class ApiConfig {
  // ════════════════════════════════════════════════════════════════════════
  // PRODUCTION vs DEVELOPMENT
  // ════════════════════════════════════════════════════════════════════════
  
  // ⚠️ CHANGE THIS TO true WHEN DEPLOYING TO PRODUCTION
  static const bool isProduction = false; // Set to true for production
  
  // ════════════════════════════════════════════════════════════════════════
  // BASE URL
  // ════════════════════════════════════════════════════════════════════════
  
  static String get baseUrl {
    if (isProduction) {
      // ✅ PRODUCTION: Replace with your Vercel URL
      return 'https://zmayy.vercel.app';
    } else {
      // 🔧 DEVELOPMENT: Local Next.js server
      return 'http://localhost:3000';
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════
  // API ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════
  
  // Auth
  static String get loginUrl => '$baseUrl/api/auth/mobile-login';
  static String get registerUrl => '$baseUrl/api/auth/mobile-register';
  static String get sessionUrl => '$baseUrl/api/auth/mobile-session';
  
  // Profile
  static String get updateProfileUrl => '$baseUrl/api/profile/update';
  
  // Map
  static String get visibleUsersUrl => '$baseUrl/api/map/visible';
  static String get updateLocationUrl => '$baseUrl/api/map/update-location';
  
  // Friends
  static String get friendsUrl => '$baseUrl/api/friends';
  static String get friendRequestsUrl => '$baseUrl/api/friends/requests';
  static String get sendFriendRequestUrl => '$baseUrl/api/friends/send';
  static String get acceptFriendUrl => '$baseUrl/api/friends/accept';
  static String get rejectFriendUrl => '$baseUrl/api/friends/reject';
  
  // Chat
  static String get chatHistoryUrl => '$baseUrl/api/chat/history';
  static String get sendMessageUrl => '$baseUrl/api/chat/send';
  
  // ════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════
  
  static Map<String, String> getHeaders(String? token) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }
  
  static void printDebug(String message) {
    if (!isProduction) {
      print('[API] $message');
    }
  }
}
```

---

## 2️⃣ Add Profile Refresh Method

### File: `lib/core/app_state.dart`

Tambahkan method ini di class `AppState`:

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';

class AppState extends ChangeNotifier {
  // ... existing code ...
  
  // ════════════════════════════════════════════════════════════════════════
  // ✅ NEW METHOD: Refresh Profile from Server
  // ════════════════════════════════════════════════════════════════════════
  
  /// Refresh profile from server (not from local cache)
  /// Call this after login and on app start to get latest data
  Future<void> refreshProfileFromServer() async {
    try {
      ApiConfig.printDebug('Refreshing profile from server...');
      
      // 1. Get token from secure storage
      final token = await _secureStorage.read(key: 'access_token');
      
      if (token == null || token.isEmpty) {
        throw Exception('No access token found. Please login again.');
      }
      
      // 2. Call session endpoint
      final response = await http.get(
        Uri.parse(ApiConfig.sessionUrl),
        headers: ApiConfig.getHeaders(token),
      );
      
      ApiConfig.printDebug('Session response: ${response.statusCode}');
      
      // 3. Handle response
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final profileData = data['profile'];
        
        if (profileData == null) {
          throw Exception('No profile data in response');
        }
        
        // 4. Parse profile
        final profile = Profile.fromJson(profileData);
        
        // 5. Save to local storage
        await _secureStorage.write(
          key: 'profile',
          value: jsonEncode(profile.toJson()),
        );
        
        // 6. Update app state
        _currentProfile = profile;
        
        // 7. Check ghost mode warning
        if (profile.isGhostMode == true) {
          ApiConfig.printDebug('⚠️ WARNING: Ghost mode is enabled!');
        }
        
        notifyListeners();
        
        ApiConfig.printDebug('✅ Profile refreshed successfully');
        ApiConfig.printDebug('   Username: ${profile.username}');
        ApiConfig.printDebug('   Display Name: ${profile.displayName}');
        ApiConfig.printDebug('   Ghost Mode: ${profile.isGhostMode}');
        
      } else if (response.statusCode == 401) {
        // Token expired or invalid
        ApiConfig.printDebug('❌ Token expired or invalid');
        
        // Clear local data
        await _secureStorage.delete(key: 'access_token');
        await _secureStorage.delete(key: 'profile');
        
        _currentProfile = null;
        notifyListeners();
        
        throw Exception('Session expired. Please login again.');
        
      } else {
        // Other error
        final errorData = jsonDecode(response.body);
        final errorMessage = errorData['error'] ?? 'Failed to refresh profile';
        
        ApiConfig.printDebug('❌ Error: $errorMessage');
        throw Exception(errorMessage);
      }
      
    } catch (e) {
      ApiConfig.printDebug('❌ Exception in refreshProfileFromServer: $e');
      rethrow;
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════
  // ✅ UPDATED METHOD: Load Profile with Auto-Refresh
  // ════════════════════════════════════════════════════════════════════════
  
  /// Load profile from local storage, then refresh from server
  Future<void> loadProfileWithRefresh() async {
    try {
      // 1. Load from local storage first (fast)
      await loadProfileFromStorage();
      
      // 2. Then refresh from server (accurate)
      try {
        await refreshProfileFromServer();
      } catch (e) {
        // If refresh fails, continue with cached profile
        ApiConfig.printDebug('⚠️ Could not refresh profile from server: $e');
        // Don't throw - we have cached profile
      }
      
    } catch (e) {
      ApiConfig.printDebug('❌ Error loading profile: $e');
      rethrow;
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════
  // ✅ NEW METHOD: Check Ghost Mode
  // ════════════════════════════════════════════════════════════════════════
  
  /// Check if ghost mode is enabled and show warning
  bool isGhostModeEnabled() {
    return _currentProfile?.isGhostMode == true;
  }
  
  /// Get ghost mode warning message
  String? getGhostModeWarning() {
    if (isGhostModeEnabled()) {
      return 'Ghost mode is enabled. You are invisible to others. '
             'Disable it in settings to appear on the map.';
    }
    return null;
  }
}
```

---

## 3️⃣ Update App Initialization

### File: `lib/app_shell.dart`

Update `initState` method:

```dart
class _AppShellState extends State<AppShell> {
  @override
  void initState() {
    super.initState();
    
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final appState = Provider.of<AppState>(context, listen: false);
      
      try {
        // ════════════════════════════════════════════════════════════════
        // ✅ UPDATED: Load profile with auto-refresh
        // ════════════════════════════════════════════════════════════════
        
        // Load from cache first (fast), then refresh from server (accurate)
        await appState.loadProfileWithRefresh();
        
        // ════════════════════════════════════════════════════════════════
        // ✅ NEW: Check ghost mode and show warning
        // ════════════════════════════════════════════════════════════════
        
        final ghostModeWarning = appState.getGhostModeWarning();
        if (ghostModeWarning != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ghostModeWarning),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 5),
              action: SnackBarAction(
                label: 'Settings',
                textColor: Colors.white,
                onPressed: () {
                  // Navigate to settings
                  // TODO: Implement navigation to settings
                },
              ),
            ),
          );
        }
        
        // ════════════════════════════════════════════════════════════════
        // Load other data
        // ════════════════════════════════════════════════════════════════
        
        await appState.loadChatHistory();
        
      } catch (e) {
        ApiConfig.printDebug('❌ Error in app initialization: $e');
        
        if (mounted) {
          // Show error to user
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to load data: $e'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
          
          // If session expired, navigate to login
          if (e.toString().contains('Session expired')) {
            Navigator.of(context).pushReplacementNamed('/login');
          }
        }
      }
    });
  }
  
  // ... rest of the code ...
}
```

---

## 4️⃣ Update Login Flow

### File: `lib/features/auth/login_screen.dart` or `lib/services/auth_service.dart`

Update login method:

```dart
Future<void> login(String email, String password) async {
  try {
    ApiConfig.printDebug('Logging in...');
    
    // 1. Call login endpoint
    final response = await http.post(
      Uri.parse(ApiConfig.loginUrl),
      headers: ApiConfig.getHeaders(null),
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    ApiConfig.printDebug('Login response: ${response.statusCode}');
    
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
      
      // 4. Update app state
      _currentProfile = Profile.fromJson(data['profile']);
      
      // ════════════════════════════════════════════════════════════════
      // ✅ NEW: Refresh profile from server to get latest data
      // ════════════════════════════════════════════════════════════════
      
      try {
        await refreshProfileFromServer();
      } catch (e) {
        ApiConfig.printDebug('⚠️ Could not refresh profile after login: $e');
        // Continue anyway - we have profile from login response
      }
      
      notifyListeners();
      
      ApiConfig.printDebug('✅ Login successful');
      
    } else if (response.statusCode == 401) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Invalid email or password');
      
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Login failed');
    }
    
  } catch (e) {
    ApiConfig.printDebug('❌ Login error: $e');
    rethrow;
  }
}
```

---

## 5️⃣ Add Error Display to Map Screen

### File: `lib/features/map/map_screen.dart`

```dart
class MapScreen extends StatefulWidget {
  @override
  _MapScreenState createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Map'),
        actions: [
          // ✅ NEW: Refresh button
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: () async {
              try {
                final position = await Geolocator.getCurrentPosition();
                await appState.fetchNearbyUsers(
                  position.latitude,
                  position.longitude,
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Failed to refresh: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // ════════════════════════════════════════════════════════════════
          // Map Widget
          // ════════════════════════════════════════════════════════════════
          
          MapWidget(),
          
          // ════════════════════════════════════════════════════════════════
          // ✅ NEW: Error Display
          // ════════════════════════════════════════════════════════════════
          
          if (appState.mapError != null)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Material(
                color: Colors.red,
                borderRadius: BorderRadius.circular(8),
                elevation: 4,
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.error, color: Colors.white),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          appState.mapError!,
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: Colors.white),
                        onPressed: () {
                          appState.clearMapError();
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          
          // ════════════════════════════════════════════════════════════════
          // ✅ NEW: Ghost Mode Warning
          // ════════════════════════════════════════════════════════════════
          
          if (appState.isGhostModeEnabled())
            Positioned(
              bottom: 80,
              left: 16,
              right: 16,
              child: Material(
                color: Colors.orange,
                borderRadius: BorderRadius.circular(8),
                elevation: 4,
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.visibility_off, color: Colors.white),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Ghost mode is ON. You are invisible.',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          // Navigate to settings
                          // TODO: Implement
                        },
                        child: Text(
                          'Settings',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          
          // ════════════════════════════════════════════════════════════════
          // ✅ NEW: Loading Indicator
          // ════════════════════════════════════════════════════════════════
          
          if (appState.isLoadingMap)
            Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
```

---

## 6️⃣ Add Error Display to Chat Screen

### File: `lib/features/chat/chat_screen.dart`

```dart
class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat'),
        actions: [
          // ✅ NEW: Refresh button
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: () async {
              try {
                await appState.loadChatHistory();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Chat refreshed'),
                    duration: Duration(seconds: 1),
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Failed to refresh: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // ════════════════════════════════════════════════════════════════
          // ✅ NEW: Error Display
          // ════════════════════════════════════════════════════════════════
          
          if (appState.chatError != null)
            Container(
              width: double.infinity,
              color: Colors.red,
              padding: EdgeInsets.all(12),
              child: Row(
                children: [
                  Icon(Icons.error, color: Colors.white),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      appState.chatError!,
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      appState.clearChatError();
                    },
                  ),
                ],
              ),
            ),
          
          // ════════════════════════════════════════════════════════════════
          // Chat Messages List
          // ════════════════════════════════════════════════════════════════
          
          Expanded(
            child: appState.isLoadingChat
                ? Center(child: CircularProgressIndicator())
                : appState.chatMessages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              size: 64,
                              color: Colors.grey,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'No messages yet',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Start a conversation!',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: appState.chatMessages.length,
                        itemBuilder: (context, index) {
                          final message = appState.chatMessages[index];
                          return ChatMessageTile(message: message);
                        },
                      ),
          ),
          
          // ════════════════════════════════════════════════════════════════
          // Message Input
          // ════════════════════════════════════════════════════════════════
          
          ChatInputWidget(),
        ],
      ),
    );
  }
}
```

---

## 7️⃣ Add Error Display to Friends Panel

### File: `lib/features/friends/friends_panel.dart`

```dart
class FriendsPanel extends StatefulWidget {
  @override
  _FriendsPanelState createState() => _FriendsPanelState();
}

class _FriendsPanelState extends State<FriendsPanel> {
  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    
    return Column(
      children: [
        // ════════════════════════════════════════════════════════════════
        // ✅ NEW: Error Display
        // ════════════════════════════════════════════════════════════════
        
        if (appState.friendsError != null)
          Container(
            width: double.infinity,
            color: Colors.red,
            padding: EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(Icons.error, color: Colors.white),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    appState.friendsError!,
                    style: TextStyle(color: Colors.white),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close, color: Colors.white),
                  onPressed: () {
                    appState.clearFriendsError();
                  },
                ),
              ],
            ),
          ),
        
        // ════════════════════════════════════════════════════════════════
        // Friends List
        // ════════════════════════════════════════════════════════════════
        
        Expanded(
          child: appState.isLoadingFriends
              ? Center(child: CircularProgressIndicator())
              : appState.friends.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 64,
                            color: Colors.grey,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'No friends yet',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Add friends to see them here',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: appState.friends.length,
                      itemBuilder: (context, index) {
                        final friend = appState.friends[index];
                        return FriendTile(friend: friend);
                      },
                    ),
        ),
      ],
    );
  }
}
```

---

## 8️⃣ Add Helper Methods to AppState

### File: `lib/core/app_state.dart`

Tambahkan error handling methods:

```dart
class AppState extends ChangeNotifier {
  // ... existing code ...
  
  // ════════════════════════════════════════════════════════════════════════
  // ✅ NEW: Error State Management
  // ════════════════════════════════════════════════════════════════════════
  
  String? _mapError;
  String? _chatError;
  String? _friendsError;
  
  String? get mapError => _mapError;
  String? get chatError => _chatError;
  String? get friendsError => _friendsError;
  
  void setMapError(String error) {
    _mapError = error;
    notifyListeners();
  }
  
  void clearMapError() {
    _mapError = null;
    notifyListeners();
  }
  
  void setChatError(String error) {
    _chatError = error;
    notifyListeners();
  }
  
  void clearChatError() {
    _chatError = null;
    notifyListeners();
  }
  
  void setFriendsError(String error) {
    _friendsError = error;
    notifyListeners();
  }
  
  void clearFriendsError() {
    _friendsError = null;
    notifyListeners();
  }
  
  // ════════════════════════════════════════════════════════════════════════
  // ✅ UPDATED: Fetch Nearby Users with Error Handling
  // ════════════════════════════════════════════════════════════════════════
  
  Future<void> fetchNearbyUsers(double lat, double lng) async {
    try {
      clearMapError(); // Clear previous errors
      
      // Check ghost mode first
      if (isGhostModeEnabled()) {
        setMapError('Ghost mode is enabled. Disable it to see nearby users.');
        return;
      }
      
      _isLoadingMap = true;
      notifyListeners();
      
      final token = await _secureStorage.read(key: 'access_token');
      if (token == null) {
        throw Exception('No access token');
      }
      
      final response = await http.get(
        Uri.parse('${ApiConfig.visibleUsersUrl}?lat=$lat&lng=$lng'),
        headers: ApiConfig.getHeaders(token),
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        _visibleUsers = data.map((json) => VisibleUser.fromJson(json)).toList();
        
        ApiConfig.printDebug('✅ Loaded ${_visibleUsers.length} visible users');
        
      } else if (response.statusCode == 401) {
        throw Exception('Session expired. Please login again.');
        
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to load nearby users');
      }
      
    } catch (e) {
      ApiConfig.printDebug('❌ Error fetching nearby users: $e');
      setMapError(e.toString());
      
    } finally {
      _isLoadingMap = false;
      notifyListeners();
    }
  }
}
```

---

## 9️⃣ Testing Checklist

Setelah implementasi, test semua fitur:

### ✅ Authentication
```dart
// Test login
await login('test@example.com', 'password123');
// Should: Save token, save profile, refresh from server

// Test profile refresh
await refreshProfileFromServer();
// Should: Get latest data from server, update local storage
```

### ✅ Map
```dart
// Test fetch nearby users
await fetchNearbyUsers(-6.2088, 106.8456);
// Should: Return list of users, show on map

// Test ghost mode check
if (isGhostModeEnabled()) {
  // Should: Show warning, not fetch users
}

// Test error display
// Should: Show error in red banner at top of screen
```

### ✅ Friends
```dart
// Test get friends
await getFriends();
// Should: Return list of accepted friends

// Test get requests
await getFriendRequests();
// Should: Return list of pending requests

// Test send request
await sendFriendRequest(userId);
// Should: Create pending friendship

// Test accept request
await acceptFriendRequest(requesterId);
// Should: Update status to accepted
```

### ✅ Chat
```dart
// Test get history
await loadChatHistory();
// Should: Return messages from last 3 hours

// Test send message
await sendMessage(receiverId, 'Hello!');
// Should: Create new message, appear in history
```

---

## 🎯 Summary

### Changes Made:
1. ✅ Updated `ApiConfig` with production URL
2. ✅ Added `refreshProfileFromServer()` method
3. ✅ Updated app initialization to refresh profile
4. ✅ Updated login flow to refresh profile
5. ✅ Added error display to all screens
6. ✅ Added ghost mode warning
7. ✅ Added loading indicators
8. ✅ Added refresh buttons

### Time Estimate:
- Reading this guide: 15 minutes
- Implementing changes: 30-45 minutes
- Testing: 20 minutes
- **Total: ~1-1.5 hours**

### Next Steps:
1. ✅ Implement all changes above
2. ✅ Test locally with `isProduction = false`
3. ✅ Deploy Next.js to Vercel
4. ✅ Change `isProduction = true`
5. ✅ Test with production URL
6. ✅ Deploy Flutter app

---

**Good luck! 🚀**

If you encounter any issues, check:
1. `API_DOCUMENTATION_FOR_FLUTTER.md` for endpoint details
2. `DEPLOYMENT_GUIDE.md` for deployment steps
3. `QUICK_FIX_SUMMARY.md` for quick reference
