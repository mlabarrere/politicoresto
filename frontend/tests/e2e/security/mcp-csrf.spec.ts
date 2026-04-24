/**
 * MCP security — CSRF on /api/oauth/decision (B4 #55).
 *
 * The Approve / Deny endpoint mutates user state: it grants an OAuth
 * client (registered via DCR) access to the user's account. A drive-by
 * POST from `evil.com`, while the user is logged in to politicoresto
 * in another tab, would be a complete account takeover for the MCP
 * surface. We enforce same-origin via Origin/Referer header.
 *
 * These tests forge cross-origin requests directly via Playwright's
 * APIRequestContext (no browser CORS preflight to dodge — the issue is
 * a malicious page submitting a `<form action="...">` POST that would
 * carry the user's cookies).
 */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { SEED_STORAGE_STATE_PATH } from '../global-setup';

interface SeedState {
  cookies: Cookie[];
}

function loadSeedCookies(): Cookie[] {
  const raw = readFileSync(SEED_STORAGE_STATE_PATH, 'utf8');
  const state = JSON.parse(raw) as SeedState;
  return state.cookies;
}

test.describe('oauth decision — CSRF protection', () => {
  test('POST without Origin/Referer → 403 (defensive default)', async ({
    playwright,
    baseURL,
  }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    await ctx.storageState({ path: undefined } as never).catch(() => undefined);
    // Inject seed cookies so the request is "authenticated" — the CSRF
    // gate must still reject because there is no Origin/Referer.
    await ctx.storageState();
    for (const c of loadSeedCookies()) {
      await ctx.storageState();
      await playwright.request
        .newContext({ baseURL, storageState: { cookies: [c], origins: [] } })
        .catch(() => undefined);
    }

    const res = await ctx.post('/api/oauth/decision', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({
        decision: 'approve',
        authorization_id: 'whatever',
      }).toString(),
    });
    expect([401, 403]).toContain(res.status());
    await ctx.dispose();
  });

  test('POST with foreign Origin → 403 even with valid session cookie', async ({
    playwright,
    baseURL,
  }) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: loadSeedCookies(), origins: [] },
    });
    const res = await ctx.post('/api/oauth/decision', {
      headers: {
        origin: 'https://evil.example.com',
        referer: 'https://evil.example.com/attack.html',
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        decision: 'approve',
        authorization_id: 'whatever',
      }).toString(),
    });
    expect(res.status()).toBe(403);
    const body = await res.text();
    expect(body).toContain('Cross-origin');
    await ctx.dispose();
  });

  test('POST with foreign Referer (no Origin) → 403', async ({
    playwright,
    baseURL,
  }) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: loadSeedCookies(), origins: [] },
    });
    const res = await ctx.post('/api/oauth/decision', {
      headers: {
        referer: 'https://evil.example.com/attack.html',
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        decision: 'approve',
        authorization_id: 'whatever',
      }).toString(),
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('POST with same-origin Origin but no session → 401 (auth runs after CSRF)', async ({
    request,
    baseURL,
  }) => {
    const res = await request.post('/api/oauth/decision', {
      headers: {
        origin: baseURL!,
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        decision: 'approve',
        authorization_id: 'whatever',
      }).toString(),
    });
    expect(res.status()).toBe(401);
  });

  test('POST with same-origin Origin + invalid authorization_id → 400 (no leak)', async ({
    playwright,
    baseURL,
  }) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: loadSeedCookies(), origins: [] },
    });
    const res = await ctx.post('/api/oauth/decision', {
      headers: {
        origin: baseURL!,
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        decision: 'approve',
        authorization_id: 'this-id-does-not-exist',
      }).toString(),
    });
    expect([400, 404]).toContain(res.status());
    const body = await res.text();
    expect(body).not.toContain('service_role');
    expect(body).not.toContain('node_modules');
    await ctx.dispose();
  });

  test('Invalid decision value → 400', async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: loadSeedCookies(), origins: [] },
    });
    const res = await ctx.post('/api/oauth/decision', {
      headers: {
        origin: baseURL!,
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        decision: 'pwn-me',
        authorization_id: 'whatever',
      }).toString(),
    });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });
});
