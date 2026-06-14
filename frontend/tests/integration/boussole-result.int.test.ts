import { afterEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

/**
 * Integration — Boussole : enregistrement de la position gauche/droite (FR-41).
 * Vérifie le RPC save_boussole_result, la borne [-1,1], et la RLS owner-only
 * (un autre membre ne voit jamais ta position). Données politiques privées.
 */
describe('save_boussole_result (integration)', () => {
  const ephemeralIds: string[] = [];

  afterEach(async () => {
    const admin = adminClient();
    for (const id of ephemeralIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it('les thèses portent un poids d’axe gauche/droite', async () => {
    const { data, error } = await adminClient()
      .from('boussole_thesis')
      .select('ordering, left_right_weight')
      .order('ordering');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(5);
    // Au moins une thèse de gauche (-1) et une de droite (+1).
    const weights = (data ?? []).map((r) => Number(r.left_right_weight));
    expect(weights).toContain(-1);
    expect(weights).toContain(1);
  });

  it('enregistre la position et l’isole par RLS (owner-only)', async () => {
    const owner = await createEphemeralUser('eph-bsl-owner');
    const other = await createEphemeralUser('eph-bsl-other');
    ephemeralIds.push(owner.userId, other.userId);

    const ownerClient = await userClient(owner.email);
    const save = await ownerClient.rpc('save_boussole_result', {
      p_left_right: -0.5,
      p_top_party_slug: 'lfi',
      p_answers: { 1: 'agree', 2: 'disagree' },
    });
    expect(save.error).toBeNull();
    expect(typeof save.data).toBe('string'); // uuid renvoyé

    // Le propriétaire lit sa position.
    const mine = await ownerClient
      .from('boussole_result')
      .select('left_right, top_party_slug');
    expect(mine.error).toBeNull();
    expect(mine.data?.length).toBe(1);
    expect(Number(mine.data?.[0]?.left_right)).toBeCloseTo(-0.5, 3);

    // Un autre membre ne voit RIEN (RLS owner-only).
    const otherClient = await userClient(other.email);
    const theirs = await otherClient
      .from('boussole_result')
      .select('left_right');
    expect(theirs.error).toBeNull();
    expect(theirs.data?.length).toBe(0);
  });

  it('rejette une position hors bornes [-1, 1]', async () => {
    const owner = await createEphemeralUser('eph-bsl-bounds');
    ephemeralIds.push(owner.userId);
    const ownerClient = await userClient(owner.email);

    const bad = await ownerClient.rpc('save_boussole_result', {
      p_left_right: 2,
      p_top_party_slug: null,
      p_answers: {},
    });
    expect(bad.error).not.toBeNull();
  });
});
