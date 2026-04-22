/**
 * Integration — post CRUD (edit + delete).
 *
 * IMPORTANT: these two RPCs exist and work correctly at the DB layer, but
 * NO UI CURRENTLY EXPOSES THEM. The frontend has no "edit post" or
 * "delete post" button — a grep for `rpc_update_thread_post` /
 * `rpc_delete_thread_post` in `frontend/` returns zero matches.
 *
 * These integration tests lock the backend contract in place so that
 * when the UI is eventually built, the authors can rely on:
 *   - author-only enforcement (current_user_id() = created_by)
 *   - soft-delete semantics (status='archived', metadata stamped)
 *   - anonymous rejection
 *
 * A companion "post CRUD" E2E spec does NOT exist yet — it CANNOT exist
 * until the UI does. Flagged as product work.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

describe('post CRUD (integration) — edit/delete RPCs (backend-only)', () => {
  let seedClient: SupabaseClient;
  let otherClient: SupabaseClient;
  let otherUser: { email: string; userId: string };
  let post: { slug: string; threadId: string; postItemId: string };

  beforeAll(async () => {
    post = await createTestPost(`post-crud integration ${Date.now()}`);
    seedClient = await userClient(SEED_USER.email);
    otherUser = await createEphemeralUser('eph-post-crud');
    otherClient = await userClient(otherUser.email);
  });

  afterAll(async () => {
    const admin = adminClient();
    await admin.auth.admin.deleteUser(otherUser.userId);
    await admin.from('thread_post').delete().eq('id', post.postItemId);
    await admin.from('topic').delete().eq('id', post.threadId);
  });

  beforeEach(async () => {
    // Restore the post to 'published' state + original content between
    // tests. The edit/delete RPCs mutate this row.
    const admin = adminClient();
    await admin
      .from('thread_post')
      .update({
        status: 'published',
        content: 'integration-test body',
        title: post.slug,
        metadata: {},
      })
      .eq('id', post.postItemId);
  });

  it('rpc_update_thread_post: author updates title + content successfully', async () => {
    const { error } = await seedClient.rpc('rpc_update_thread_post', {
      p_thread_post_id: post.postItemId,
      p_title: 'edited title',
      p_content: 'edited content',
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('thread_post')
      .select('title, content')
      .eq('id', post.postItemId)
      .single();
    expect(row?.title).toBe('edited title');
    expect(row?.content).toBe('edited content');
  });

  it('rpc_update_thread_post: non-author is rejected with "not owned"', async () => {
    const { error } = await otherClient.rpc('rpc_update_thread_post', {
      p_thread_post_id: post.postItemId,
      p_title: 'hijack attempt',
      p_content: null,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/not owned/i);

    // Ground truth: row unchanged.
    const admin = adminClient();
    const { data: row } = await admin
      .from('thread_post')
      .select('content')
      .eq('id', post.postItemId)
      .single();
    expect(row?.content).toBe('integration-test body');
  });

  it('rpc_delete_thread_post: author soft-deletes (status=archived, metadata stamped)', async () => {
    const { error } = await seedClient.rpc('rpc_delete_thread_post', {
      p_thread_post_id: post.postItemId,
    });
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('thread_post')
      .select('status, metadata')
      .eq('id', post.postItemId)
      .single();
    expect(row?.status).toBe('archived');
    expect(row?.metadata).toHaveProperty('archived_at');
  });

  it('rpc_delete_thread_post: non-author cannot archive', async () => {
    const { error } = await otherClient.rpc('rpc_delete_thread_post', {
      p_thread_post_id: post.postItemId,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/not owned/i);

    const admin = adminClient();
    const { data: row } = await admin
      .from('thread_post')
      .select('status')
      .eq('id', post.postItemId)
      .single();
    expect(row?.status).toBe('published');
  });

  it('rpc_delete_thread_post: anonymous is rejected', async () => {
    const { apiUrl, publishableKey } = getLocalSupabase();
    const anon = createClient(apiUrl, publishableKey);
    const { error } = await anon.rpc('rpc_delete_thread_post', {
      p_thread_post_id: post.postItemId,
    });
    expect(error).not.toBeNull();
  });

  it('rpc_update_thread_post: non-existent post id raises "not found"', async () => {
    const { error } = await seedClient.rpc('rpc_update_thread_post', {
      p_thread_post_id: '00000000-0000-0000-0000-000000000000',
      p_title: 'x',
      p_content: null,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/not found/i);
  });
});
