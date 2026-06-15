import type {
  PartyPosition,
  Stance,
  ThesisAxisWeights,
} from '@/lib/boussole/scoring';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface BoussoleThesis {
  ordering: number;
  statement: string;
}

export interface BoussoleData {
  theses: BoussoleThesis[];
  parties: PartyPosition[];
  /** Poids gauche/droite par numéro de thèse (FR-41). */
  axisWeights: ThesisAxisWeights;
  /** Poids axe économique par numéro de thèse (FR-40). */
  economicWeights: ThesisAxisWeights;
  /** Poids axe culturel par numéro de thèse (FR-40). */
  culturalWeights: ThesisAxisWeights;
}

/**
 * Charge les thèses de la Boussole et les positions des partis (lecture publique).
 * Assemblage côté serveur ; le scoring reste côté client (single-player).
 */
export async function getBoussole(): Promise<BoussoleData> {
  const supabase = await createServerSupabaseClient();

  const [thesesRes, positionsRes, partiesRes] = await Promise.all([
    supabase
      .from('boussole_thesis')
      .select(
        'id, ordering, statement, left_right_weight, economic_weight, cultural_weight',
      )
      .order('ordering', { ascending: true }),
    supabase.from('boussole_position').select('thesis_id, entity_id, stance'),
    supabase.from('political_entity').select('id, slug, name').eq('type', 'party'),
  ]);

  if (thesesRes.error) throw thesesRes.error;
  if (positionsRes.error) throw positionsRes.error;
  if (partiesRes.error) throw partiesRes.error;

  const orderingByThesisId = new Map<string, number>();
  const axisWeights: ThesisAxisWeights = {};
  const economicWeights: ThesisAxisWeights = {};
  const culturalWeights: ThesisAxisWeights = {};
  const theses: BoussoleThesis[] = (thesesRes.data ?? []).map((row) => {
    const ordering = Number(row.ordering);
    orderingByThesisId.set(String(row.id), ordering);
    axisWeights[ordering] = Number(row.left_right_weight ?? 0);
    economicWeights[ordering] = Number(row.economic_weight ?? 0);
    culturalWeights[ordering] = Number(row.cultural_weight ?? 0);
    return { ordering, statement: String(row.statement) };
  });

  const partyById = new Map<string, { slug: string; name: string }>();
  for (const party of partiesRes.data ?? []) {
    partyById.set(String(party.id), {
      slug: String(party.slug),
      name: String(party.name),
    });
  }

  const partyMap = new Map<string, PartyPosition>();
  for (const position of positionsRes.data ?? []) {
    const party = partyById.get(String(position.entity_id));
    const ordering = orderingByThesisId.get(String(position.thesis_id));
    if (!party || ordering === undefined) continue;

    let entry = partyMap.get(party.slug);
    if (!entry) {
      entry = { party_slug: party.slug, party_name: party.name, stances: {} };
      partyMap.set(party.slug, entry);
    }
    entry.stances[ordering] = position.stance as Stance;
  }

  return {
    theses,
    parties: Array.from(partyMap.values()),
    axisWeights,
    economicWeights,
    culturalWeights,
  };
}
