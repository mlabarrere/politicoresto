/**
 * E2E browser — full MCP user journey through real Chrome.
 *
 * Goal: cover the same surface a real user goes through when connecting
 * Claude Desktop / Claude web to politicoresto. We can't drive Claude
 * Desktop itself in CI, so we drive Chromium and reproduce the part of
 * the flow that runs in the browser:
 *
 *   1. (HTTP) DCR — register a public OAuth client.
 *   2. (HTTP) Hit Supabase /authorize → it 302s to our /oauth/consent
 *      page. We extract the `authorization_id` from the Location header
 *      and hand it to the browser.
 *   3. (Chrome) Sign-in as seed → navigate /oauth/consent → click
 *      Approve → browser is redirected to redirect_uri with `?code=...`.
 *   4. (HTTP) Exchange code for access_token (PKCE).
 *   5. (HTTP) Call MCP tools/call whoami with the bearer + verify
 *      refresh-token rotation.
 *
 * The browser never directly talks to Supabase here — Chromium's
 * sandboxed network context refuses connection to 127.0.0.1:54321 in
 * some environments. Doing the Supabase legs over HTTP keeps the test
 * deterministic while still asserting the user-facing UX of the consent
 * page (button click → redirect with code).
 */
import { createHash, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from '../helpers/auth';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

async function registerClient(redirectUri: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/oauth/clients/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'chrome-e2e-mcp',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  if (!res.ok) {
    throw new Error(`DCR failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { client_id: string };
  return body.client_id;
}

function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

interface AuthorizeOpts {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
  scope?: string;
  cookieHeader: string;
}

/**
 * Replay what mcp-remote does at step 2 — hit Supabase /authorize and
 * pluck the `${SITE_URL}/oauth/consent?authorization_id=...` Location.
 * We send the seed user's Supabase auth cookies so Supabase recognises
 * us as already-logged-in (no Google SSO loop in tests).
 */
async function obtainAuthorizationId(opts: AuthorizeOpts): Promise<string> {
  const url = new URL(`${SUPABASE_URL}/auth/v1/oauth/authorize`);
  url.searchParams.set('client_id', opts.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('scope', opts.scope ?? 'openid email profile');
  url.searchParams.set('state', opts.state);
  url.searchParams.set('code_challenge', opts.challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  const res = await fetch(url, {
    redirect: 'manual',
    headers: { cookie: opts.cookieHeader },
  });
  const location = res.headers.get('location');
  if (!location) {
    throw new Error(
      `expected Location header from /authorize, got ${res.status} ${await res.text()}`,
    );
  }
  const consentUrl = new URL(location, 'http://placeholder');
  const authorizationId = consentUrl.searchParams.get('authorization_id');
  if (!authorizationId) {
    throw new Error(`no authorization_id in Location: ${location}`);
  }
  return authorizationId;
}

function cookieHeaderFromContext(
  cookies: { name: string; value: string }[],
): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

test.describe('chrome — full MCP user journey', () => {
  test('approve consent in browser → exchange token → call all MCP tools', async ({
    page,
    request,
    context,
  }) => {
    await signInAsSeedUser(page);

    const redirectUri = 'http://127.0.0.1:6790/cb';
    const clientId = await registerClient(redirectUri);
    const { verifier, challenge } = pkce();
    const state = randomBytes(8).toString('base64url');

    const cookies = await context.cookies();
    const cookieHeader = cookieHeaderFromContext(cookies);
    const authorizationId = await obtainAuthorizationId({
      clientId,
      redirectUri,
      challenge,
      state,
      cookieHeader,
    });

    // Browser-side: load the consent page, click Approve.
    const callbackPromise = page.waitForRequest(
      (r) => r.url().startsWith(redirectUri),
      { timeout: 15_000 },
    );
    await page.goto(`/oauth/consent?authorization_id=${authorizationId}`);
    await expect(page.locator('h1', { hasText: /Autoriser/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('h1', { hasText: 'chrome-e2e-mcp' }),
    ).toBeVisible();

    await page.locator('button[name="decision"][value="approve"]').click();
    const callbackReq = await callbackPromise;
    const callbackUrl = new URL(callbackReq.url());
    const code = callbackUrl.searchParams.get('code');
    expect(code, 'authorization code returned').toBeTruthy();
    expect(callbackUrl.searchParams.get('state')).toBe(state);

    // Exchange code for access_token (PKCE).
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      }).toString(),
    });
    expect(tokenRes.status, 'token exchange status').toBe(200);
    const tokenBody = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    expect(tokenBody.access_token).toBeTruthy();
    expect(tokenBody.refresh_token).toBeTruthy();

    // Call every MCP tool to prove the full surface works end-to-end
    // with an OAuth-issued bearer the same way Claude Desktop would.
    const HEADERS = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      authorization: `Bearer ${tokenBody.access_token!}`,
    };
    await request.post('/api/mcp/mcp', {
      headers: HEADERS,
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'chrome-e2e', version: '0' },
        },
      }),
    });

    const callTool = async (id: number, name: string, args: unknown) => {
      const res = await request.post('/api/mcp/mcp', {
        headers: HEADERS,
        data: JSON.stringify({
          jsonrpc: '2.0',
          id,
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      });
      expect(res.status(), `tool ${name} status`).toBe(200);
      return res.text();
    };

    const whoami = await callTool(2, 'whoami', {});
    expect(whoami).toContain('test@example.com');

    const browse = await callTool(3, 'browse_topics', { limit: 3 });
    expect(browse).toContain('count');

    // Refresh the token (mcp-remote rotates) and verify the new
    // access_token is accepted by the resource server too.
    const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenBody.refresh_token!,
        client_id: clientId,
      }).toString(),
    });
    expect(refreshRes.status).toBe(200);
    const refreshed = (await refreshRes.json()) as { access_token?: string };
    expect(refreshed.access_token).toBeTruthy();

    const refreshedHeaders = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      authorization: `Bearer ${refreshed.access_token!}`,
    };
    await request.post('/api/mcp/mcp', {
      headers: refreshedHeaders,
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'chrome-e2e-refreshed', version: '0' },
        },
      }),
    });
    const whoamiAfterRefresh = await request.post('/api/mcp/mcp', {
      headers: refreshedHeaders,
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'whoami', arguments: {} },
      }),
    });
    expect(whoamiAfterRefresh.status()).toBe(200);
  });

  test('deny consent in browser → access_denied at redirect_uri', async ({
    page,
    context,
  }) => {
    await signInAsSeedUser(page);
    const redirectUri = 'http://127.0.0.1:6791/cb';
    const clientId = await registerClient(redirectUri);
    const { challenge } = pkce();
    const state = randomBytes(8).toString('base64url');

    const cookies = await context.cookies();
    const cookieHeader = cookieHeaderFromContext(cookies);
    const authorizationId = await obtainAuthorizationId({
      clientId,
      redirectUri,
      challenge,
      state,
      scope: 'openid',
      cookieHeader,
    });

    const callbackPromise = page.waitForRequest(
      (r) => r.url().startsWith(redirectUri),
      { timeout: 15_000 },
    );
    await page.goto(`/oauth/consent?authorization_id=${authorizationId}`);
    await expect(page.locator('h1', { hasText: /Autoriser/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('button[name="decision"][value="deny"]').click();

    const callbackReq = await callbackPromise;
    const callbackUrl = new URL(callbackReq.url());
    expect(callbackUrl.searchParams.get('error')).toBe('access_denied');
    expect(callbackUrl.searchParams.get('code')).toBeNull();
  });
});
