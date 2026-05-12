/**
 * Debug utilities for Zmayy
 * Use in browser console: window.zmayDebug
 */

import { createClient } from '@/utils/supabase/client';

export const zmayDebug = {
  /**
   * Check current user profile
   */
  async checkProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No user logged in');
      return null;
    }

    console.log('✅ User ID:', user.id);
    console.log('✅ Email:', user.email);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching profile:', error);
      return null;
    }

    console.log('✅ Profile:', {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      last_lat: profile.last_lat,
      last_lng: profile.last_lng,
      is_ghost_mode: profile.is_ghost_mode,
      is_public: profile.is_public,
      updated_at: profile.updated_at,
    });

    return profile;
  },

  /**
   * Test RPC function
   */
  async testRPC(lat: number = -6.2088, lng: number = 106.8456) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No user logged in');
      return null;
    }

    console.log(`🔍 Testing RPC get_nearby_users at (${lat}, ${lng})`);

    // Try primary function
    let { data, error } = await supabase.rpc('get_nearby_users', {
      caller_id: user.id,
      user_lat: lat,
      user_lng: lng,
    });

    if (error && error.message?.includes('does not exist')) {
      console.warn('⚠️ get_nearby_users not found, trying get_visible_users');
      const fallback = await supabase.rpc('get_visible_users', {
        caller_id: user.id,
        user_lat: lat,
        user_lng: lng,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('❌ RPC Error:', error);
      return null;
    }

    console.log(`✅ RPC returned ${data?.length || 0} users`);
    console.table(data);

    return data;
  },

  /**
   * Update location manually
   */
  async updateLocation(lat: number, lng: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No user logged in');
      return false;
    }

    console.log(`📍 Updating location to (${lat}, ${lng})`);

    const { error } = await supabase
      .from('profiles')
      .update({
        last_lat: lat,
        last_lng: lng,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Update error:', error);
      return false;
    }

    console.log('✅ Location updated successfully');
    return true;
  },

  /**
   * Toggle ghost mode
   */
  async toggleGhostMode(enabled: boolean) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No user logged in');
      return false;
    }

    console.log(`👻 ${enabled ? 'Enabling' : 'Disabling'} ghost mode`);

    const updateData: any = { is_ghost_mode: enabled };
    
    // If enabling ghost mode, also clear location
    if (enabled) {
      updateData.last_lat = null;
      updateData.last_lng = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      console.error('❌ Update error:', error);
      return false;
    }

    console.log(`✅ Ghost mode ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  },

  /**
   * Check geolocation permission
   */
  async checkGeolocation() {
    if (!('geolocation' in navigator)) {
      console.error('❌ Geolocation not supported');
      return null;
    }

    console.log('🌍 Checking geolocation...');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Geolocation available');
          console.log('📍 Current position:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve(position);
        },
        (error) => {
          console.error('❌ Geolocation error:', error.message);
          resolve(null);
        }
      );
    });
  },

  /**
   * Full diagnostic
   */
  async diagnose() {
    console.log('🔍 Running full diagnostic...\n');
    
    console.log('1️⃣ Checking profile...');
    const profile = await this.checkProfile();
    console.log('');

    console.log('2️⃣ Checking geolocation...');
    const position = await this.checkGeolocation();
    console.log('');

    if (profile && position) {
      console.log('3️⃣ Testing RPC...');
      const pos = position as GeolocationPosition;
      await this.testRPC(pos.coords.latitude, pos.coords.longitude);
      console.log('');
    }

    console.log('✅ Diagnostic complete');
  },

  /**
   * Quick fix - set location and disable ghost mode
   */
  async quickFix(lat: number = -6.2088, lng: number = 106.8456) {
    console.log('🔧 Running quick fix...\n');
    
    console.log('1️⃣ Disabling ghost mode...');
    await this.toggleGhostMode(false);
    
    console.log('2️⃣ Setting location...');
    await this.updateLocation(lat, lng);
    
    console.log('3️⃣ Testing RPC...');
    await this.testRPC(lat, lng);
    
    console.log('\n✅ Quick fix complete! Refresh the page.');
  },
};

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).zmayDebug = zmayDebug;
  console.log('🔧 Debug tools loaded. Use: window.zmayDebug');
  console.log('Available commands:');
  console.log('  - zmayDebug.diagnose()');
  console.log('  - zmayDebug.checkProfile()');
  console.log('  - zmayDebug.testRPC(lat, lng)');
  console.log('  - zmayDebug.updateLocation(lat, lng)');
  console.log('  - zmayDebug.toggleGhostMode(true/false)');
  console.log('  - zmayDebug.checkGeolocation()');
  console.log('  - zmayDebug.quickFix(lat, lng)');
}
