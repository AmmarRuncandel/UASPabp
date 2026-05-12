# ✅ Verification Checklist - Zmayy Deployment

Gunakan checklist ini untuk memastikan semua komponen berfungsi dengan baik.

---

## 📋 Pre-Deployment Checklist

### 1. Supabase Setup

- [ ] **Project Created**
  - Login ke https://supabase.com
  - Project name: zmayy
  - Region: Singapore (atau terdekat)

- [ ] **Credentials Saved**
  - [ ] Project URL copied
  - [ ] Anon key copied
  - [ ] Saved in secure location

- [ ] **Database Setup**
  - [ ] Opened SQL Editor
  - [ ] Ran `SUPABASE_SETUP_COMPLETE.sql`
  - [ ] No errors in execution

- [ ] **Tables Verified**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public';
  ```
  - [ ] `profiles` table exists
  - [ ] `friendships` table exists
  - [ ] `messages` table exists

- [ ] **RLS Enabled**
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables 
  WHERE schemaname = 'public';
  ```
  - [ ] `profiles` RLS = true
  - [ ] `friendships` RLS = true
  - [ ] `messages` RLS = true

- [ ] **RPC Functions Created**
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public';
  ```
  - [ ] `get_visible_users` exists
  - [ ] `get_nearby_users` exists

- [ ] **Test User Created**
  - [ ] Registered test account
  - [ ] Email confirmed (if required)
  - [ ] Can login successfully

---

### 2. Next.js Deployment

- [ ] **Code Committed**
  ```bash
  git status
  # Should show: nothing to commit, working tree clean
  ```

- [ ] **Pushed to GitHub**
  ```bash
  git push origin main
  # Should show: Everything up-to-date
  ```

- [ ] **Vercel Project Created**
  - [ ] Logged in to https://vercel.com
  - [ ] Imported repository
  - [ ] Project name set

- [ ] **Environment Variables Set**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` added
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added
  - [ ] Both set for Production, Preview, Development

- [ ] **Deployment Successful**
  - [ ] Build completed without errors
  - [ ] Deployment status: Ready
  - [ ] Production URL copied

---

### 3. Backend Verification

Test all endpoints with curl or Postman:

#### Authentication Endpoints

- [ ] **Login Endpoint**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/auth/mobile-login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}'
  ```
  - [ ] Returns 200 OK
  - [ ] Returns `access_token`
  - [ ] Returns `profile` object

- [ ] **Register Endpoint**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/auth/mobile-register \
    -H "Content-Type: application/json" \
    -d '{"email":"newuser@example.com","password":"password123"}'
  ```
  - [ ] Returns 201 Created
  - [ ] Returns `access_token` OR `requires_confirmation`

- [ ] **Session Endpoint**
  ```bash
  curl https://zmayy.vercel.app/api/auth/mobile-session \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - [ ] Returns 200 OK
  - [ ] Returns `profile` object
  - [ ] Returns `session_valid: true`

#### Profile Endpoints

- [ ] **Update Profile**
  ```bash
  curl -X PATCH https://zmayy.vercel.app/api/profile/update \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"display_name":"Test User"}'
  ```
  - [ ] Returns 200 OK
  - [ ] Returns updated `profile`

#### Map Endpoints

- [ ] **Get Visible Users**
  ```bash
  curl "https://zmayy.vercel.app/api/map/visible?lat=-6.2088&lng=106.8456" \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - [ ] Returns 200 OK
  - [ ] Returns array (may be empty)

- [ ] **Update Location**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/map/update-location \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"lat":-6.2088,"lng":106.8456}'
  ```
  - [ ] Returns 200 OK
  - [ ] Returns `success: true`

#### Friends Endpoints

- [ ] **Get Friends**
  ```bash
  curl https://zmayy.vercel.app/api/friends \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - [ ] Returns 200 OK
  - [ ] Returns array (may be empty)

- [ ] **Get Friend Requests**
  ```bash
  curl https://zmayy.vercel.app/api/friends/requests \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - [ ] Returns 200 OK
  - [ ] Returns array (may be empty)

- [ ] **Send Friend Request**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/friends/send \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"addressee_id":"OTHER_USER_ID"}'
  ```
  - [ ] Returns 201 Created
  - [ ] Returns `success: true`

- [ ] **Accept Friend Request**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/friends/accept \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"requester_id":"REQUESTER_ID"}'
  ```
  - [ ] Returns 200 OK
  - [ ] Returns `success: true`

- [ ] **Reject Friend Request**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/friends/reject \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"requester_id":"REQUESTER_ID"}'
  ```
  - [ ] Returns 200 OK
  - [ ] Returns `success: true`

#### Chat Endpoints

- [ ] **Get Chat History**
  ```bash
  curl https://zmayy.vercel.app/api/chat/history \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - [ ] Returns 200 OK
  - [ ] Returns array (may be empty)

- [ ] **Send Message**
  ```bash
  curl -X POST https://zmayy.vercel.app/api/chat/send \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"receiver_id":"RECEIVER_ID","content":"Hello!"}'
  ```
  - [ ] Returns 200 OK
  - [ ] Returns message object

---

### 4. Flutter Implementation

- [ ] **Base URL Updated**
  - [ ] `ApiConfig.baseUrl` points to Vercel URL
  - [ ] `isProduction` set to `true`

- [ ] **Profile Refresh Added**
  - [ ] `refreshProfileFromServer()` method exists
  - [ ] Called after login
  - [ ] Called on app start

- [ ] **Error Display Added**
  - [ ] Map screen shows errors
  - [ ] Chat screen shows errors
  - [ ] Friends screen shows errors

- [ ] **Ghost Mode Warning Added**
  - [ ] Warning shown if ghost mode enabled
  - [ ] Link to settings provided

- [ ] **Loading Indicators Added**
  - [ ] Map shows loading state
  - [ ] Chat shows loading state
  - [ ] Friends shows loading state

---

### 5. End-to-End Testing

#### Test Scenario 1: New User Registration

- [ ] **Step 1:** Open Flutter app
- [ ] **Step 2:** Click "Register"
- [ ] **Step 3:** Enter email and password
- [ ] **Step 4:** Click "Register" button
- [ ] **Expected:** 
  - [ ] Registration successful
  - [ ] Navigates to home screen
  - [ ] Profile loaded

#### Test Scenario 2: Existing User Login

- [ ] **Step 1:** Open Flutter app
- [ ] **Step 2:** Enter email and password
- [ ] **Step 3:** Click "Login" button
- [ ] **Expected:**
  - [ ] Login successful
  - [ ] Profile refreshed from server
  - [ ] Navigates to home screen

#### Test Scenario 3: Map Feature

- [ ] **Step 1:** Navigate to Map screen
- [ ] **Step 2:** Grant location permission
- [ ] **Expected:**
  - [ ] Map loads
  - [ ] Current location shown
  - [ ] Nearby users shown (if any)
  - [ ] No errors displayed

- [ ] **Step 3:** Check ghost mode
  - [ ] If enabled, warning shown
  - [ ] Can navigate to settings

#### Test Scenario 4: Friends Feature

- [ ] **Step 1:** Navigate to Friends screen
- [ ] **Expected:**
  - [ ] Friends list loads
  - [ ] Shows "No friends" if empty
  - [ ] No errors displayed

- [ ] **Step 2:** Send friend request
  - [ ] Can search for user
  - [ ] Can send request
  - [ ] Request appears in pending

- [ ] **Step 3:** Accept friend request
  - [ ] Pending requests shown
  - [ ] Can accept request
  - [ ] Friend appears in friends list

#### Test Scenario 5: Chat Feature

- [ ] **Step 1:** Navigate to Chat screen
- [ ] **Expected:**
  - [ ] Chat history loads
  - [ ] Shows "No messages" if empty
  - [ ] No errors displayed

- [ ] **Step 2:** Send message
  - [ ] Can type message
  - [ ] Can send message
  - [ ] Message appears in list

- [ ] **Step 3:** Receive message
  - [ ] Message from other user appears
  - [ ] Sender profile shown
  - [ ] Timestamp shown

#### Test Scenario 6: Settings Feature

- [ ] **Step 1:** Navigate to Settings
- [ ] **Step 2:** Change display name
- [ ] **Step 3:** Save changes
- [ ] **Expected:**
  - [ ] Changes saved
  - [ ] Profile updated in database

- [ ] **Step 4:** Logout and login again
- [ ] **Expected:**
  - [ ] Display name persists
  - [ ] Settings sync correctly

#### Test Scenario 7: Ghost Mode

- [ ] **Step 1:** Enable ghost mode in settings
- [ ] **Step 2:** Navigate to Map
- [ ] **Expected:**
  - [ ] Warning shown
  - [ ] No users fetched
  - [ ] Can disable from warning

- [ ] **Step 3:** Disable ghost mode
- [ ] **Expected:**
  - [ ] Warning disappears
  - [ ] Users fetched normally

---

## 🔍 Troubleshooting Checklist

If something doesn't work, check:

### Backend Issues

- [ ] **Vercel Logs**
  - [ ] No errors in logs
  - [ ] All requests logged
  - [ ] Response times acceptable

- [ ] **Supabase Logs**
  - [ ] No RLS errors
  - [ ] No query errors
  - [ ] No connection errors

- [ ] **Environment Variables**
  - [ ] Correct Supabase URL
  - [ ] Correct anon key
  - [ ] Set for all environments

### Frontend Issues

- [ ] **Network Requests**
  - [ ] Correct base URL
  - [ ] Token included in headers
  - [ ] Content-Type set correctly

- [ ] **Token Management**
  - [ ] Token saved after login
  - [ ] Token loaded on app start
  - [ ] Token cleared on logout

- [ ] **Error Handling**
  - [ ] Errors caught and displayed
  - [ ] 401 errors trigger logout
  - [ ] Network errors handled

### Database Issues

- [ ] **RLS Policies**
  - [ ] Policies exist for all tables
  - [ ] Policies allow correct operations
  - [ ] No permission denied errors

- [ ] **RPC Functions**
  - [ ] Functions exist
  - [ ] Functions return correct data
  - [ ] No function not found errors

- [ ] **Data Integrity**
  - [ ] Foreign keys valid
  - [ ] No orphaned records
  - [ ] Timestamps correct

---

## 📊 Performance Checklist

- [ ] **Response Times**
  - [ ] Login < 2 seconds
  - [ ] Map load < 3 seconds
  - [ ] Chat load < 2 seconds
  - [ ] Friends load < 2 seconds

- [ ] **Database Queries**
  - [ ] Indexes created
  - [ ] No N+1 queries
  - [ ] Query times < 100ms

- [ ] **API Endpoints**
  - [ ] CORS configured correctly
  - [ ] Compression enabled
  - [ ] Caching headers set

---

## 🔒 Security Checklist

- [ ] **Authentication**
  - [ ] Tokens expire correctly
  - [ ] Refresh tokens work
  - [ ] Logout clears tokens

- [ ] **Authorization**
  - [ ] RLS policies enforced
  - [ ] Users can only access own data
  - [ ] Admin routes protected

- [ ] **Data Protection**
  - [ ] Passwords hashed
  - [ ] Tokens stored securely
  - [ ] HTTPS enforced

- [ ] **Input Validation**
  - [ ] Email format validated
  - [ ] Password strength enforced
  - [ ] Coordinates validated

---

## ✅ Final Sign-Off

Before going to production:

- [ ] All backend endpoints tested ✅
- [ ] All frontend features tested ✅
- [ ] All test scenarios passed ✅
- [ ] No errors in logs ✅
- [ ] Performance acceptable ✅
- [ ] Security measures in place ✅

**Signed off by:** _________________  
**Date:** _________________  
**Status:** ☐ Ready for Production ☐ Needs More Work

---

## 📝 Notes

Use this section to document any issues found during verification:

```
Issue 1:
- Description:
- Severity: High / Medium / Low
- Status: Fixed / In Progress / Pending
- Solution:

Issue 2:
- Description:
- Severity: High / Medium / Low
- Status: Fixed / In Progress / Pending
- Solution:
```

---

**Last Updated:** May 12, 2026  
**Version:** 2.0  
**Checklist Status:** Ready for Use ✅
