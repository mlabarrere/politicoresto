/**
 * Integration — account settings.
 *
 * Exercises the four major user-facing mutations on `app_profile` plus
 * the private-profile RPC, all against real local Supabase. No mocks.
 * Uses ephemeral users so destructive operations never touch the seed
 * user.
 *
 * Operations under test:
 *   - Identity upsert (display_name, bio, is_public_profile_enabled)
 *   - Username claim / rename (with case-insensitive uniqueness via citext)
 *   - Private profile upsert via rpc_upsert_private_political_profile
 *   - Deactivation (profile_status='limited', is_public_profile_enabled=false)
 *   - Deletion (profile_status='deleted', bio cleared)
 *
 * Privacy/RLS boundary: user B can never mutate user A's row — tested
 * once as a gate, since the same RLS policy protects every UPDATE path.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  createEphemeralUser,
  userClient,
} from '../fixtures/supabase-admin';

describe('account settings (integration)', () => {
  const ephemeralIds: string[] = [];

  afterEach(async () => {
    const admin = adminClient();
    for (const id of ephemeralIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  async function mkUser(handle: string) {
    const user = await createEphemeralUser(handle);
    ephemeralIds.push(user.userId);
    return user;
  }

  // ── Identity ───────────────────────────────────────────────────────────

  it('owner: can update display_name, bio, is_public_profile_enabled', async () => {
    const user = await mkUser(`acc-ident-${Date.now()}`);
    const client = await userClient(user.email);

    const { error } = await client
      .from('app_profile')
      .update({
        display_name: 'Renamed',
        bio: 'my new bio',
        is_public_profile_enabled: true,
      })
      .eq('user_id', user.userId);
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('app_profile')
      .select('display_name, bio, is_public_profile_enabled')
      .eq('user_id', user.userId)
      .single();
    expect(row?.display_name).toBe('Renamed');
    expect(row?.bio).toBe('my new bio');
    expect(row?.is_public_profile_enabled).toBe(true);
  });

  it('owner: can change username; case-insensitive uniqueness prevents collision', async () => {
    const incumbent = await mkUser(`incumbent-${Date.now()}`);
    const renamer = await mkUser(`renamer-${Date.now()}`);

    // The incumbent already claimed a username via createEphemeralUser.
    const admin = adminClient();
    const { data: incumbentRow } = await admin
      .from('app_profile')
      .select('username')
      .eq('user_id', incumbent.userId)
      .single();
    const taken = String(incumbentRow!.username);

    // Renamer tries to grab the same username in a different case.
    const client = await userClient(renamer.email);
    const { error } = await client
      .from('app_profile')
      .update({ username: taken.toUpperCase() })
      .eq('user_id', renamer.userId);

    // Postgres unique-violation SQLSTATE surfaces as 23505 through PostgREST.
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });

  // ── Private profile (RPC) ──────────────────────────────────────────────

  it('owner: upsert private political profile via RPC', async () => {
    const user = await mkUser(`acc-priv-${Date.now()}`);
    const client = await userClient(user.email);

    const { error } = await client.rpc('rpc_upsert_private_political_profile', {
      p_declared_partisan_term_id: null,
      p_declared_ideology_term_id: null,
      p_notes_private: 'private note',
      p_profile_payload: {
        socio_professional_category: 'cadre',
        employment_status: 'employed',
        education_level: 'master',
      },
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('user_private_political_profile')
      .select('notes_private, profile_payload')
      .eq('user_id', user.userId)
      .single();
    expect(row?.notes_private).toBe('private note');
    // socio_professional_category / employment_status / education_level
    // are all stored in profile_payload jsonb (not direct columns).
    expect(
      (row?.profile_payload as { socio_professional_category?: string })
        ?.socio_professional_category,
    ).toBe('cadre');
  });

  it('owner: can clear private profile via RPC (notes reset)', async () => {
    const user = await mkUser(`acc-priv-clear-${Date.now()}`);
    const client = await userClient(user.email);

    await client.rpc('rpc_upsert_private_political_profile', {
      p_declared_partisan_term_id: null,
      p_declared_ideology_term_id: null,
      p_notes_private: 'will be cleared',
      p_profile_payload: {},
    });

    const { error } = await client.rpc('rpc_delete_private_political_profile');
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('user_private_political_profile')
      .select('notes_private')
      .eq('user_id', user.userId)
      .maybeSingle();
    // Either row is gone or notes_private is null — both are "cleared".
    expect(row === null || row.notes_private === null).toBe(true);
  });

  // ── Deactivation ───────────────────────────────────────────────────────

  it('owner: UPDATE profile_status=limited succeeds (deactivation)', async () => {
    const user = await mkUser(`acc-deact-${Date.now()}`);
    const client = await userClient(user.email);

    const { error } = await client
      .from('app_profile')
      .update({ profile_status: 'limited', is_public_profile_enabled: false })
      .eq('user_id', user.userId);
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('app_profile')
      .select('profile_status, is_public_profile_enabled')
      .eq('user_id', user.userId)
      .single();
    expect(row?.profile_status).toBe('limited');
    expect(row?.is_public_profile_enabled).toBe(false);
  });

  // ── Deletion ───────────────────────────────────────────────────────────

  it('owner: UPDATE profile_status=deleted clears bio and flips visibility', async () => {
    const user = await mkUser(`acc-del-${Date.now()}`);
    const client = await userClient(user.email);

    // First set a bio so we can verify it's cleared.
    await client
      .from('app_profile')
      .update({ bio: 'present' })
      .eq('user_id', user.userId);

    const { error } = await client
      .from('app_profile')
      .update({
        profile_status: 'deleted',
        is_public_profile_enabled: false,
        bio: null,
      })
      .eq('user_id', user.userId);
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('app_profile')
      .select('profile_status, bio, is_public_profile_enabled')
      .eq('user_id', user.userId)
      .single();
    expect(row?.profile_status).toBe('deleted');
    expect(row?.bio).toBeNull();
    expect(row?.is_public_profile_enabled).toBe(false);
  });

  // ── RLS boundary (one gate covers all UPDATE paths) ────────────────────

  it('user B cannot mutate user A app_profile row (covers identity, deactivate, delete)', async () => {
    const userA = await mkUser(`acc-A-${Date.now()}`);
    const userB = await mkUser(`acc-B-${Date.now()}`);
    const clientB = await userClient(userB.email);

    await clientB
      .from('app_profile')
      .update({
        profile_status: 'limited',
        bio: 'hijacked',
        display_name: 'Hijacker',
      })
      .eq('user_id', userA.userId);

    const admin = adminClient();
    const { data: row } = await admin
      .from('app_profile')
      .select('profile_status, bio, display_name')
      .eq('user_id', userA.userId)
      .single();
    expect(row?.profile_status).toBe('active');
    expect(row?.bio).toBeNull();
    expect(row?.display_name).not.toBe('Hijacker');
  });
});
