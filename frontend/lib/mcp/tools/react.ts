import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveMcpCaller } from '../context';
import { ReactionTargetType, ReactionType } from '../enums';

export function registerReact(server: McpServer) {
  server.registerTool(
    'react',
    {
      title: 'React to a post or comment',
      description:
        'Upvote or downvote a thread_post or comment. Calling with the same reaction again removes it. Calling with the opposite reaction switches it. Uses the `react_post` RPC which enforces RLS.',
      inputSchema: {
        target_type: ReactionTargetType,
        target_id: z.string().uuid(),
        reaction_type: ReactionType,
      },
    },
    async ({ target_type, target_id, reaction_type }, extra) => {
      const caller = resolveMcpCaller(extra);
      const { data, error } = await caller.supabase.rpc('react_post', {
        p_target_type: target_type,
        p_target_id: target_id,
        p_reaction_type: reaction_type,
      });
      if (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `react failed: ${error.message}` }],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                reaction: data
                  ? { id: (data as { id?: string }).id, reaction_type }
                  : null,
                cleared: data === null,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'remove_my_reaction',
    {
      title: 'Remove my reaction',
      description:
        "Remove the authenticated user's reaction on a specific target, if any. Idempotent — returns { removed: false } when no reaction existed.",
      inputSchema: {
        target_type: ReactionTargetType,
        target_id: z.string().uuid(),
      },
    },
    async ({ target_type, target_id }, extra) => {
      const caller = resolveMcpCaller(extra);
      const { data, error } = await caller.supabase
        .from('reaction')
        .delete()
        .eq('target_type', target_type)
        .eq('target_id', target_id)
        .eq('user_id', caller.userId)
        .select('id');
      if (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `remove_my_reaction failed: ${error.message}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ removed: (data?.length ?? 0) > 0 }, null, 2),
          },
        ],
      };
    },
  );
}
