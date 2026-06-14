'use client';

import { useEffect, useState } from 'react';
import { AppButton } from '@/components/app/app-button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Delta — réaction « ça m'a fait réfléchir » (FR-3 / AD-9). Self-contained :
 * lit son compteur (RLS lecture publique) et bascule via la RPC toggle_delta,
 * en optimiste. Indépendant du tag gauche/droite.
 */
export function DeltaButton({
  targetType,
  targetId,
  currentUserId,
}: {
  targetType: 'thread_post' | 'comment';
  targetId: string;
  currentUserId: string | null;
}) {
  const [count, setCount] = useState(0);
  const [hasDelta, setHasDelta] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabaseClient();

    void (async () => {
      // One query: the table is public-read, deltas per item are few →
      // fetch the user_ids and derive both count and "mine" client-side.
      const { data } = await supabase
        .from('post_delta')
        .select('user_id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (active) {
        setCount(data?.length ?? 0);
        setHasDelta(
          currentUserId
            ? Boolean(
                data?.some(
                  (row: { user_id: string }) => row.user_id === currentUserId,
                ),
              )
            : false,
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [targetType, targetId, currentUserId]);

  async function toggle() {
    if (!currentUserId || pending) return;
    setPending(true);

    const next = !hasDelta;
    setHasDelta(next);
    setCount((value) => value + (next ? 1 : -1));

    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.rpc('toggle_delta', {
      p_target_type: targetType,
      p_target_id: targetId,
    });

    if (error || typeof data !== 'boolean') {
      setHasDelta(!next);
      setCount((value) => value + (next ? -1 : 1));
    } else {
      setHasDelta(data);
    }
    setPending(false);
  }

  const suffix = count > 0 ? ` · ${count}` : '';

  if (!currentUserId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        💡 Ça m’a fait réfléchir{suffix}
      </span>
    );
  }

  return (
    <AppButton
      variant={hasDelta ? 'primary' : 'ghost'}
      aria-pressed={hasDelta}
      disabled={pending}
      onClick={() => {
        void toggle();
      }}
    >
      💡 Ça m’a fait réfléchir{suffix}
    </AppButton>
  );
}
