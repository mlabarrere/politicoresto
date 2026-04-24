import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveMcpCaller } from '../context';

const USERNAME_PATTERN = /^[a-z0-9_][a-z0-9_-]{2,30}$/i;

export function registerEditMyProfile(server: McpServer) {
  server.registerTool(
    'edit_my_profile',
    {
      title: 'Edit my profile',
      description:
        "Update the authenticated user's app_profile. Only the fields you pass are touched. The user_id is taken from the session — you cannot edit anyone else.",
      inputSchema: {
        display_name: z.string().min(1).max(80).optional(),
        username: z.string().regex(USERNAME_PATTERN).optional(),
        bio: z.string().max(500).optional(),
        avatar_url: z.string().url().optional(),
      },
    },
    async (input, extra) => {
      const caller = resolveMcpCaller(extra);
      const patch: Record<string, string> = {};
      if (input.display_name !== undefined)
        patch.display_name = input.display_name;
      if (input.username !== undefined) patch.username = input.username;
      if (input.bio !== undefined) patch.bio = input.bio;
      if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url;

      if (Object.keys(patch).length === 0) {
        return {
          isError: true,
          content: [
            { type: 'text', text: 'Provide at least one field to update.' },
          ],
        };
      }

      const { data, error } = await caller.supabase
        .from('app_profile')
        .update(patch)
        .eq('user_id', caller.userId)
        .select('user_id, username, display_name, bio, avatar_url')
        .maybeSingle();

      if (error) {
        return {
          isError: true,
          content: [
            { type: 'text', text: `edit_my_profile failed: ${error.message}` },
          ],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
