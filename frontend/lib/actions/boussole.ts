'use server';

import { revalidatePath } from 'next/cache';
import type { Stance } from '@/lib/boussole/scoring';
import { createLogger, logError } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('boussole');

export interface SaveBoussoleInput {
  leftRight: number;
  topPartySlug: string | null;
  answers: Record<number, Stance>;
}

/**
 * `saveBoussoleResultAction` — persist the current user's Boussole result
 * (FR-41). Personal political data → RLS owner-only via `save_boussole_result`.
 * Returns `{ ok }`; the client surfaces the confirmation in place.
 */
export async function saveBoussoleResultAction(
  input: SaveBoussoleInput,
): Promise<{ ok: boolean }> {
  if (
    typeof input.leftRight !== 'number' ||
    input.leftRight < -1 ||
    input.leftRight > 1
  ) {
    throw new Error('Position invalide');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('save_boussole_result', {
      p_left_right: input.leftRight,
      p_top_party_slug: input.topPartySlug,
      p_answers: input.answers,
    });

    if (error) {
      log.error(
        {
          event: 'boussole.save.rpc_failed',
          message: error.message,
          code: error.code,
        },
        'save boussole rpc failed',
      );
      throw new Error('Enregistrement impossible.');
    }

    log.info(
      { event: 'boussole.save.ok', left_right: input.leftRight },
      'boussole result saved',
    );
    revalidatePath('/me');
    return { ok: true };
  } catch (error) {
    logError(log, error, { event: 'boussole.save.failed' });
    throw error;
  }
}
