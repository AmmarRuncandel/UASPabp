/**
 * Supabase DB types for Zmayy
 * Keep in sync with your Supabase schema.
 */

export interface Profile {
  id: string;               // uuid — auth.users FK
  username: string | null;
  display_name: string | null;
  avatar_initials: string | null;  // e.g. "RP"
  last_lat: number | null;
  last_lng: number | null;
  updated_at: string | null;
  is_ghost_mode?: boolean;
  notifications_enabled?: boolean;
  is_public?: boolean;
  // ── Notification granularity columns (added in DB v1.1) ──────────────────
  notify_global?: boolean;    // master toggle (replaces notifications_enabled)
  notify_requests?: boolean;  // friend request notifications
  notify_messages?: boolean;  // chat message notifications
  notify_sound?: boolean;     // play sound on notification
}

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  /** Joined — profile of the OTHER person (not the current user) */
  friend_profile?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

/**
 * Row returned by the get_visible_users(caller_id, user_lat, user_lng) RPC.
 * The function returns friends (any distance) + public strangers within 1 km.
 */
export interface VisibleUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  last_lat: number;
  last_lng: number;
  updated_at: string | null;
  relation_type: 'friend' | 'stranger'; // discriminator returned by the RPC
}
