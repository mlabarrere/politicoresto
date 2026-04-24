import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveMcpCaller } from '../context';

export function registerReplyToPost(server: McpServer) {
  server.registerTool(
    'reply_to_post',
    {
      title: 'Reply to a post',
      description:
        'Write a comment on a thread_post, or nest a reply under an existing comment. Identity is taken from the authenticated session — you cannot post on behalf of another user. Calls the `create_comment` RPC, which enforces RLS and rate limits.',
      inputSchema: {
        thread_post_id: z.string().uuid(),
        parent_post_id: z.string().uuid().nullable().optional(),
        body_markdown: z.string().min(1).max(10_000),
      },
    },
    async ({ thread_post_id, parent_post_id, body_markdown }, extra) => {
      const caller = resolveMcpCaller(extra);
      const { data, error } = await caller.supabase.rpc('create_comment', {
        p_thread_post_id: thread_post_id,
        p_parent_post_id: parent_post_id ?? null,
        p_body_markdown: body_markdown,
      });
      if (error) {
        return {
          isError: true,
          content: [
            { type: 'text', text: `reply_to_post failed: ${error.message}` },
          ],
        };
      }
      const row = Array.isArray(data) ? data[0] : data;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                comment_id: row?.id ?? null,
                parent_post_id: row?.parent_post_id ?? null,
                depth: row?.depth ?? null,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
