/**
 * Integration — MCP resource server, user-scoped tools.
 *
 * Exercises the security-critical chain end-to-end against the real
 * local Supabase stack:
 *
 *   1. Mint a Supabase access_token for a user (same JWT shape the
 *      OAuth 2.1 server issues to Claude Desktop via PKCE + Google SSO).
 *   2. Validate it via `verifyMcpBearer` — the exact function the route
 *      hands to `withMcpAuth`.
 *   3. Invoke each tool registration directly with a faked `extra.authInfo`
 *      payload matching what mcp-handler would produce on success.
 *   4. Assert DB-observable effects via the service-role admin client.
 *
 * This layer *does not* exercise HTTP transport — for that, run the
 * curl smoke-tests in `docs/mcp.md` against a live `next dev`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBrowseTopics } from '@/lib/mcp/tools/browse-topics';
import { registerEditMyProfile } from '@/lib/mcp/tools/edit-profile';
import { registerReact } from '@/lib/mcp/tools/react';
import { registerReadTopic } from '@/lib/mcp/tools/read-topic';
import { registerReplyToPost } from '@/lib/mcp/tools/reply';
import { registerWhoami } from '@/lib/mcp/tools/whoami';
import { verifyMcpBearer } from '@/lib/supabase/mcp';
import {
  adminClient,
  createEphemeralUser,
  createTestPost,
  SEED_USER,
} from '../fixtures/supabase-admin';
import { mintAccessTokenFor } from '../fixtures/mcp-auth';

// ---------- helpers --------------------------------------------------------

type ToolHandler = (
  args: Record<string, unknown>,
  extra: unknown,
) => Promise<{
  isError?: boolean;
  content: { type: string; text: string }[];
}>;

type ToolInputSchema = Record<string, { parse?: (value: unknown) => unknown }>;

interface RegisteredTool {
  handler: ToolHandler;
  inputSchema: ToolInputSchema;
}

function collectTools(
  register: (server: McpServer) => void,
): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>();
  const fakeServer = {
    registerTool(
      name: string,
      meta: { inputSchema?: ToolInputSchema },
      handler: ToolHandler,
    ) {
      tools.set(name, {
        handler,
        inputSchema: meta.inputSchema ?? {},
      });
    },
  } as unknown as McpServer;
  register(fakeServer);
  return tools;
}

function extraFor(token: string, userId: string, email: string | null) {
  return {
    authInfo: {
      token,
      clientId: userId,
      scopes: [] as string[],
      extra: { userId, email },
    },
  };
}

function parseToolText<T>(result: { content: { text: string }[] }): T {
  return JSON.parse(result.content[0]!.text) as T;
}

// ---------- suite ----------------------------------------------------------

describe('mcp resource server (integration)', () => {
  let seedToken: string;
  let seedExtra: ReturnType<typeof extraFor>;
  let otherUser: { email: string; userId: string };
  let otherToken: string;
  let post: { slug: string; threadId: string; postItemId: string };

  // Build once so we assert on real tool instances.
  const whoamiTool = collectTools(registerWhoami).get('whoami')!;
  const browseTopicsTool =
    collectTools(registerBrowseTopics).get('browse_topics')!;
  const readTopicTool = collectTools(registerReadTopic).get('read_topic')!;
  const replyTool = collectTools(registerReplyToPost).get('reply_to_post')!;
  const reactTools = collectTools(registerReact);
  const reactTool = reactTools.get('react')!;
  const removeReactionTool = reactTools.get('remove_my_reaction')!;
  const editProfileTool = collectTools(registerEditMyProfile).get(
    'edit_my_profile',
  )!;

  beforeAll(async () => {
    seedToken = await mintAccessTokenFor(SEED_USER.email);
    seedExtra = extraFor(seedToken, SEED_USER.userId, SEED_USER.email);
    otherUser = await createEphemeralUser('mcp-other');
    otherToken = await mintAccessTokenFor(otherUser.email);
    post = await createTestPost('MCP integration post');
  });

  afterAll(async () => {
    const admin = adminClient();
    if (otherUser) await admin.auth.admin.deleteUser(otherUser.userId);
    if (post) {
      await admin.from('post').delete().eq('thread_post_id', post.postItemId);
      await admin.from('thread_post').delete().eq('id', post.postItemId);
      await admin.from('topic').delete().eq('id', post.threadId);
    }
  });

  // -------- auth / bearer verification ------------------------------------

  describe('bearer verification', () => {
    it('verifyMcpBearer returns undefined without a bearer', async () => {
      const info = await verifyMcpBearer(new Request('http://x'), undefined);
      expect(info).toBeUndefined();
    });

    it('verifyMcpBearer returns undefined for a garbage bearer', async () => {
      const info = await verifyMcpBearer(new Request('http://x'), 'not-a-jwt');
      expect(info).toBeUndefined();
    });

    it('verifyMcpBearer accepts a freshly-minted Supabase JWT', async () => {
      const info = await verifyMcpBearer(new Request('http://x'), seedToken);
      expect(info?.clientId).toBe(SEED_USER.userId);
      expect((info?.extra as { email?: string } | undefined)?.email).toBe(
        SEED_USER.email,
      );
    });
  });

  // -------- whoami --------------------------------------------------------

  describe('whoami', () => {
    it('returns the caller identity + profile', async () => {
      const res = await whoamiTool.handler({}, seedExtra);
      expect(res.isError).toBeFalsy();
      const parsed = parseToolText<{
        user_id: string;
        email: string | null;
        display_name: string | null;
      }>(res);
      expect(parsed.user_id).toBe(SEED_USER.userId);
      expect(parsed.email).toBe(SEED_USER.email);
      expect(parsed.display_name).toBeTruthy();
    });
  });

  // -------- browse_topics / read_topic ------------------------------------

  describe('browse_topics', () => {
    it('lists topics newest-first up to the requested limit', async () => {
      const res = await browseTopicsTool.handler({ limit: 5 }, seedExtra);
      const parsed = parseToolText<{
        count: number;
        topics: { id: string; slug: string }[];
      }>(res);
      expect(parsed.count).toBeGreaterThan(0);
      expect(parsed.topics.length).toBeLessThanOrEqual(5);
    });
  });

  describe('read_topic', () => {
    it('resolves by slug', async () => {
      const res = await readTopicTool.handler(
        { id_or_slug: post.slug },
        seedExtra,
      );
      const parsed = parseToolText<{
        topic: { id: string; slug: string };
        thread_posts: { id: string }[];
      }>(res);
      expect(parsed.topic.id).toBe(post.threadId);
      expect(parsed.thread_posts.length).toBeGreaterThan(0);
    });

    it('resolves by UUID', async () => {
      const res = await readTopicTool.handler(
        { id_or_slug: post.threadId },
        seedExtra,
      );
      const parsed = parseToolText<{ topic: { id: string } }>(res);
      expect(parsed.topic.id).toBe(post.threadId);
    });
  });

  // -------- reply_to_post --------------------------------------------------

  describe('reply_to_post', () => {
    it('posts a top-level comment with identity from the JWT', async () => {
      const res = await replyTool.handler(
        {
          thread_post_id: post.postItemId,
          body_markdown: `mcp reply ${Date.now()}`,
        },
        seedExtra,
      );
      expect(res.isError).toBeFalsy();
      const parsed = parseToolText<{ comment_id: string; depth: number }>(res);
      expect(parsed.comment_id).toBeTruthy();
      expect(parsed.depth).toBe(0);

      // Verify it actually landed + belongs to the seed user.
      const { data } = await adminClient()
        .from('post')
        .select('author_user_id, body_markdown, post_status')
        .eq('id', parsed.comment_id)
        .single();
      expect(data?.author_user_id).toBe(SEED_USER.userId);
      expect(data?.post_status).toBe('visible');
    });
  });

  // -------- react / remove_my_reaction ------------------------------------

  describe('react', () => {
    it('adds then clears a reaction via toggle (react_post RPC semantics)', async () => {
      const add = await reactTool.handler(
        {
          target_type: 'thread_post',
          target_id: post.postItemId,
          reaction_type: 'upvote',
        },
        seedExtra,
      );
      expect(add.isError).toBeFalsy();

      const { data: rowAfterAdd } = await adminClient()
        .from('reaction')
        .select('reaction_type')
        .eq('target_id', post.postItemId)
        .eq('user_id', SEED_USER.userId)
        .maybeSingle();
      expect(rowAfterAdd?.reaction_type).toBe('upvote');

      // Calling again with same reaction removes it (RPC toggle).
      await reactTool.handler(
        {
          target_type: 'thread_post',
          target_id: post.postItemId,
          reaction_type: 'upvote',
        },
        seedExtra,
      );
      const { data: rowAfterToggle } = await adminClient()
        .from('reaction')
        .select('id')
        .eq('target_id', post.postItemId)
        .eq('user_id', SEED_USER.userId)
        .maybeSingle();
      expect(rowAfterToggle).toBeNull();
    });

    it('remove_my_reaction is idempotent', async () => {
      const res = await removeReactionTool.handler(
        { target_type: 'thread_post', target_id: post.postItemId },
        seedExtra,
      );
      expect(res.isError).toBeFalsy();
      const parsed = parseToolText<{ removed: boolean }>(res);
      expect(parsed.removed).toBe(false);
    });
  });

  // -------- edit_my_profile -----------------------------------------------

  describe('edit_my_profile', () => {
    it('updates the caller profile only', async () => {
      const newBio = `mcp bio ${Date.now()}`;
      const res = await editProfileTool.handler({ bio: newBio }, seedExtra);
      expect(res.isError).toBeFalsy();

      const { data: seedRow } = await adminClient()
        .from('app_profile')
        .select('bio')
        .eq('user_id', SEED_USER.userId)
        .single();
      expect(seedRow?.bio).toBe(newBio);

      // Other user's profile must be untouched.
      const { data: otherRow } = await adminClient()
        .from('app_profile')
        .select('bio')
        .eq('user_id', otherUser.userId)
        .single();
      expect(otherRow?.bio).not.toBe(newBio);
    });

    it('other user editing their OWN profile does not leak into seed user', async () => {
      const otherExtra = extraFor(
        otherToken,
        otherUser.userId,
        otherUser.email,
      );
      const marker = `other bio ${Date.now()}`;
      const res = await editProfileTool.handler({ bio: marker }, otherExtra);
      expect(res.isError).toBeFalsy();

      const { data: otherRow } = await adminClient()
        .from('app_profile')
        .select('bio')
        .eq('user_id', otherUser.userId)
        .single();
      expect(otherRow?.bio).toBe(marker);

      const { data: seedRow } = await adminClient()
        .from('app_profile')
        .select('bio')
        .eq('user_id', SEED_USER.userId)
        .single();
      expect(seedRow?.bio).not.toBe(marker);
    });
  });

  // -------- security invariants -------------------------------------------

  describe('security invariants', () => {
    it('no tool schema accepts a user_id / acting_user_id parameter', () => {
      const allTools = [
        ...collectTools(registerWhoami).entries(),
        ...collectTools(registerBrowseTopics).entries(),
        ...collectTools(registerReadTopic).entries(),
        ...collectTools(registerReplyToPost).entries(),
        ...collectTools(registerReact).entries(),
        ...collectTools(registerEditMyProfile).entries(),
      ];
      const offenders: string[] = [];
      for (const [name, tool] of allTools) {
        const keys = Object.keys(tool.inputSchema);
        if (keys.includes('user_id') || keys.includes('acting_user_id')) {
          offenders.push(name);
        }
      }
      expect(offenders).toStrictEqual([]);
    });

    it('no outgoing request to Supabase carries the service_role key', async () => {
      const { serviceRoleKey, publishableKey } =
        await import('../fixtures/supabase-admin').then((m) =>
          m.getLocalSupabase(),
        );
      const originalFetch = globalThis.fetch;
      const outgoing: { url: string; headers: Record<string, string> }[] = [];
      globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const hdrs: Record<string, string> = {};
        const raw = init?.headers;
        if (raw instanceof Headers) raw.forEach((v, k) => (hdrs[k] = v));
        else if (Array.isArray(raw)) for (const [k, v] of raw) hdrs[k] = v;
        else if (raw) Object.assign(hdrs, raw);
        outgoing.push({ url, headers: hdrs });
        return originalFetch(input, init);
      }) as typeof fetch;
      try {
        await whoamiTool.handler({}, seedExtra);
        await browseTopicsTool.handler({ limit: 1 }, seedExtra);
      } finally {
        globalThis.fetch = originalFetch;
      }
      expect(outgoing.length).toBeGreaterThan(0);
      for (const call of outgoing) {
        const headerBlob = JSON.stringify(call.headers);
        const joined = `${call.url} ${headerBlob}`;
        expect(joined).not.toContain(serviceRoleKey);
        // Publishable key presence is fine — anon role is what RLS expects.
        expect(joined).toContain(publishableKey);
      }
    });
  });
});
