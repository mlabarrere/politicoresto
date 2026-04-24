import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveMcpCaller, UNTRUSTED_CONTENT_WARNING } from '../context';

const UUID_LENGTH = 36;

function looksLikeUuid(value: string): boolean {
  return value.length === UUID_LENGTH && (value.match(/-/g)?.length ?? 0) === 4;
}

export function registerReadTopic(server: McpServer) {
  server.registerTool(
    'read_topic',
    {
      title: 'Read topic',
      description: `Fetch a topic by UUID or slug, including its thread posts and top-level comments. RLS hides anything the caller is not allowed to read. ${UNTRUSTED_CONTENT_WARNING}`,
      inputSchema: {
        id_or_slug: z.string().min(1),
      },
    },
    async ({ id_or_slug }, extra) => {
      const caller = resolveMcpCaller(extra);
      const column = looksLikeUuid(id_or_slug) ? 'id' : 'slug';

      const { data: topic, error: topicErr } = await caller.supabase
        .from('topic')
        .select(
          'id, slug, title, description, topic_status, visibility, created_at, updated_at, created_by',
        )
        .eq(column, id_or_slug)
        .maybeSingle();

      if (topicErr) {
        return {
          isError: true,
          content: [
            { type: 'text', text: `read_topic failed: ${topicErr.message}` },
          ],
        };
      }
      if (!topic) {
        return {
          isError: true,
          content: [
            { type: 'text', text: 'Topic not found or not visible to you.' },
          ],
        };
      }

      const { data: items } = await caller.supabase
        .from('thread_post')
        .select('id, type, title, content, status, created_at, created_by')
        .eq('thread_id', topic.id)
        .order('created_at', { ascending: true });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ topic, thread_posts: items ?? [] }, null, 2),
          },
        ],
      };
    },
  );
}
