/**
 * E2E — OAuth 2.1 consent screen flow.
 *
 * Two flavours:
 *   - Browser tests for the actual consent UI rendering (signed-out
 *     bounce, error card on bad authorization_id).
 *   - HTTP-only test for the full end-to-end OAuth dance (DCR → /authorize →
 *     consent → decision → token exchange → MCP whoami) — done via
 *     APIRequestContext so we don't depend on browser quirks for
 *     cross-origin localhost navigation.
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { SEED_STORAGE_STATE_PATH } from '../global-setup';
import { signInAsSeedUser } from '../helpers/auth';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

interface DcrClient {
  client_id: string;
  redirect_uri: string;
}

async function registerClient(redirectUri: string): Promise<DcrClient> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/oauth/clients/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'consent-flow-test',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  if (!res.ok) throw new Error(`DCR failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { client_id: string };
  return { client_id: body.client_id, redirect_uri: redirectUri };
}

function pkce() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function loadSeedCookies(): Cookie[] {
  const raw = readFileSync(SEED_STORAGE_STATE_PATH, 'utf8');
  return (JSON.parse(raw) as { cookies: Cookie[] }).cookies;
}

test.describe('oauth consent — UI', () => {
  test('signed-out user is bounced to /auth/login with next param', async ({
    page,
  }) => {
    await page.goto('/oauth/consent?authorization_id=test-id-no-session');
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth/login');
    expect(page.url()).toContain('next=');
    expect(decodeURIComponent(page.url())).toContain('/oauth/consent');
  });

  test('signed-in + invalid authorization_id → error card, no leak', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/oauth/consent?authorization_id=does-not-exist');
    await expect(
      page.locator('h1', { hasText: /invalide|introuvable/i }),
    ).toBeVisible({ timeout: 10_000 });
    const html = await page.content();
    expect(html).not.toContain('service_role');
    expect(html).not.toContain('node_modules');
  });
});

test.describe('oauth consent — full HTTP flow (DCR + PKCE + token exchange)', () => {
  test('happy path: authorize → consent → approve → exchange → call MCP whoami', async ({
    playwright,
    baseURL,
  }) => {
    // Use a port that's almost certainly free; we never bind it. The
    // /api/oauth/decision route returns a 303 to this URI; we read the
    // Location header without ever following it.
    const redirectUri = 'http://127.0.0.1:6789/cb';
    const client = await registerClient(redirectUri);
    const { verifier, challenge } = pkce();
    const state = randomBytes(8).toString('base64url');

    // 1. Fetch Supabase /authorize (no redirects). Supabase responds 302
    //    pointing to ${SITE_URL}/oauth/consent?authorization_id=...
    const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/oauth/authorize`);
    authorizeUrl.searchParams.set('client_id', client.client_id);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', 'openid email profile');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: loadSeedCookies(), origins: [] },
      extraHTTPHeaders: { accept: 'text/html' },
    });

    const authorizeRes = await ctx.fetch(authorizeUrl.toString(), {
      method: 'GET',
      maxRedirects: 0,
    });
    expect([302, 303, 307]).toContain(authorizeRes.status());
    const consentLocation = authorizeRes.headers().location;
    expect(consentLocation).toBeTruthy();
    expect(consentLocation).toContain('/oauth/consent');
    expect(consentLocation).toContain('authorization_id=');

    const consentUrl = new URL(consentLocation!, baseURL);
    const authorizationId = consentUrl.searchParams.get('authorization_id')!;
    expect(authorizationId).toBeTruthy();

    // 2. Sanity-load the consent page (renders the Approve UI).
    const consentRes = await ctx.get(
      `/oauth/consent?authorization_id=${authorizationId}`,
    );
    expect(consentRes.status()).toBe(200);
    const consentHtml = await consentRes.text();
    expect(consentHtml).toContain('consent-flow-test');

    // 3. POST /api/oauth/decision with same-origin Origin → 303 with code.
    const decisionRes = await ctx.post('/api/oauth/decision', {
      headers: {
        origin: baseURL!,
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        decision: 'approve',
        authorization_id: authorizationId,
      }).toString(),
      maxRedirects: 0,
    });
    expect([302, 303, 307]).toContain(decisionRes.status());
    const finalRedirect = decisionRes.headers().location;
    expect(finalRedirect).toBeTruthy();
    expect(finalRedirect).toContain(redirectUri);
    const finalUrl = new URL(finalRedirect!);
    const code = finalUrl.searchParams.get('code');
    expect(code).toBeTruthy();
    expect(finalUrl.searchParams.get('state')).toBe(state);

    // 4. Exchange code for access_token at Supabase /token.
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
        client_id: client.client_id,
        code_verifier: verifier,
      }).toString(),
    });
    expect(tokenRes.status).toBe(200);
    const tokenBody = (await tokenRes.json()) as { access_token?: string };
    expect(tokenBody.access_token).toBeTruthy();

    // 5. Call MCP whoami with the OAuth-issued bearer.
    const HEADERS = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      authorization: `Bearer ${tokenBody.access_token!}`,
    };
    await ctx.post('/api/mcp/mcp', {
      headers: HEADERS,
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'consent-e2e', version: '0' },
        },
      }),
    });
    const whoamiRes = await ctx.post('/api/mcp/mcp', {
      headers: HEADERS,
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'whoami', arguments: {} },
      }),
    });
    expect(whoamiRes.status()).toBe(200);
    const whoamiBody = await whoamiRes.text();
    expect(whoamiBody).toContain('test@example.com');

    // 6. Replay attack: re-using the same code MUST fail.
    const replayRes = await fetch(`${SUPABASE_URL}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
        client_id: client.client_id,
        code_verifier: verifier,
      }).toString(),
    });
    expect(replayRes.status).not.toBe(200);

    await ctx.dispose();
  });
});
