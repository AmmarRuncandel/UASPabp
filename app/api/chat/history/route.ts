import { NextRequest } from 'next/server';

import {
  authenticateMobileRequest,
  errorResponse,
  isMessageWithinThreeHours,
  jsonResponse,
  optionsResponse,
  type GlobalChatMessageRow,
  normalizeProfile,
} from '@/app/api/_lib/mobile-rest';
import type { Profile } from '@/utils/supabase/types';

type GlobalChatMessageResponse = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile: Profile | null;
  is_mine: boolean;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: Authenticate request and get user context
    // ────────────────────────────────────────────────────────────────────────
    const authResult = await authenticateMobileRequest(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const { user, supabase } = authResult;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: Query messages within last 3 hours
    // ────────────────────────────────────────────────────────────────────────
    const cutoffIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[chat/history] Message query error for user ${user.id}:`, error);
      return errorResponse(request, error.message, 500);
    }

    const recentMessages = ((data ?? []) as GlobalChatMessageRow[])
      .filter((message) => isMessageWithinThreeHours(message.created_at))
      .slice(-10);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Fetch sender profiles
    // ────────────────────────────────────────────────────────────────────────
    const senderIds = [...new Set(recentMessages.map((message) => message.sender_id))];
    let senderProfiles = new Map<string, Profile>();

    if (senderIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds);

      if (profileError) {
        console.error(`[chat/history] Profile query error for user ${user.id}:`, profileError);
        return errorResponse(request, profileError.message, 500);
      }

      senderProfiles = new Map(
        (profileRows ?? []).map((profileRow) => {
          const normalized = normalizeProfile(profileRow);
          return [normalized.id, normalized];
        })
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: Build response payload
    // ────────────────────────────────────────────────────────────────────────
    const payload: GlobalChatMessageResponse[] = recentMessages.map((message) => ({
      id: message.id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      sender_profile: senderProfiles.get(message.sender_id) ?? null,
      is_mine: message.sender_id === user.id,
    }));

    return jsonResponse(request, payload);
  } catch (error) {
    console.error('[chat/history] Unexpected error:', error);
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load chat history.',
      500
    );
  }
}
