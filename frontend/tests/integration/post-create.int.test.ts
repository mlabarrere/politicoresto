/**
 * Integration — post creation RPC.
 *
 * Hits `rpc_create_post_full` on the real local Supabase stack as the
 * seeded user. Covers the three supported modes (text, poll, party-tagged)
 * and the two hard-failure paths (validation, rate limit). Nothing is
 * mocked; the RPC is the core of the feature and must be exercised as-is.
 *
 * State isolation: each test tears down the rows it created. The rate-limit
 * test is destructive (creates the daily cap) so it runs last; cleanup
 * deletes the user's `thread_post` rows (cascades to children).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adminClient, SEED_USER, userClient } from '../fixtures/supabase-admin';

async function deleteAllPostsBySeedUser(): Promise<void> {
  // Wipe the seed user's authored posts to keep each test deterministic
  // and to reset the 24h rate-limit counter.
  const admin = adminClient();
  await admin.from('thread_post').delete().eq('created_by', SEED_USER.userId);
}

describe('rpc_create_post_full (integration)', () => {
  beforeEach(deleteAllPostsBySeedUser);
  afterEach(deleteAllPostsBySeedUser);

  it('text post: writes thread_post and returns {thread_id, post_item_id}', async () => {
    const user = await userClient(SEED_USER.email);

    const { data, error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'integration text post',
        p_body: 'hello',
        p_mode: 'post',
      })
      .single();

    expect(error).toBeNull();
    const row = data as { thread_id: string; post_item_id: string };
    expect(row.thread_id).toBeTruthy();
    expect(row.post_item_id).toBeTruthy();

    // Ground-truth check via admin: the row actually landed.
    const admin = adminClient();
    const { data: persisted } = await admin
      .from('thread_post')
      .select('id, created_by, content')
      .eq('id', row.post_item_id)
      .single();
    expect(persisted?.created_by).toBe(SEED_USER.userId);
    expect(persisted?.content).toBe('hello');
  });

  it('poll post: persists poll rows (question + options) alongside the post', async () => {
    const user = await userClient(SEED_USER.email);

    const deadlineIso = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data, error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'integration poll',
        p_mode: 'poll',
        p_poll_question: 'Pour ou contre ?',
        p_poll_options: ['Pour', 'Contre'],
        p_poll_deadline_at: deadlineIso,
      })
      .single();

    expect(error).toBeNull();
    const row = data as { thread_id: string; post_item_id: string };

    const admin = adminClient();
    const { data: poll } = await admin
      .from('post_poll')
      .select('post_item_id, question, deadline_at')
      .eq('post_item_id', row.post_item_id)
      .single();
    expect(poll?.question).toBe('Pour ou contre ?');

    const { data: options } = await admin
      .from('post_poll_option')
      .select('label')
      .eq('post_item_id', row.post_item_id);
    expect(options?.map((o) => o.label).sort()).toEqual(['Contre', 'Pour']);
  });

  it('party-tagged post: persists the party_tags array on the thread_post row', async () => {
    const user = await userClient(SEED_USER.email);

    const { data, error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'integration tagged post',
        p_body: 'tagged',
        p_mode: 'post',
        p_party_tags: ['ps', 'lfi'],
      })
      .single();

    expect(error).toBeNull();
    const row = data as { thread_id: string; post_item_id: string };

    const admin = adminClient();
    const { data: persisted } = await admin
      .from('thread_post')
      .select('party_tags')
      .eq('id', row.post_item_id)
      .single();
    // Order-insensitive check — the RPC may canonicalize / sort.
    expect(persisted?.party_tags).toEqual(
      expect.arrayContaining(['ps', 'lfi']),
    );
  });

  it('poll: 4 options persist with stable sort_order', async () => {
    const user = await userClient(SEED_USER.email);
    const labels = ['option A', 'option B', 'option C', 'option D'];
    const { data, error } = await user
      .rpc('rpc_create_post_full', {
        p_title: '4-option poll',
        p_mode: 'poll',
        p_poll_question: 'Which?',
        p_poll_options: labels,
        p_poll_deadline_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .single();
    expect(error).toBeNull();
    const row = data as { post_item_id: string };

    const admin = adminClient();
    const { data: options } = await admin
      .from('post_poll_option')
      .select('label, sort_order')
      .eq('post_item_id', row.post_item_id)
      .order('sort_order', { ascending: true });
    expect(options?.map((o) => o.label)).toEqual(labels);
  });

  it('poll validation: empty question is rejected', async () => {
    const user = await userClient(SEED_USER.email);
    const { error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'bad poll — no question',
        p_mode: 'poll',
        p_poll_question: '   ',
        p_poll_options: ['A', 'B'],
        p_poll_deadline_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .single();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/poll question/i);
  });

  it('poll validation: deadline beyond 48h is rejected', async () => {
    const user = await userClient(SEED_USER.email);
    const { error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'bad poll — long deadline',
        p_mode: 'poll',
        p_poll_question: 'Q?',
        p_poll_options: ['A', 'B'],
        p_poll_deadline_at: new Date(
          Date.now() + 72 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .single();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/deadline|48h/i);
  });

  it('validation: poll mode with only one option is rejected by the RPC', async () => {
    const user = await userClient(SEED_USER.email);

    const { error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'bad poll',
        p_mode: 'poll',
        p_poll_question: 'Q?',
        p_poll_options: ['only one'],
        p_poll_deadline_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .single();

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/two poll options/i);
  });

  it('rate limit: 9th post in 24h is rejected with "Daily post limit reached"', async () => {
    // Belt-and-braces: wipe seed-user posts in case another suite's
    // afterAll hasn't propagated yet. Retry once if CASCADE chains lag.
    const admin = adminClient();
    for (let attempt = 0; attempt < 3; attempt++) {
      await admin
        .from('thread_post')
        .delete()
        .eq('created_by', SEED_USER.userId);
      const { count } = await admin
        .from('thread_post')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', SEED_USER.userId);
      if ((count ?? 0) === 0) break;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    }

    const user = await userClient(SEED_USER.email);

    for (let i = 0; i < 8; i++) {
      const { error } = await user
        .rpc('rpc_create_post_full', {
          p_title: `rate-limit post ${i}`,
          p_body: 'x',
          p_mode: 'post',
        })
        .single();
      if (error) {
        throw new Error(
          `post #${i + 1} should have succeeded; got: ${error.message}`,
        );
      }
    }

    const { error } = await user
      .rpc('rpc_create_post_full', {
        p_title: 'rate-limit post 9',
        p_body: 'x',
        p_mode: 'post',
      })
      .single();

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/daily post limit/i);
  });
});
