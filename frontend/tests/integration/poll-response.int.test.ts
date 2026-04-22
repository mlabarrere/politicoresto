/**
 * Integration — poll response (user votes on a poll).
 *
 * RPC: submit_post_poll_vote(p_post_item_id, p_option_id) → v_post_poll_summary row.
 * Table: post_poll_response (UNIQUE on (post_item_id, user_id), weight defaults 1).
 *
 * These tests document ACTUAL behaviour, not the product spec. Known
 * spec gaps (verified in deep-map and asserted here so they are tracked):
 *   - "vote is single; cannot be modified" — RPC uses `on conflict do
 *     update`, so re-voting succeeds and overwrites. Asserted explicitly.
 *   - "weighted/corrected results" — view returns weighted_count = raw
 *     count; confidence scores hardcoded. Not covered; flagged as
 *     product work, not a test gap.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  createTestPoll,
  getLocalSupabase,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';

describe('poll response (integration)', () => {
  let seedClient: SupabaseClient;
  let otherClient: SupabaseClient;
  let otherUser: { email: string; userId: string };
  let poll: {
    slug: string;
    threadId: string;
    postItemId: string;
    optionIds: string[];
  };

  beforeAll(async () => {
    poll = await createTestPoll({
      title: `poll-response integration ${Date.now()}`,
      question: 'Pour ou contre ?',
      optionLabels: ['Pour', 'Contre', 'Sans avis'],
    });
    seedClient = await userClient(SEED_USER.email);
    otherUser = await createEphemeralUser('eph-voter-poll');
    otherClient = await userClient(otherUser.email);
  });

  afterAll(async () => {
    const admin = adminClient();
    if (otherUser) await admin.auth.admin.deleteUser(otherUser.userId);
    if (poll) {
      await admin.from('thread_post').delete().eq('id', poll.postItemId);
      await admin.from('topic').delete().eq('id', poll.threadId);
    }
  });

  beforeEach(async () => {
    const admin = adminClient();
    await admin
      .from('post_poll_response')
      .delete()
      .eq('post_item_id', poll.postItemId);
  });

  it('happy path: seed user votes, row persists, summary reflects raw count', async () => {
    const { data, error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    expect(error).toBeNull();

    // RPC returns the summary view row for the poll.
    const summary = Array.isArray(data) ? data[0] : data;
    expect(summary.post_item_id).toBe(poll.postItemId);
    expect(summary.selected_option_id).toBe(poll.optionIds[0]);

    // Ground truth: exactly one response row exists.
    const admin = adminClient();
    const { data: rows } = await admin
      .from('post_poll_response')
      .select('user_id, option_id')
      .eq('post_item_id', poll.postItemId);
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.user_id).toBe(SEED_USER.userId);
    expect(rows?.[0]?.option_id).toBe(poll.optionIds[0]);
  });

  it('aggregates across multiple voters correctly', async () => {
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    await otherClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[1],
    });

    const admin = adminClient();
    const { data: rows } = await admin
      .from('post_poll_response')
      .select('option_id')
      .eq('post_item_id', poll.postItemId);
    expect(rows?.length).toBe(2);
    // Two distinct options picked, one each.
    expect(new Set(rows?.map((r) => r.option_id)).size).toBe(2);
  });

  // eslint-disable-next-line vitest/prefer-lowercase-title -- "UNIQUE" is the SQL keyword being tested
  it('UNIQUE (post_item_id, user_id) never produces duplicate rows', async () => {
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[1],
    });

    const admin = adminClient();
    const { data: rows } = await admin
      .from('post_poll_response')
      .select('id')
      .eq('post_item_id', poll.postItemId)
      .eq('user_id', SEED_USER.userId);
    expect(rows?.length).toBe(1);
  });

  // eslint-disable-next-line vitest/prefer-lowercase-title -- title begins with deliberate SPEC-GAP marker so grep finds it fast
  it('SPEC GAP: RPC currently ALLOWS re-voting (on conflict do update) — documents actual vs spec', async () => {
    // Product spec: "user can vote ONCE per poll; cannot modify".
    // RPC reality: `on conflict do update` replaces the vote silently.
    // This assertion pins the CURRENT behaviour so any future fix that
    // rejects re-voting will break this test intentionally and force
    // the author to re-align the test with the spec.
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[1], // different option, same user
    });
    expect(error).toBeNull(); // ← spec says this should be an error

    const admin = adminClient();
    const { data: rows } = await admin
      .from('post_poll_response')
      .select('option_id')
      .eq('post_item_id', poll.postItemId)
      .eq('user_id', SEED_USER.userId)
      .single();
    expect(rows?.option_id).toBe(poll.optionIds[1]); // overwritten
  });

  it('deadline: voting on a deadline-passed poll is rejected ("Poll is closed")', async () => {
    const expired = await createTestPoll({
      title: `expired poll ${Date.now()}`,
      question: 'Q?',
      optionLabels: ['A', 'B'],
      deadlineHoursFromNow: 1,
    });

    // Force the deadline into the past via admin (simulate expiry).
    const admin = adminClient();
    await admin
      .from('post_poll')
      .update({
        deadline_at: new Date(Date.now() - 60_000).toISOString(),
        poll_status: 'open', // keep status open so the deadline branch is what trips
      })
      .eq('post_item_id', expired.postItemId);

    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: expired.postItemId,
      p_option_id: expired.optionIds[0],
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/closed/i);

    // Cleanup this expired poll.
    await admin.from('thread_post').delete().eq('id', expired.postItemId);
    await admin.from('topic').delete().eq('id', expired.threadId);
  });

  it('rejects a vote for an option that does not belong to the poll', async () => {
    const other = await createTestPoll({
      title: `other poll ${Date.now()}`,
      question: 'X?',
      optionLabels: ['X1', 'X2'],
    });

    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: other.optionIds[0], // option from a DIFFERENT poll
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/option/i);

    const admin = adminClient();
    await admin.from('thread_post').delete().eq('id', other.postItemId);
    await admin.from('topic').delete().eq('id', other.threadId);
  });

  it('anonymous user cannot cast a vote', async () => {
    const { apiUrl, publishableKey } = getLocalSupabase();
    const anon = createClient(apiUrl, publishableKey);
    const { error } = await anon.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    expect(error).not.toBeNull();
  });

  // ── Documented spec gaps (see report) — NOT tested here ─────────────────
  // - Weighted results (survey calibration): view returns raw = weighted.
  // - Confidence score: hardcoded. UI doesn't render anyway.
  // These need product/engineering work before they can be covered.
});
