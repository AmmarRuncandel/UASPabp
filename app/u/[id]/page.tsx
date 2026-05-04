'use client';

/**
 * app/u/[id]/page.tsx — Smart Deep-Link Route
 * ─────────────────────────────────────────────
 * • Not logged in → /login?next=/u/[id]
 * • Logged in     → /?addFriend=[id]
 */

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function UserDeepLink() {
  const router  = useRouter();
  const params  = useParams();
  const id      = params?.id as string;

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(`/login?next=/u/${id}`);
      } else {
        router.replace(`/?addFriend=${id}`);
      }
    });
  }, [id, router]);

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'var(--color-base)' }}
    >
      <span
        className="text-sm animate-pulse"
        style={{ color: 'var(--color-muted)' }}
      >
        Mengalihkan…
      </span>
    </div>
  );
}
