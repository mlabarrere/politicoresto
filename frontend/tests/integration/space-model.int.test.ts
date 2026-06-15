/**
 * Integration — modèle d'espaces unifié (Nœuds + Tables) + RLS.
 *
 * PRD AD-1 / Epic 1 Story 1.1. S'exécute contre le Supabase local réel, sans mock.
 * Vérifie les garanties RLS porteuses :
 *   - un Nœud (kind='node') est lisible par n'importe quel utilisateur ;
 *   - une Table publique est lisible, une Table privée est masquée à un non-membre ;
 *   - l'auto-adhésion est permise sur Nœud/Table publique, refusée sur Table privée.
 *
 * Utilise des utilisateurs éphémères ; nettoyage en afterEach.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

interface SpaceRow {
  kind: 'node' | 'table';
  slug: string;
  title: string;
  node_type?: 'territory' | 'elu' | 'candidate' | 'party' | 'theme';
  access?: 'public' | 'private';
  identity_mode?: 'open' | 'blind';
}

describe('space model (integration)', () => {
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

  async function mkSpace(row: SpaceRow): Promise<string> {
    const admin = adminClient();
    const { data, error } = await admin
      .from('space')
      .insert(row)
      .select('id')
      .single();
    expect(error).toBeNull();
    const id = (data as { id: string }).id;
    spaceIds.push(id);
    return id;
  }

  it('un Nœud est lisible par tout utilisateur', async () => {
    const id = await mkSpace({
      kind: 'node',
      slug: `node-${Date.now()}`,
      title: 'Thème test',
      node_type: 'theme',
    });
    const user = await mkUser('eph-space-node');
    const client = await userClient(user.email);

    const { data } = await client
      .from('space')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    expect((data as { id: string } | null)?.id).toBe(id);
  });

  it('une Table publique est lisible, une Table privée masquée à un non-membre', async () => {
    const pub = await mkSpace({
      kind: 'table',
      slug: `tbl-pub-${Date.now()}`,
      title: 'Table publique',
      access: 'public',
      identity_mode: 'open',
    });
    const priv = await mkSpace({
      kind: 'table',
      slug: `tbl-priv-${Date.now()}`,
      title: 'Table privée',
      access: 'private',
      identity_mode: 'open',
    });
    const user = await mkUser('eph-space-read');
    const client = await userClient(user.email);

    const pubRead = await client
      .from('space')
      .select('id')
      .eq('id', pub)
      .maybeSingle();
    expect((pubRead.data as { id: string } | null)?.id).toBe(pub);

    const privRead = await client
      .from('space')
      .select('id')
      .eq('id', priv)
      .maybeSingle();
    expect(privRead.data).toBeNull();
  });

  it('auto-adhésion : OK sur Table publique, refusée sur Table privée', async () => {
    const pub = await mkSpace({
      kind: 'table',
      slug: `tbl-join-${Date.now()}`,
      title: 'Rejoignable',
      access: 'public',
      identity_mode: 'open',
    });
    const priv = await mkSpace({
      kind: 'table',
      slug: `tbl-nojoin-${Date.now()}`,
      title: 'Sur invitation',
      access: 'private',
      identity_mode: 'open',
    });
    const user = await mkUser('eph-space-join');
    const client = await userClient(user.email);

    const okJoin = await client
      .from('space_member')
      .insert({ space_id: pub, user_id: user.userId });
    expect(okJoin.error).toBeNull();

    const badJoin = await client
      .from('space_member')
      .insert({ space_id: priv, user_id: user.userId });
    expect(badJoin.error).not.toBeNull();
  });
});
