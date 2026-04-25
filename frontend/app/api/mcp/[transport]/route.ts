/**
 * MCP resource server — user-scoped tools for politicoresto.
 *
 * Spec: MCP 2025-06-18 (Streamable HTTP transport). Auth: OAuth 2.1
 * with Supabase as the Authorization Server. We only verify the
 * incoming bearer + pass it to PostgREST; the user's identity and
 * permissions are enforced entirely by Supabase RLS.
 *
 * Invariants (tested in tests/integration/mcp/):
 *   - Zero `service_role` references reach this code path.
 *   - No tool accepts a `user_id` / `acting_user_id` parameter — identity
 *     is taken from the validated JWT only.
 *   - A missing or invalid bearer returns 401 + WWW-Authenticate with a
 *     pointer to our PRM.
 */
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { isMcpEnabled } from '@/lib/mcp/feature-flag';
import { MCP_PRM_PATH } from '@/lib/mcp/oauth-metadata';
import { registerBrowseTopics } from '@/lib/mcp/tools/browse-topics';
import { registerEditMyProfile } from '@/lib/mcp/tools/edit-profile';
import { registerReact } from '@/lib/mcp/tools/react';
import { registerReadTopic } from '@/lib/mcp/tools/read-topic';
import { registerReplyToPost } from '@/lib/mcp/tools/reply';
import { registerWhoami } from '@/lib/mcp/tools/whoami';
import { verifyMcpBearer } from '@/lib/supabase/mcp';

const mcpHandler = createMcpHandler(
  (server) => {
    registerWhoami(server);
    registerBrowseTopics(server);
    registerReadTopic(server);
    registerReplyToPost(server);
    registerReact(server);
    registerEditMyProfile(server);
  },
  {
    serverInfo: {
      name: 'politicoresto',
      version: '0.1.0',
    },
  },
  {
    basePath: '/api/mcp',
  },
);

const authHandler = withMcpAuth(mcpHandler, verifyMcpBearer, {
  required: true,
  resourceMetadataPath: MCP_PRM_PATH,
});

const gated = (req: Request) =>
  isMcpEnabled() ? authHandler(req) : new Response(null, { status: 404 });

export { gated as GET, gated as POST, gated as DELETE };
