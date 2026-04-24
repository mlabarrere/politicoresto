import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveMcpCaller, UNTRUSTED_CONTENT_WARNING } from '../context';
import { TopicStatus, VisibilityLevel } from '../enums';

const MAX_LIMIT = 50;

export function registerBrowseTopics(server: McpServer) {
  server.registerTool(
    'browse_topics',
    {
      title: 'Browse topics',
      description: `List discussion topics visible to the authenticated user, newest first. RLS filters out anything the user cannot read. ${UNTRUSTED_CONTENT_WARNING}`,
      inputSchema: {
        status: TopicStatus.optional(),
        visibility: VisibilityLevel.optional(),
        limit: z.number().int().positive().max(MAX_LIMIT).optional(),
      },
    },
    async (input, extra) => {
      const caller = resolveMcpCaller(extra);
      const limit = input.limit ?? 20;

      let query = caller.supabase
        .from('topic')
        .select(
          'id, slug, title, description, topic_status, visibility, created_at, updated_at',
        )
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (input.status) query = query.eq('topic_status', input.status);
      if (input.visibility) query = query.eq('visibility', input.visibility);

      const { data, error } = await query;
      if (error) {
        return {
          isError: true,
          content: [
            { type: 'text', text: `browse_topics failed: ${error.message}` },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { count: data?.length ?? 0, topics: data ?? [] },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
