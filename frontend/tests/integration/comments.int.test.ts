/**
 * Integration — comments (create, reply, edit, delete, RLS).
 *
 * Exercises the three comment RPCs against the real local Supabase stack:
 *   - create_comment(p_thread_post_id, p_parent_post_id, p_body_markdown)
 *   - rpc_update_comment(p_comment_id, p_body_markdown)
 *   - rpc_delete_comment(p_comment_id) -- soft delete: sets post_status='removed'
 *
 * No mocks. Uses magic-link auth for the seed user + a second ephemeral
 * user to exercise RLS boundaries (user B cannot edit/delete user A's
 * comment). The API route in `frontend/app/api/comments/route.ts` is a
 * thin wrapper around these RPCs — rate limit + auth check + shape
 * translation. Covered by E2E; RPCs themselves are covered here.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createEphemeralUser,
  createTestPost,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';

describe('comments (integration)', () => {
  let seedClient: SupabaseClient;
  let otherClient: SupabaseClient;
  let otherUser: { email: string; userId: string };
  let post: { slug: string; threadId: string; postItemId: string };

  beforeAll(async () => {
    // One fresh post per suite; tear down everything at the end so no
    // cross-suite pollution.
    const admin = adminClient();
    await admin.from('thread_post').delete().eq('created_by', SEED_USER.userId);

    post = await createTestPost('comments integration post');
    seedClient = await userClient(SEED_USER.email);
    otherUser = await createEphemeralUser('eph-commenter');
    otherClient = await userClient(otherUser.email);
  });

  afterAll(async () => {
    const admin = adminClient();
    if (otherUser) await admin.auth.admin.deleteUser(otherUser.userId);
    if (post) {
      await admin.from('thread_post').delete().eq('id', post.postItemId);
      await admin.from('topic').delete().eq('id', post.threadId);
    }
  });

  beforeEach(async () => {
    // Wipe comments between tests so state is predictable. Admin delete
    // is a hard delete; the app uses soft-delete (status='removed') which
    // we specifically verify in the delete test.
    const admin = adminClient();
    await admin.from('post').delete().eq('thread_post_id', post.postItemId);
  });

  it('create_comment: top-level comment persists with expected shape', async () => {
    const { data, error } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'First top-level comment',
    });
    expect(error).toBeNull();

    // RPC returns a single row (public.post shape).
    const row = Array.isArray(data) ? data[0] : data;
    expect(row.id).toBeTruthy();
    expect(row.parent_post_id).toBeNull();
    expect(row.thread_post_id).toBe(post.postItemId);
    expect(row.body_markdown).toBe('First top-level comment');
    expect(row.author_user_id).toBe(SEED_USER.userId);
    expect(row.post_status).toBe('visible');
    expect(row.depth).toBe(0);
  });

  it('create_comment: nested reply sets parent_post_id and depth=1', async () => {
    const { data: parent } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'parent',
    });
    const parentId = (Array.isArray(parent) ? parent[0] : parent).id;

    const { data: child, error } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: parentId,
      p_body_markdown: 'child reply',
    });
    expect(error).toBeNull();
    const childRow = Array.isArray(child) ? child[0] : child;
    expect(childRow.parent_post_id).toBe(parentId);
    expect(childRow.depth).toBe(1);
  });

  it('create_comment: 3rd-level reply sets depth=2', async () => {
    const mk = async (parentId: string | null, body: string) => {
      const { data } = await seedClient.rpc('create_comment', {
        p_thread_post_id: post.postItemId,
        p_parent_post_id: parentId,
        p_body_markdown: body,
      });
      return (Array.isArray(data) ? data[0] : data).id as string;
    };
    const l0 = await mk(null, 'root');
    const l1 = await mk(l0, 'lvl1');
    const { data: l2, error } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: l1,
      p_body_markdown: 'lvl2',
    });
    expect(error).toBeNull();
    expect((Array.isArray(l2) ? l2[0] : l2).depth).toBe(2);
  });

  it('rpc_update_comment: author can edit own comment; edited_at set', async () => {
    const { data: created } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'original',
    });
    const id = (Array.isArray(created) ? created[0] : created).id as string;

    const { error } = await seedClient.rpc('rpc_update_comment', {
      p_comment_id: id,
      p_body_markdown: 'edited',
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('post')
      .select('body_markdown, edited_at')
      .eq('id', id)
      .single();
    expect(row?.body_markdown).toBe('edited');
    expect(row?.edited_at).toBeTruthy();
  });

  it('rpc_update_comment: non-author cannot edit (RLS/RPC rejects)', async () => {
    const { data: created } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'seed-user content',
    });
    const id = (Array.isArray(created) ? created[0] : created).id as string;

    const { error } = await otherClient.rpc('rpc_update_comment', {
      p_comment_id: id,
      p_body_markdown: 'hijack',
    });
    expect(error).not.toBeNull();

    // Body must NOT have been updated.
    const admin = adminClient();
    const { data: row } = await admin
      .from('post')
      .select('body_markdown')
      .eq('id', id)
      .single();
    expect(row?.body_markdown).toBe('seed-user content');
  });

  it('rpc_delete_comment: author soft-deletes (status=removed, body cleared)', async () => {
    const { data: created } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'will be deleted',
    });
    const id = (Array.isArray(created) ? created[0] : created).id as string;

    const { error } = await seedClient.rpc('rpc_delete_comment', {
      p_comment_id: id,
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('post')
      .select('post_status, body_markdown, removed_at')
      .eq('id', id)
      .single();
    expect(row?.post_status).toBe('removed');
    expect(row?.body_markdown === null || row?.body_markdown === '').toBe(true);
    expect(row?.removed_at).toBeTruthy();
  });

  it('rpc_delete_comment: non-author cannot delete', async () => {
    const { data: created } = await seedClient.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'seed-user content',
    });
    const id = (Array.isArray(created) ? created[0] : created).id as string;

    const { error } = await otherClient.rpc('rpc_delete_comment', {
      p_comment_id: id,
    });
    expect(error).not.toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('post')
      .select('post_status')
      .eq('id', id)
      .single();
    expect(row?.post_status).toBe('visible');
  });

  it('create_comment: anonymous (no auth) is rejected', async () => {
    const { getLocalSupabase } = await import('../fixtures/supabase-admin');
    const { createClient } = await import('@supabase/supabase-js');
    const { apiUrl, publishableKey } = getLocalSupabase();
    const anon = createClient(apiUrl, publishableKey);

    const { error } = await anon.rpc('create_comment', {
      p_thread_post_id: post.postItemId,
      p_parent_post_id: null,
      p_body_markdown: 'nope',
    });
    expect(error).not.toBeNull();
  });
});
