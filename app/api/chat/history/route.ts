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
    const auth = await authenticateMobileRequest(request);
    if ('response' in auth) {
      return auth.response;
    }

    const cutoffIso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data, error } = await auth.supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(request, error.message, 500);
    }

    const recentMessages = ((data ?? []) as GlobalChatMessageRow[])
      .filter((message) => isMessageWithinThreeHours(message.created_at))
      .slice(-10);

    const senderIds = [...new Set(recentMessages.map((message) => message.sender_id))];
    let senderProfiles = new Map<string, Profile>();

    if (senderIds.length > 0) {
      const { data: profileRows, error: profileError } = await auth.supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds);

      if (profileError) {
        return errorResponse(request, profileError.message, 500);
      }

      senderProfiles = new Map(
        (profileRows ?? []).map((profileRow) => {
          const normalized = normalizeProfile(profileRow);
          return [normalized.id, normalized];
        })
      );
    }

    const payload: GlobalChatMessageResponse[] = recentMessages.map((message) => ({
      id: message.id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      sender_profile: senderProfiles.get(message.sender_id) ?? null,
      is_mine: message.sender_id === auth.user.id,
    }));

    return jsonResponse(request, payload);
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : 'Unable to load chat history.',
      500
    );
  }
}
