/**
 * Integration — seed de la Boussole (thèses + positions des partis).
 * Valide que la migration `20260614150000_boussole_schema` s'applique et seede.
 * Supabase local réel.
 */
import { describe, expect, it } from 'vitest';
import { adminClient } from '../fixtures/supabase-admin';

describe('boussole seed (integration)', () => {
  it('seede 5 thèses ordonnées', async () => {
    const admin = adminClient();
    const { data, error } = await admin
      .from('boussole_thesis')
      .select('ordering')
      .order('ordering', { ascending: true });

    expect(error).toBeNull();
    expect(data?.length).toBe(5);
    expect(
      (data ?? []).map((r) => (r as { ordering: number }).ordering),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('seede les positions des partis (≥ 20)', async () => {
    const admin = adminClient();
    const { data, error } = await admin
      .from('boussole_position')
      .select('thesis_id, entity_id, stance');

    expect(error).toBeNull();
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(20);
  });
});
