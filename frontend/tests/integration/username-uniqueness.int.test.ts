/**
 * Reference pattern: INTEGRATION test.
 *
 * Runs in Node against the REAL local Supabase stack. Exercises an
 * actual DB constraint, using the service-role admin client to set up
 * state and directly read ground truth. No mocks of Supabase or of the
 * system under test.
 *
 * This particular test locks in a hard project invariant:
 *   `app_profile.username` is `citext` with a UNIQUE constraint, so
 *   "Micky", "micky", and "MICKY" must be considered the same username.
 *   If someone ever changes the column type back to `text`, this test
 *   will fail and block the regression.
 *
 * Prerequisites: `supabase start` + `supabase db reset` (seed applied).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient } from '../fixtures/supabase-admin';

const PROBE_USERS = [
  { email: 'probe-a@example.test', username: 'Zaphod' },
  { email: 'probe-b@example.test', username: 'zaphod' }, // different case
] as const;

const [FIRST_PROBE, SECOND_PROBE] = PROBE_USERS;

describe('username uniqueness is case-insensitive (citext) [reference integration example]', () => {
  const admin = adminClient();
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // Clean any leftover probes from a previous aborted run so the test
    // is deterministic. Admin delete cascades to app_profile via FK.
    const { data: users } = await admin.auth.admin.listUsers();
    for (const u of users?.users ?? []) {
      if (u.email && PROBE_USERS.some((p) => p.email === u.email)) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it('accepts the first username and rejects a differently-cased duplicate', async () => {
    // Create the first auth user and claim the username "Zaphod".
    const { data: first, error: firstErr } = await admin.auth.admin.createUser({
      email: FIRST_PROBE.email,
      password: 'probe-password-123',
      email_confirm: true,
    });
    expect(firstErr).toBeNull();
    expect(first.user).toBeTruthy();
    createdUserIds.push(first.user!.id);

    const { error: firstProfileErr } = await admin.from('app_profile').upsert(
      {
        user_id: first.user!.id,
        username: FIRST_PROBE.username,
        display_name: FIRST_PROBE.username,
      },
      { onConflict: 'user_id' },
    );
    expect(firstProfileErr).toBeNull();

    // Create the second auth user and try to claim "zaphod" (same
    // username, different case). The citext UNIQUE constraint must
    // reject this.
    const { data: second, error: secondErr } =
      await admin.auth.admin.createUser({
        email: SECOND_PROBE.email,
        password: 'probe-password-123',
        email_confirm: true,
      });
    expect(secondErr).toBeNull();
    createdUserIds.push(second.user!.id);

    const { error: dupErr } = await admin.from('app_profile').upsert(
      {
        user_id: second.user!.id,
        username: SECOND_PROBE.username,
        display_name: SECOND_PROBE.username,
      },
      { onConflict: 'user_id' },
    );

    expect(dupErr).not.toBeNull();
    // Postgres unique-violation SQLSTATE. PostgREST surfaces it as 23505.
    expect(dupErr?.code).toBe('23505');
  });
});
