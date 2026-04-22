/**
 * Integration — left/right political-classification vote.
 *
 * PoliticoResto-specific mechanism: users tag each post / comment /
 * sub-comment as "gauche" (left) or "droite" (right). Stored in
 * `public.reaction` with `reaction_type` ∈ {upvote=gauche, downvote=droite}
 * and `target_type` ∈ {thread_post, comment}. Unique index on
 * (target_type, target_id, user_id) enforces one vote per user per target.
 *
 * All mutations go through the `react_post(p_target_type, p_target_id,
 * p_reaction_type)` RPC, which handles three transitions:
 *   - existing match  → DELETE (toggle off)
 *   - existing differs → UPDATE reaction_type (switch side)
 *   - no prior vote   → INSERT (new)
 *
 * The aggregate counts used by the UI come from views `v_thread_posts`
 * and `v_post_comments` (gauche_count / droite_count columns). These
 * tests exercise both the RPC transitions AND the view math — nothing
 * mocked.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  createTestPost,
  getLocalSupabase,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';

async function createComment(
  client: SupabaseClient,
  threadPostId: string,
  body: string,
  parentPostId: string | null = null,
): Promise<string> {
  const { data, error } = await client.rpc('create_comment', {
    p_thread_post_id: threadPostId,
    p_parent_post_id: parentPostId,
    p_body_markdown: body,
  });
  if (error) throw new Error(`create_comment failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return row.id as string;
}

async function countsForPost(postItemId: string): Promise<{
  gauche: number;
  droite: number;
}> {
  const admin = adminClient();
  const { data } = await admin
    .from('v_thread_posts')
    .select('gauche_count, droite_count')
    .eq('id', postItemId)
    .single();
  return {
    gauche: Number(data?.gauche_count ?? 0),
    droite: Number(data?.droite_count ?? 0),
  };
}

async function countsForComment(commentId: string): Promise<{
  gauche: number;
  droite: number;
}> {
  const admin = adminClient();
  const { data } = await admin
    .from('v_post_comments')
    .select('gauche_count, droite_count')
    .eq('id', commentId)
    .single();
  return {
    gauche: Number(data?.gauche_count ?? 0),
    droite: Number(data?.droite_count ?? 0),
  };
}

describe('left/right vote (integration)', () => {
  let seedClient: SupabaseClient;
  let otherClient: SupabaseClient;
  let otherUser: { email: string; userId: string };
  let post: { slug: string; threadId: string; postItemId: string };
  let rootCommentId: string;
  let childCommentId: string;

  beforeAll(async () => {
    const admin = adminClient();
    await admin.from('thread_post').delete().eq('created_by', SEED_USER.userId);

    post = await createTestPost('left-right vote integration post');
    seedClient = await userClient(SEED_USER.email);
    otherUser = await createEphemeralUser('eph-voter');
    otherClient = await userClient(otherUser.email);

    // One root comment + one child (sub-comment) so the "vote on
    // sub-comment" path can be exercised too.
    rootCommentId = await createComment(
      seedClient,
      post.postItemId,
      'root comment for vote tests',
    );
    childCommentId = await createComment(
      seedClient,
      post.postItemId,
      'sub-comment for vote tests',
      rootCommentId,
    );
  });

  afterAll(async () => {
    const admin = adminClient();
    if (otherUser) await admin.auth.admin.deleteUser(otherUser.userId);
    if (post) {
      await admin.from('thread_post').delete().eq('id', post.postItemId);
      await admin.from('topic').delete().eq('id', post.threadId);
    }
  });

  afterEach(async () => {
    // Clear reactions between tests so each starts from a clean count.
    const admin = adminClient();
    await admin
      .from('reaction')
      .delete()
      .in('target_id', [post.postItemId, rootCommentId, childCommentId]);
  });

  // ── Posts ──────────────────────────────────────────────────────────────

  it('post: new gauche vote → counts are {gauche:1, droite:0}', async () => {
    const { error } = await seedClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'upvote',
    });
    expect(error).toBeNull();
    expect(await countsForPost(post.postItemId)).toEqual({
      gauche: 1,
      droite: 0,
    });
  });

  it('post: same-side re-vote toggles off → counts back to {0,0}', async () => {
    await seedClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'upvote',
    });
    const { error } = await seedClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'upvote',
    });
    expect(error).toBeNull();
    expect(await countsForPost(post.postItemId)).toEqual({
      gauche: 0,
      droite: 0,
    });
  });

  it('post: switch gauche → droite updates the row in place (unique constraint holds)', async () => {
    await seedClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'upvote',
    });
    const { error } = await seedClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'downvote',
    });
    expect(error).toBeNull();
    expect(await countsForPost(post.postItemId)).toEqual({
      gauche: 0,
      droite: 1,
    });

    // Ground truth: exactly ONE row per (user, target) thanks to UNIQUE.
    const admin = adminClient();
    const { data: rows } = await admin
      .from('reaction')
      .select('id, reaction_type')
      .eq('user_id', SEED_USER.userId)
      .eq('target_id', post.postItemId);
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.reaction_type).toBe('downvote');
  });

  it('post: two users independent votes accumulate correctly', async () => {
    await seedClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'upvote',
    });
    await otherClient.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'downvote',
    });
    expect(await countsForPost(post.postItemId)).toEqual({
      gauche: 1,
      droite: 1,
    });
  });

  // ── Comments ───────────────────────────────────────────────────────────

  it('comment: new gauche vote is aggregated in v_post_comments', async () => {
    const { error } = await seedClient.rpc('react_post', {
      p_target_type: 'comment',
      p_target_id: rootCommentId,
      p_reaction_type: 'upvote',
    });
    expect(error).toBeNull();
    expect(await countsForComment(rootCommentId)).toEqual({
      gauche: 1,
      droite: 0,
    });
  });

  it('sub-comment (depth≥1): vote bar works identically to root', async () => {
    const { error } = await seedClient.rpc('react_post', {
      p_target_type: 'comment',
      p_target_id: childCommentId,
      p_reaction_type: 'downvote',
    });
    expect(error).toBeNull();
    expect(await countsForComment(childCommentId)).toEqual({
      gauche: 0,
      droite: 1,
    });
  });

  it('comment: switch side updates in place (no duplicate rows)', async () => {
    await seedClient.rpc('react_post', {
      p_target_type: 'comment',
      p_target_id: rootCommentId,
      p_reaction_type: 'upvote',
    });
    await seedClient.rpc('react_post', {
      p_target_type: 'comment',
      p_target_id: rootCommentId,
      p_reaction_type: 'downvote',
    });
    const admin = adminClient();
    const { data: rows } = await admin
      .from('reaction')
      .select('id, reaction_type')
      .eq('user_id', SEED_USER.userId)
      .eq('target_id', rootCommentId);
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.reaction_type).toBe('downvote');
  });

  // ── Anonymous ──────────────────────────────────────────────────────────

  it('anonymous: RPC rejects when called without a session', async () => {
    const { apiUrl, publishableKey } = getLocalSupabase();
    const anon = createClient(apiUrl, publishableKey);
    const { error } = await anon.rpc('react_post', {
      p_target_type: 'thread_post',
      p_target_id: post.postItemId,
      p_reaction_type: 'upvote',
    });
    expect(error).not.toBeNull();
  });

  // ── UNIQUE constraint race guard ───────────────────────────────────────

  it('concurrent same-side votes from the same user never produce duplicate rows', async () => {
    // Fire two RPC calls in parallel — only one INSERT can succeed because
    // of the (target_type, target_id, user_id) UNIQUE. The other must
    // either DELETE (toggle) or fail cleanly. Final state: at most 1 row.
    await Promise.allSettled([
      seedClient.rpc('react_post', {
        p_target_type: 'thread_post',
        p_target_id: post.postItemId,
        p_reaction_type: 'upvote',
      }),
      seedClient.rpc('react_post', {
        p_target_type: 'thread_post',
        p_target_id: post.postItemId,
        p_reaction_type: 'upvote',
      }),
    ]);

    const admin = adminClient();
    const { data: rows } = await admin
      .from('reaction')
      .select('id')
      .eq('user_id', SEED_USER.userId)
      .eq('target_id', post.postItemId);
    expect(rows?.length).toBeLessThanOrEqual(1);
  });
});
