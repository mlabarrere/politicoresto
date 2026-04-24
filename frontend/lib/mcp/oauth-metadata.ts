/**
 * Shared OAuth metadata for the MCP feature.
 *
 * The Authorization Server is always Supabase itself — its issuer URL is
 * exactly the `NEXT_PUBLIC_SUPABASE_URL` + `/auth/v1`. No bridge, no
 * custom OAuth code in this app: the standard RFC 8414 discovery doc at
 * `${SUPABASE_URL}/auth/v1/.well-known/oauth-authorization-server` is
 * what Claude Desktop / Claude web hits to start the PKCE flow.
 *
 * The resource URL (our MCP endpoint) is derived from the incoming
 * request at runtime so localhost, preview, and production all just work.
 */
import { supabaseEnv } from '@/lib/supabase/env';

export const MCP_RESOURCE_PATH = '/api/mcp';
export const MCP_PRM_PATH = '/.well-known/oauth-protected-resource';

export function supabaseAuthIssuer(): string {
  // Supabase Auth exposes its OAuth AS at ${URL}/auth/v1 — the `issuer`
  // field in the RFC 8414 discovery document matches this exact string.
  return `${supabaseEnv.url()}/auth/v1`;
}

export function resourceUrlFor(req: Request): string {
  const origin = new URL(req.url).origin;
  return `${origin}${MCP_RESOURCE_PATH}`;
}
