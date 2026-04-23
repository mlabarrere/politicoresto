/**
 * Integration — poll response (user votes on a poll).
 *
 * RPC: submit_post_poll_vote(p_post_item_id, p_option_id) → v_post_poll_summary row.
 * Table: post_poll_response (UNIQUE on (post_item_id, user_id), weight defaults 1).
 *
 * Spec gap still open:
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

  it('re-voting is rejected and does not overwrite the original vote', async () => {
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[1],
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/already voted/i);

    const admin = adminClient();
    const { data: rows } = await admin
      .from('post_poll_response')
      .select('option_id')
      .eq('post_item_id', poll.postItemId)
      .eq('user_id', SEED_USER.userId)
      .single();
    expect(rows?.option_id).toBe(poll.optionIds[0]);
  });

  it('rejects a vote for an option that does not belong to the poll', async () => {
    // A random UUID that is guaranteed not to be a valid option for `poll`.
    // We cannot create a second seed-user poll here because `createTestPoll`
    // pre-wipes seed-user posts, which would delete the poll under test.
    const bogusOptionId = '00000000-0000-0000-0000-0000000000ff';

    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: bogusOptionId,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/option/i);
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

  // Kept last: this test calls createTestPoll, which pre-wipes every
  // seed-user post (including the `poll` created in beforeAll). Any test
  // placed after this one that still references `poll` will fail with
  // "Poll not found".
  it('deadline: voting on a deadline-passed poll is rejected ("Poll is closed")', async () => {
    const expired = await createTestPoll({
      title: `expired poll ${Date.now()}`,
      question: 'Q?',
      optionLabels: ['A', 'B'],
      deadlineHoursFromNow: 1,
    });

    const admin = adminClient();
    await admin
      .from('post_poll')
      .update({
        deadline_at: new Date(Date.now() - 60_000).toISOString(),
        poll_status: 'open',
      })
      .eq('post_item_id', expired.postItemId);

    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: expired.postItemId,
      p_option_id: expired.optionIds[0],
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/closed/i);

    await admin.from('thread_post').delete().eq('id', expired.postItemId);
    await admin.from('topic').delete().eq('id', expired.threadId);
  });

  // ── Documented spec gaps (see report) — NOT tested here ─────────────────
  // - Weighted results (survey calibration): view returns raw = weighted.
  // - Confidence score: hardcoded. UI doesn't render anyway.
  // These need product/engineering work before they can be covered.

  describe('poll edit — rpc_update_post_poll', () => {
    it('author edits question + option labels before any vote', async () => {
      const fresh = await createTestPoll({
        title: `poll-edit-fresh ${Date.now()}`,
        question: 'Q?',
        optionLabels: ['A', 'B'],
      });
      const seed = await userClient(SEED_USER.email);
      const { error } = await seed.rpc('rpc_update_post_poll', {
        p_post_item_id: fresh.postItemId,
        p_question: 'Nouvelle question ?',
        p_option_labels: ['Alpha', 'Beta'],
      });
      expect(error).toBeNull();

      const admin = adminClient();
      const { data: pollRow } = await admin
        .from('post_poll')
        .select('question')
        .eq('post_item_id', fresh.postItemId)
        .single();
      expect(pollRow?.question).toBe('Nouvelle question ?');
      const { data: opts } = await admin
        .from('post_poll_option')
        .select('label, sort_order')
        .eq('post_item_id', fresh.postItemId)
        .order('sort_order');
      expect(opts?.map((o) => o.label)).toEqual(['Alpha', 'Beta']);

      await admin.from('thread_post').delete().eq('id', fresh.postItemId);
      await admin.from('topic').delete().eq('id', fresh.threadId);
    });

    it('soft-lock: once a vote exists, edit is rejected', async () => {
      const locked = await createTestPoll({
        title: `poll-edit-locked ${Date.now()}`,
        question: 'Q?',
        optionLabels: ['A', 'B'],
      });
      const seed = await userClient(SEED_USER.email);
      await seed.rpc('submit_post_poll_vote', {
        p_post_item_id: locked.postItemId,
        p_option_id: locked.optionIds[0],
      });
      const { error } = await seed.rpc('rpc_update_post_poll', {
        p_post_item_id: locked.postItemId,
        p_question: 'Trop tard',
        p_option_labels: ['X', 'Y'],
      });
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/locked/i);

      const admin = adminClient();
      await admin.from('thread_post').delete().eq('id', locked.postItemId);
      await admin.from('topic').delete().eq('id', locked.threadId);
    });

    it('non-author is rejected with "not owned"', async () => {
      const other = await createTestPoll({
        title: `poll-edit-other ${Date.now()}`,
        question: 'Q?',
        optionLabels: ['A', 'B'],
      });
      const eph = await createEphemeralUser('eph-poll-edit-other');
      const ephClient = await userClient(eph.email);
      const { error } = await ephClient.rpc('rpc_update_post_poll', {
        p_post_item_id: other.postItemId,
        p_question: 'Hijack',
        p_option_labels: ['X', 'Y'],
      });
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not owned/i);

      const admin = adminClient();
      await admin.auth.admin.deleteUser(eph.userId);
      await admin.from('thread_post').delete().eq('id', other.postItemId);
      await admin.from('topic').delete().eq('id', other.threadId);
    });
  });
});
