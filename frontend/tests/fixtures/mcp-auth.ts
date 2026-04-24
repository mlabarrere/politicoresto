/**
 * Mint a Supabase access_token for a given user email, for MCP integration
 * tests. Uses the admin-generated magic-link + verify flow: the service_role
 * key is confined to THIS fixture (test-side) and never touches app code.
 *
 * The resulting JWT is the exact shape the Supabase OAuth 2.1 Authorization
 * Server issues to real MCP clients (Claude Desktop), so integration tests
 * exercise the production auth path, not a mock.
 */
import { adminClient, getLocalSupabase } from './supabase-admin';

export async function mintAccessTokenFor(email: string): Promise<string> {
  const admin = adminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !link?.properties?.hashed_token) {
    throw new Error(
      `mintAccessTokenFor(${email}): generateLink failed — ${error?.message ?? 'no hashed_token'}`,
    );
  }

  const { apiUrl, publishableKey } = getLocalSupabase();
  const res = await fetch(`${apiUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: link.properties.hashed_token,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `mintAccessTokenFor(${email}): verify ${res.status} — ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(
      `mintAccessTokenFor(${email}): verify returned no access_token`,
    );
  }
  return body.access_token;
}
