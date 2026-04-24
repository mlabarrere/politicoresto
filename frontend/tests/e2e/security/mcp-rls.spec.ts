/**
 * MCP security — RLS bypass attempts (B2).
 *
 * Tries to act as another user, escalate privileges, or bypass RLS
 * through PostgREST / RPC abuse. Every attempt must fail or be a no-op.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  adminClient,
  createEphemeralUser,
  createTestPost,
  SEED_USER,
} from '../../fixtures/supabase-admin';
import { mintAccessTokenFor } from '../helpers/mcp-token';

const MCP_URL = '/api/mcp/mcp';
const HEADERS_BASE = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
} as const;

async function callTool(
  request: APIRequestContext,
  bearer: string,
  name: string,
  args: Record<string, unknown>,
) {
  const headers = { ...HEADERS_BASE, authorization: `Bearer ${bearer}` };
  await request.post(MCP_URL, {
    headers,
    data: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'p', version: '0' },
      },
    }),
  });
  return request.post(MCP_URL, {
    headers,
    data: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
}

test.describe('mcp RLS — cannot act as someone else', () => {
  let other: { email: string; userId: string };
  let otherProfileBefore: {
    display_name: string | null;
    bio: string | null;
  } | null = null;
  let post: { slug: string; threadId: string; postItemId: string };

  test.beforeAll(async () => {
    other = await createEphemeralUser('mcp-rls-target');
    const admin = adminClient();
    const { data } = await admin
      .from('app_profile')
      .select('display_name, bio')
      .eq('user_id', other.userId)
      .single();
    otherProfileBefore = data as typeof otherProfileBefore;
    post = await createTestPost(`MCP RLS test ${Date.now()}`);
  });

  test.afterAll(async () => {
    const admin = adminClient();
    if (post) {
      await admin.from('post').delete().eq('thread_post_id', post.postItemId);
      await admin.from('thread_post').delete().eq('id', post.postItemId);
      await admin.from('topic').delete().eq('id', post.threadId);
    }
    if (other) await admin.auth.admin.deleteUser(other.userId);
  });

  test('user A cannot edit user B profile through edit_my_profile (no user_id arg accepted)', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor(SEED_USER.email);
    // The schema doesn't allow user_id, but a malicious caller could send
    // it anyway in the JSON args — Zod must strip it OR the server-side
    // .eq('user_id', auth.uid()) must protect.
    const res = await callTool(request, seedToken, 'edit_my_profile', {
      display_name: 'pwned-by-A',
      // Smuggle a user_id field — must be ignored by Zod's strict shape
      user_id: other.userId,
    });
    const body = await res.text();
    // Either Zod refuses the unknown key, OR the patch lands but the
    // .eq filter pins it to seed user. Verify B is intact either way.
    expect(body).toBeTruthy();

    const admin = adminClient();
    const { data: rowB } = await admin
      .from('app_profile')
      .select('display_name, bio')
      .eq('user_id', other.userId)
      .single();
    expect(rowB?.display_name).toBe(otherProfileBefore?.display_name);
    expect(rowB?.bio).toBe(otherProfileBefore?.bio);
  });

  test('user A cannot delete user B reaction via remove_my_reaction', async ({
    request,
  }) => {
    const admin = adminClient();
    const otherToken = await mintAccessTokenFor(other.email);
    await callTool(request, otherToken, 'react', {
      target_type: 'thread_post',
      target_id: post.postItemId,
      reaction_type: 'upvote',
    });

    // User A tries to remove B's reaction — server-side .eq('user_id',
    // caller.userId) means A targets only A's reactions, so B's stays.
    const seedToken = await mintAccessTokenFor(SEED_USER.email);
    await callTool(request, seedToken, 'remove_my_reaction', {
      target_type: 'thread_post',
      target_id: post.postItemId,
    });

    const { data: still } = await admin
      .from('reaction')
      .select('id, reaction_type')
      .eq('target_id', post.postItemId)
      .eq('user_id', other.userId)
      .maybeSingle();
    expect(still).toBeTruthy();
    expect(still?.reaction_type).toBe('upvote');

    // Cleanup
    await admin
      .from('reaction')
      .delete()
      .eq('target_id', post.postItemId)
      .eq('user_id', other.userId);
  });

  test('reading a private topic returns "not visible" not the row', async ({
    request,
  }) => {
    const admin = adminClient();
    // Create a private topic owned by B.
    const slug = `private-mcp-${Date.now()}`;
    const closeAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: topic, error: topicErr } = await admin
      .from('topic')
      .insert({
        slug,
        title: 'private to B',
        visibility: 'private',
        topic_status: 'open',
        created_by: other.userId,
        close_at: closeAt,
      })
      .select('id')
      .single();
    if (topicErr || !topic) {
      throw new Error(
        `private topic insert failed: ${topicErr?.message ?? 'no row'}`,
      );
    }

    try {
      const seedToken = await mintAccessTokenFor(SEED_USER.email);
      const res = await callTool(request, seedToken, 'read_topic', {
        id_or_slug: slug,
      });
      const body = await res.text();
      expect(body).toMatch(/not found|not visible/i);
      // Must NOT contain the title we wrote
      expect(body).not.toContain('private to B');
    } finally {
      await admin.from('topic').delete().eq('id', topic.id);
    }
  });
});
