import { createLogger } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('data.boussole-trajectory');

export interface BoussolePoint {
  id: string;
  /** Position gauche↔droite dans [-1, 1] (négatif = gauche). */
  leftRight: number;
  topPartySlug: string | null;
  takenAt: string;
}

/**
 * Historique des positions Boussole de l'utilisateur courant (FR-41).
 * RLS owner-only : ne renvoie jamais que les siennes. Ordonné chronologiquement.
 */
export async function getBoussoleTrajectory(): Promise<BoussolePoint[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('boussole_result')
    .select('id, left_right, top_party_slug, taken_at')
    .order('taken_at', { ascending: true });

  if (error) {
    log.error(
      { event: 'boussole.trajectory.load_failed', message: error.message },
      'trajectory load failed',
    );
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    leftRight: Number(row.left_right),
    topPartySlug: (row.top_party_slug as string | null) ?? null,
    takenAt: String(row.taken_at),
  }));
}
