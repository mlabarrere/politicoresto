import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveMcpCaller } from '../context';

export function registerWhoami(server: McpServer) {
  server.registerTool(
    'whoami',
    {
      title: 'Who am I',
      description:
        'Return the identity of the authenticated user (id, email, profile). Useful as a handshake check.',
      inputSchema: {},
    },
    async (_input, extra) => {
      const caller = resolveMcpCaller(extra);
      const { data, error } = await caller.supabase
        .from('app_profile')
        .select('username, display_name, avatar_url, bio')
        .eq('user_id', caller.userId)
        .maybeSingle();

      if (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `whoami failed: ${error.message}` }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                user_id: caller.userId,
                email: caller.email,
                username: data?.username ?? null,
                display_name: data?.display_name ?? null,
                avatar_url: data?.avatar_url ?? null,
                bio: data?.bio ?? null,
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
