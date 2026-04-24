/**
 * Fifth-factory: Supabase clients dedicated to the MCP resource server at
 * `/api/mcp`. Kept alongside the four canonical @supabase/ssr factories
 * (client / server / middleware / auth-user) because the verify-script
 * forbids `createClient` calls outside `lib/supabase/`.
 *
 * Why MCP needs its own shape:
 *   - No cookies. Claude Desktop / Claude web authenticate via OAuth 2.1
 *     + PKCE against Supabase's own AS, then send us the access_token as
 *     a Bearer header. Each request is stateless.
 *   - `verifyBearer` validates the incoming JWT via the app's publishable
 *     key (local JWKS check, no round-trip).
 *   - `userScoped` instantiates a client pinned to the caller's bearer so
 *     every PostgREST call ships `Authorization: Bearer <jwt>` and RLS
 *     resolves `auth.uid()` exactly as it does for a cookie-based session.
 *
 * Zero `service_role`: only the publishable key ever reaches these factories.
 * A dedicated integration test spies on `fetch` and asserts the service_role
 * key never leaks into outgoing requests.
 */
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/supabase/env';

let cachedVerifier: SupabaseClient | null = null;

function getVerifier(): SupabaseClient {
  if (cachedVerifier) return cachedVerifier;
  cachedVerifier = createClient(
    supabaseEnv.url(),
    supabaseEnv.publishableKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cachedVerifier;
}

export async function verifyMcpBearer(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const client = getVerifier();
  const { data, error } = await client.auth.getClaims(bearerToken);
  if (error || !data?.claims?.sub) return undefined;

  const { claims } = data;
  const sub = String(claims.sub);

  return {
    token: bearerToken,
    clientId: sub,
    scopes: [],
    extra: {
      userId: sub,
      email: typeof claims.email === 'string' ? claims.email : null,
    },
  };
}

export function getMcpUserScopedClient(bearerToken: string): SupabaseClient {
  return createClient(supabaseEnv.url(), supabaseEnv.publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${bearerToken}` },
    },
  });
}
