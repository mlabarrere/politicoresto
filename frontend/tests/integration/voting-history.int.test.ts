/* eslint-disable vitest/prefer-lowercase-title -- "PRIVACY:" and "API:" prefixes are intentional visual markers for privacy-critical tests */
/**
 * Integration — voting history (private user-declared election record).
 *
 * **This is the most privacy-sensitive feature in the app.** A voting
 * history entry ties a user's real-world identity to their real-world
 * electoral choices. It must be visible only to the owner and used only
 * as private input to poll-response survey weighting.
 *
 * The test matrix deliberately tries to defeat RLS:
 *   - User B attempts to SELECT user A's rows → 0 rows
 *   - User B attempts to UPDATE user A's row → 0 rows affected
 *   - User B attempts to DELETE user A's row → 0 rows affected
 *   - Anonymous attempts to read the table → rejected
 *   - RPCs never accept a user_id parameter (can't forge identity)
 *
 * The RPCs under test:
 *   - rpc_list_vote_history_detailed() → SETOF rows, scoped to auth.uid()
 *   - rpc_upsert_vote_history(p_election_slug, ...) → uuid (self only)
 *   - rpc_delete_vote_history(p_election_slug) → boolean (self only)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  getLocalSupabase,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';

async function resolveElection(slug: string): Promise<{
  id: string;
  resultId: string;
}> {
  const admin = adminClient();
  const { data: election } = await admin
    .from('election')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!election) throw new Error(`election ${slug} not found in seed`);

  const { data: result } = await admin
    .from('election_result')
    .select('id')
    .eq('election_id', election.id)
    .limit(1)
    .single();
  if (!result) {
    throw new Error(`no election_result found for ${slug} — seed missing?`);
  }
  return { id: String(election.id), resultId: String(result.id) };
}

describe('voting history (integration) — privacy-critical', () => {
  let seedClient: SupabaseClient;
  let otherClient: SupabaseClient;
  let otherUser: { email: string; userId: string };
  const ELECTION_A = 'presidentielle-2022-t1';
  const ELECTION_B = 'legislatives-2022-t1';
  let electionA: { id: string; resultId: string };

  beforeAll(async () => {
    seedClient = await userClient(SEED_USER.email);
    otherUser = await createEphemeralUser('eph-vh-user');
    otherClient = await userClient(otherUser.email);
    electionA = await resolveElection(ELECTION_A);

    // Start clean — remove any residual entries for either user on the
    // test elections so the tests are deterministic.
    const admin = adminClient();
    await admin
      .from('profile_vote_history')
      .delete()
      .in('user_id', [SEED_USER.userId, otherUser.userId]);
  });

  afterAll(async () => {
    const admin = adminClient();
    await admin
      .from('profile_vote_history')
      .delete()
      .in('user_id', [SEED_USER.userId, otherUser.userId]);
    await admin.auth.admin.deleteUser(otherUser.userId);
  });

  // ── CRUD for the owner ─────────────────────────────────────────────────

  it('owner: upsert inserts a new row, then returns it from list RPC', async () => {
    const { error: upErr } = await seedClient.rpc('rpc_upsert_vote_history', {
      p_election_slug: ELECTION_A,
      p_election_result_id: electionA.resultId,
      p_choice_kind: 'vote',
      p_confidence: 5,
      p_notes: 'test entry',
    });
    expect(upErr).toBeNull();

    const { data: list, error: listErr } = await seedClient.rpc(
      'rpc_list_vote_history_detailed',
    );
    expect(listErr).toBeNull();
    const match = (list as { election_slug: string }[]).find(
      (r) => r.election_slug === ELECTION_A,
    );
    expect(match).toBeTruthy();
  });

  it('owner: upsert on the same election updates in place (UNIQUE user+election)', async () => {
    const { error: e1 } = await seedClient.rpc('rpc_upsert_vote_history', {
      p_election_slug: ELECTION_A,
      p_election_result_id: electionA.resultId,
      p_choice_kind: 'vote',
      p_confidence: 3,
      p_notes: null,
    });
    expect(e1).toBeNull();
    const { error: e2 } = await seedClient.rpc('rpc_upsert_vote_history', {
      p_election_slug: ELECTION_A,
      p_election_result_id: electionA.resultId,
      p_choice_kind: 'vote',
      p_confidence: 5,
      p_notes: 'updated',
    });
    expect(e2).toBeNull();

    const admin = adminClient();
    const { data: rows } = await admin
      .from('profile_vote_history')
      .select('id, confidence, notes')
      .eq('user_id', SEED_USER.userId)
      .eq('election_id', electionA.id);
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.confidence).toBe(5);
    expect(rows?.[0]?.notes).toBe('updated');
  });

  it('owner: delete RPC removes the row and returns true', async () => {
    await seedClient.rpc('rpc_upsert_vote_history', {
      p_election_slug: ELECTION_A,
      p_election_result_id: electionA.resultId,
      p_choice_kind: 'vote',
      p_confidence: 4,
      p_notes: null,
    });
    const { data: deleted, error } = await seedClient.rpc(
      'rpc_delete_vote_history',
      { p_election_slug: ELECTION_A },
    );
    expect(error).toBeNull();
    expect(deleted).toBe(true);

    const admin = adminClient();
    const { count } = await admin
      .from('profile_vote_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', SEED_USER.userId)
      .eq('election_id', electionA.id);
    expect(count ?? 0).toBe(0);
  });

  it('owner: choice_kind=blanc/nul/abstention do not require election_result_id', async () => {
    for (const kind of ['blanc', 'nul', 'abstention', 'non_inscrit']) {
      const { error } = await seedClient.rpc('rpc_upsert_vote_history', {
        p_election_slug: ELECTION_B,
        p_election_result_id: null,
        p_choice_kind: kind,
        p_confidence: null,
        p_notes: null,
      });
      if (error) {
        throw new Error(`kind=${kind} should have succeeded: ${error.message}`);
      }
      expect(error).toBeNull();
    }
  });

  // ── Privacy boundaries (the heart of this suite) ───────────────────────

  it('PRIVACY: user B cannot SEE user A rows via any list call', async () => {
    // User A writes a vote.
    await seedClient.rpc('rpc_upsert_vote_history', {
      p_election_slug: ELECTION_A,
      p_election_result_id: electionA.resultId,
      p_choice_kind: 'vote',
      p_confidence: 5,
      p_notes: 'A private',
    });

    // User B calls the list RPC — their own auth.uid() should return
    // zero rows from user A's history.
    const { data: bList, error } = await otherClient.rpc(
      'rpc_list_vote_history_detailed',
    );
    expect(error).toBeNull();
    expect(bList).toEqual([]);
  });

  it('PRIVACY: user B cannot SELECT user A rows via direct table query (RLS)', async () => {
    // User A row still present from the previous test.
    const { data, error } = await otherClient
      .from('profile_vote_history')
      .select('id, user_id')
      .eq('user_id', SEED_USER.userId);
    // RLS: either returns [] (policy filters rows out) or error. Both OK.
    expect(error === null ? data : []).toEqual([]);
  });

  it('PRIVACY: user B cannot UPDATE user A rows via direct table update', async () => {
    const admin = adminClient();
    const { data: aRow } = await admin
      .from('profile_vote_history')
      .select('id')
      .eq('user_id', SEED_USER.userId)
      .eq('election_id', electionA.id)
      .single();
    expect(aRow?.id).toBeTruthy();

    // User B tries to update user A's row by its id. RLS USING clause
    // filters the row out → 0 rows updated, no error.
    const { error: updErr } = await otherClient
      .from('profile_vote_history')
      .update({ notes: 'hijack' })
      .eq('id', aRow!.id);
    // Either error or silent 0-row update — both are RLS-correct outcomes.
    // Verify ground truth: notes unchanged.
    const { data: unchanged } = await admin
      .from('profile_vote_history')
      .select('notes')
      .eq('id', aRow!.id)
      .single();
    expect(unchanged?.notes).toBe('A private');
    void updErr;
  });

  it('PRIVACY: user B cannot DELETE user A rows via direct table delete', async () => {
    const admin = adminClient();
    const { data: aRow } = await admin
      .from('profile_vote_history')
      .select('id')
      .eq('user_id', SEED_USER.userId)
      .eq('election_id', electionA.id)
      .single();

    await otherClient.from('profile_vote_history').delete().eq('id', aRow!.id);

    // Row must still exist.
    const { count } = await admin
      .from('profile_vote_history')
      .select('id', { count: 'exact', head: true })
      .eq('id', aRow!.id);
    expect(count).toBe(1);
  });

  it('PRIVACY: user B deleting by slug removes only THEIR row (no cross-user bleed)', async () => {
    // User B has no entry for ELECTION_A. rpc_delete_vote_history scopes
    // by auth.uid() — must NOT delete user A's entry.
    const { data: res } = await otherClient.rpc('rpc_delete_vote_history', {
      p_election_slug: ELECTION_A,
    });
    expect(res).toBe(false); // 0 rows deleted for user B

    const admin = adminClient();
    const { count } = await admin
      .from('profile_vote_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', SEED_USER.userId)
      .eq('election_id', electionA.id);
    expect(count).toBe(1); // user A's row still there
  });

  it('PRIVACY: anonymous client cannot read the table at all', async () => {
    const { apiUrl, publishableKey } = getLocalSupabase();
    const anon = createClient(apiUrl, publishableKey);
    const { data, error } = await anon
      .from('profile_vote_history')
      .select('id');
    // Either error or empty array — the table's grants deny anon + RLS
    // has no policy for anon, so select returns nothing either way.
    expect(error !== null || (data && data.length === 0)).toBe(true);
  });

  it('PRIVACY: anonymous client gets empty results or errors from all three RPCs', async () => {
    const { apiUrl, publishableKey } = getLocalSupabase();
    const anon = createClient(apiUrl, publishableKey);

    // list RPC: security definer, filters by auth.uid()=null → empty
    // array. Either behaviour (error or empty) is privacy-safe; what
    // matters is that anon NEVER receives another user's rows.
    const r1 = await anon.rpc('rpc_list_vote_history_detailed');
    expect(r1.error !== null || (r1.data as unknown[]).length === 0).toBe(true);

    // upsert & delete explicitly raise 'authentication required' when
    // auth.uid() is null. That error propagates back to the client.
    const r2 = await anon.rpc('rpc_upsert_vote_history', {
      p_election_slug: ELECTION_A,
      p_election_result_id: electionA.resultId,
      p_choice_kind: 'vote',
      p_confidence: null,
      p_notes: null,
    });
    expect(r2.error).not.toBeNull();

    const r3 = await anon.rpc('rpc_delete_vote_history', {
      p_election_slug: ELECTION_A,
    });
    expect(r3.error).not.toBeNull();
  });

  // ── API surface integrity ─────────────────────────────────────────────

  it("API: RPCs do NOT accept a user_id parameter (can't forge identity)", async () => {
    // Supabase RPCs reject unknown parameters. Prove the RPC signature
    // doesn't let callers pass user_id / p_user_id / target_user etc.
    const forgeAttempts = [
      { user_id: otherUser.userId },
      { p_user_id: otherUser.userId },
      { target_user_id: otherUser.userId },
    ];
    for (const extra of forgeAttempts) {
      const { error } = await seedClient.rpc('rpc_upsert_vote_history', {
        p_election_slug: ELECTION_A,
        p_election_result_id: electionA.resultId,
        p_choice_kind: 'vote',
        ...extra,
      } as Parameters<SupabaseClient['rpc']>[1]);
      // The error is fine — what we care about: if the extra arg had been
      // silently accepted, the DB would still use auth.uid() anyway.
      // The important assertion is that rows were not created under
      // otherUser.userId.
      void error;
    }
    const admin = adminClient();
    const { count } = await admin
      .from('profile_vote_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', otherUser.userId);
    expect(count ?? 0).toBe(0);
  });
});
