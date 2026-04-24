/**
 * Mint a Supabase access_token for an arbitrary email, used by MCP
 * security E2E tests. The service-role key is read from the runner's
 * env (E2E_SUPABASE_SERVICE_ROLE_KEY, populated by playwright.config.ts).
 *
 * This helper deliberately mirrors `tests/fixtures/mcp-auth.ts` (used
 * by the integration suite) but lives under tests/e2e/helpers because
 * importing across the integration boundary would entangle module
 * resolution between vitest + playwright.
 */
import { createHmac } from 'node:crypto';

const FALLBACK_API_URL = 'http://127.0.0.1:54321';

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_API_URL;
}

function publishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing');
  return key;
}

function serviceRoleKey(): string {
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('E2E_SUPABASE_SERVICE_ROLE_KEY missing');
  return key;
}

export async function mintAccessTokenFor(email: string): Promise<string> {
  const linkRes = await fetch(`${supabaseUrl()}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey(),
      authorization: `Bearer ${serviceRoleKey()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!linkRes.ok) {
    throw new Error(
      `mintAccessTokenFor(${email}): generateLink ${linkRes.status} — ${await linkRes.text()}`,
    );
  }
  const linkBody = (await linkRes.json()) as { hashed_token?: string };
  if (!linkBody.hashed_token) {
    throw new Error(`mintAccessTokenFor(${email}): no hashed_token`);
  }

  const verifyRes = await fetch(`${supabaseUrl()}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: publishableKey(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: linkBody.hashed_token,
    }),
  });
  if (!verifyRes.ok) {
    throw new Error(
      `mintAccessTokenFor(${email}): verify ${verifyRes.status} — ${await verifyRes.text()}`,
    );
  }
  const body = (await verifyRes.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(`mintAccessTokenFor(${email}): no access_token`);
  }
  return body.access_token;
}

/**
 * Decode the payload of a JWT WITHOUT verifying — for tests that need
 * to inspect/forge claims. Never use this code in app paths.
 */
export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('not a JWT');
  const payload = parts[1]!;
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString();
  return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Forge a JWT with arbitrary header + payload, signing with HS256 using
 * a caller-supplied secret. Used to test algorithm-confusion attacks
 * (we sign with HS256 + the JWKS public key as secret, then send to the
 * server; the server MUST refuse).
 */
export function forgeHs256(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
): string {
  const enc = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const data = `${enc({ ...header, alg: 'HS256' })}.${enc(payload)}`;
  const sig = createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${sig}`;
}

/**
 * Forge a "alg: none" JWT (no signature). Used to test that the server
 * rejects unsigned tokens.
 */
export function forgeNone(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
): string {
  const enc = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${enc({ ...header, alg: 'none' })}.${enc(payload)}.`;
}
