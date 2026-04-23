/**
 * Integration — weighting pipeline: vote → snapshot → queue → view.
 *
 * Covers the core invariant of phase 1: calling submit_post_poll_vote
 * writes a frozen survey_respondent_snapshot in the SAME transaction
 * as the vote, enqueues a {poll_id} message in pgmq.weighting, and
 * surfaces the new confidence_* columns (with zero defaults) on
 * v_post_poll_summary.
 *
 * No mocks of the system under test. Real local Supabase, real RPC,
 * real trigger, real queue.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  createTestPoll,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';

interface PollHandle {
  slug: string;
  threadId: string;
  postItemId: string;
  optionIds: string[];
}

describe('weighting snapshot pipeline (integration)', () => {
  let poll: PollHandle;
  let seedClient: SupabaseClient;
  let ephUser: { email: string; userId: string };
  let ephClient: SupabaseClient;

  beforeAll(async () => {
    poll = await createTestPoll({
      title: `weighting snapshot ${Date.now()}`,
      question: 'Redressé ?',
      optionLabels: ['Oui', 'Non'],
    });
    seedClient = await userClient(SEED_USER.email);
    ephUser = await createEphemeralUser('eph-weighting');
    ephClient = await userClient(ephUser.email);

    // Give the seed user a full weighting profile.
    const admin = adminClient();
    await admin.from('user_private_political_profile').upsert(
      {
        user_id: SEED_USER.userId,
        date_of_birth: '1990-06-15',
        postal_code: '75001',
        sex: 'F',
        csp: 'employes',
        education: 'bac2',
      },
      { onConflict: 'user_id' },
    );
  });

  afterAll(async () => {
    const admin = adminClient();
    if (ephUser) await admin.auth.admin.deleteUser(ephUser.userId);
    if (poll) {
      await admin.from('thread_post').delete().eq('id', poll.postItemId);
      await admin.from('topic').delete().eq('id', poll.threadId);
    }
    // Drain the queue of any messages from previous runs in this suite.
    await admin.rpc(
      'pgmq_purge_queue' as never,
      {
        queue_name: 'weighting',
      } as never,
    );
  });

  beforeEach(async () => {
    const admin = adminClient();
    await admin
      .from('post_poll_response')
      .delete()
      .eq('post_item_id', poll.postItemId);
    await admin
      .from('survey_respondent_snapshot')
      .delete()
      .eq('poll_id', poll.postItemId);
  });

  async function queueDepth(): Promise<number> {
    const admin = adminClient();
    const { data, error } = await admin.rpc('weighting_queue_depth', {
      p_poll_id: poll.postItemId,
    });
    if (error) throw error;
    return Number(data ?? 0);
  }

  it('full-profile vote writes a snapshot with derived fields and is_partial=false', async () => {
    const before = await queueDepth();
    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: snap } = await admin
      .from('survey_respondent_snapshot')
      .select(
        'user_id, option_id, age_bucket, sex, region, csp, education, is_partial, ref_as_of',
      )
      .eq('poll_id', poll.postItemId)
      .single();

    expect(snap).not.toBeNull();
    expect(snap?.user_id).toBe(SEED_USER.userId);
    expect(snap?.option_id).toBe(poll.optionIds[0]);
    expect(snap?.age_bucket).toBe('35_49'); // 1990-06-15
    expect(snap?.sex).toBe('F');
    expect(snap?.region).toBe('11'); // 75001 → Île-de-France
    expect(snap?.csp).toBe('employes');
    expect(snap?.education).toBe('bac2');
    expect(snap?.is_partial).toBe(false);
    expect(snap?.ref_as_of).toBe('2022-04-15');

    expect(await queueDepth()).toBe(before + 1);
  });

  it('partial-profile vote still writes a snapshot, marked is_partial=true', async () => {
    const before = await queueDepth();

    // ephemeral user: no private profile rows → everything null.
    const { error } = await ephClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[1],
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: snap } = await admin
      .from('survey_respondent_snapshot')
      .select('is_partial, age_bucket, sex, region, csp, education')
      .eq('poll_id', poll.postItemId)
      .eq('user_id', ephUser.userId)
      .single();

    expect(snap?.is_partial).toBe(true);
    expect(snap?.age_bucket).toBeNull();
    expect(snap?.sex).toBeNull();
    expect(snap?.region).toBeNull();
    expect(await queueDepth()).toBe(before + 1);
  });

  it('re-vote rejection leaves snapshot + queue unchanged (rolled back)', async () => {
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });
    const before = await queueDepth();

    const { error } = await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[1],
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/already voted/i);

    const admin = adminClient();
    const { count } = await admin
      .from('survey_respondent_snapshot')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', poll.postItemId);
    expect(count).toBe(1);

    // Re-vote should NOT have enqueued a second message (rolled back tx).
    expect(await queueDepth()).toBe(before);
  });

  it('view surfaces the new confidence_* columns with zero defaults when no estimate exists', async () => {
    await seedClient.rpc('submit_post_poll_vote', {
      p_post_item_id: poll.postItemId,
      p_option_id: poll.optionIds[0],
    });

    const admin = adminClient();
    const { data } = await admin
      .from('v_post_poll_summary')
      .select(
        'sample_size, confidence_score, confidence_band, confidence_components, is_final, representativity_score',
      )
      .eq('post_item_id', poll.postItemId)
      .single();

    expect(data?.sample_size).toBe(1);
    expect(data?.confidence_score).toBe(0);
    expect(data?.confidence_band).toBe('indicatif');
    expect(data?.confidence_components).toEqual({});
    expect(data?.is_final).toBe(false);
    // Legacy mirror — must equal the new aggregate.
    expect(Number(data?.representativity_score)).toBe(0);
  });
});
