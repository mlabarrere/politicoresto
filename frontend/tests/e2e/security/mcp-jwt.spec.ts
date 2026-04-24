/**
 * MCP security — JWT class (B1 in docs/mcp.md security catalog).
 *
 * Verifies that the resource server at /api/mcp/mcp refuses every
 * malformed / forged / replayed bearer token. All tests run against
 * the locally-built Next server spawned by playwright.config.ts and
 * the local Supabase stack.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  decodeJwtPayload,
  forgeHs256,
  forgeNone,
  mintAccessTokenFor,
} from '../helpers/mcp-token';

const MCP_URL = '/api/mcp/mcp';
const INIT_BODY = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'jwt-probe', version: '0' },
  },
});

const MCP_HEADERS_BASE = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
} as const;

async function postWithBearer(
  request: APIRequestContext,
  bearer: string | null,
) {
  const headers: Record<string, string> = { ...MCP_HEADERS_BASE };
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return request.post(MCP_URL, { headers, data: INIT_BODY });
}

test.describe('mcp jwt — rejection invariants', () => {
  test('no bearer → 401 + WWW-Authenticate with PRM pointer', async ({
    request,
  }) => {
    const res = await postWithBearer(request, null);
    expect(res.status()).toBe(401);
    const wwwAuth = res.headers()['www-authenticate'] ?? '';
    expect(wwwAuth).toContain('Bearer');
    expect(wwwAuth).toContain('resource_metadata');
    expect(wwwAuth).toContain('/.well-known/oauth-protected-resource');
  });

  test('empty bearer → 401', async ({ request }) => {
    const res = await postWithBearer(request, '');
    expect(res.status()).toBe(401);
  });

  test('non-JWT bearer → 401', async ({ request }) => {
    const res = await postWithBearer(request, 'not-a-jwt');
    expect(res.status()).toBe(401);
  });

  test('garbage with two dots (looks like JWT) → 401', async ({ request }) => {
    const res = await postWithBearer(
      request,
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.',
    );
    expect(res.status()).toBe(401);
  });

  test('alg=none unsigned token → 401', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const claims = decodeJwtPayload(seedToken);
    const forged = forgeNone({ typ: 'JWT' }, claims);
    const res = await postWithBearer(request, forged);
    expect(res.status()).toBe(401);
  });

  test('algorithm confusion (RS256→HS256 with public key as secret) → 401', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const claims = decodeJwtPayload(seedToken);
    // Fetch the JWKS pubkey, encode its raw bytes as a string, sign HS256.
    // A vulnerable implementation would accept this because the public key
    // (kept locally) IS the "shared secret" if alg can be downgraded.
    const jwks = await request.get(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    );
    const body = (await jwks.json()) as {
      keys: { kid: string; x: string; y: string }[];
    };
    const pubBlob = JSON.stringify(body.keys[0]);
    const forged = forgeHs256(
      { typ: 'JWT', kid: body.keys[0]!.kid },
      claims,
      pubBlob,
    );
    const res = await postWithBearer(request, forged);
    expect(res.status()).toBe(401);
  });

  test('expired JWT → 401', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const claims = decodeJwtPayload(seedToken);
    const expired = forgeHs256(
      { typ: 'JWT', kid: 'fake' },
      { ...claims, exp: 1, iat: 0 },
      'doesnt-matter-server-uses-jwks',
    );
    const res = await postWithBearer(request, expired);
    expect(res.status()).toBe(401);
  });

  test('JWT with foreign issuer → 401', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const claims = decodeJwtPayload(seedToken);
    const forged = forgeHs256(
      { typ: 'JWT', kid: 'fake' },
      { ...claims, iss: 'https://evil.example.com/auth/v1' },
      'doesnt-matter',
    );
    const res = await postWithBearer(request, forged);
    expect(res.status()).toBe(401);
  });

  test('JWT with unknown kid → 401', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const claims = decodeJwtPayload(seedToken);
    const forged = forgeHs256(
      { typ: 'JWT', kid: '00000000-0000-0000-0000-000000000000' },
      claims,
      'whatever',
    );
    const res = await postWithBearer(request, forged);
    expect(res.status()).toBe(401);
  });

  test('truncated JWT → 401', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const truncated = seedToken.slice(0, seedToken.length - 5);
    const res = await postWithBearer(request, truncated);
    expect(res.status()).toBe(401);
  });

  test('JWT with tampered payload (sub flipped) → 401', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    // Re-encode with a different sub, keep the original signature → invalid.
    const [h, , s] = seedToken.split('.');
    const otherPayload = Buffer.from(
      JSON.stringify({ sub: '00000000-0000-0000-0000-000000000099' }),
    )
      .toString('base64')
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const tampered = `${h}.${otherPayload}.${s}`;
    const res = await postWithBearer(request, tampered);
    expect(res.status()).toBe(401);
  });

  test('legitimate JWT → 200 (sanity)', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const res = await postWithBearer(request, seedToken);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('"protocolVersion"');
    expect(text).toContain('politicoresto');
  });
});
