/**
 * Integration — RPC create_space (write-path atomique du modèle d'espaces).
 *
 * PRD AD-1 / FR-6 / FR-9. Supabase local réel, sans mock.
 * Garanties vérifiées :
 *   - création atomique espace + membership du créateur ;
 *   - le créateur d'une Table privée en est OWNER et peut donc la lire
 *     (sinon invisible : pas de membership auto + self-join refuse les privées) ;
 *   - verification reste 'unverified' (officialisation = service_role uniquement).
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

describe('create_space RPC (integration)', () => {
  const ephemeralIds: string[] = [];
  const spaceIds: string[] = [];

  afterEach(async () => {
    const admin = adminClient();
    for (const id of spaceIds.splice(0)) {
      await admin.from('space').delete().eq('id', id);
    }
    for (const id of ephemeralIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  async function mkUser(
    handle: string,
  ): Promise<{ email: string; userId: string }> {
    const user = await createEphemeralUser(handle);
    ephemeralIds.push(user.userId);
    return user;
  }

  it('crée une Table privée dont le créateur est owner et qu’il peut lire', async () => {
    const user = await mkUser('eph-create-rpc');
    const client = await userClient(user.email);

    const { data, error } = await client.rpc('create_space', {
      p_kind: 'table',
      p_title: 'Club privé',
      p_access: 'private',
      p_identity_mode: 'open',
    });
    expect(error).toBeNull();

    const space = data as { id: string; verification: string };
    spaceIds.push(space.id);
    expect(space.verification).toBe('unverified');

    // Le créateur peut lire sa table privée (membership owner posée par la RPC).
    const read = await client
      .from('space')
      .select('id')
      .eq('id', space.id)
      .maybeSingle();
    expect((read.data as { id: string } | null)?.id).toBe(space.id);

    // Membership owner présente.
    const mem = await client
      .from('space_member')
      .select('role')
      .eq('space_id', space.id)
      .eq('user_id', user.userId)
      .maybeSingle();
    expect((mem.data as { role: string } | null)?.role).toBe('owner');
  });

  it('crée un Nœud dont le créateur est simple membre', async () => {
    const user = await mkUser('eph-create-node');
    const client = await userClient(user.email);

    const { data, error } = await client.rpc('create_space', {
      p_kind: 'node',
      p_title: `Thème ${Date.now()}`,
      p_node_type: 'theme',
    });
    expect(error).toBeNull();

    const space = data as { id: string };
    spaceIds.push(space.id);

    const mem = await client
      .from('space_member')
      .select('role')
      .eq('space_id', space.id)
      .eq('user_id', user.userId)
      .maybeSingle();
    expect((mem.data as { role: string } | null)?.role).toBe('member');
  });
});
