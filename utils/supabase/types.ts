export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  last_lat: number | null;
  last_lng: number | null;
  updated_at: string | null;
  is_ghost_mode: boolean;
  notifications_enabled: boolean;
  is_public: boolean;
  notify_global: boolean;
  notify_requests: boolean;
  notify_messages: boolean;
  notify_sound: boolean;
  created_at: string | null;
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

export interface VisibleUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  last_lat: number;
  last_lng: number;
  updated_at: string | null;
  relation_type: 'friend' | 'stranger';
  is_friend: boolean;
}
