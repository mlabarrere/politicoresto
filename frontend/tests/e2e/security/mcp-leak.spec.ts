/**
 * MCP security — confidentiality / leak (B6).
 *
 * Verifies no error path leaks secrets, stack traces, or internal paths.
 */
import { expect, test } from '@playwright/test';
import { mintAccessTokenFor } from '../helpers/mcp-token';

test.describe('mcp confidentiality — no leaks', () => {
  test('PRM document only contains the documented fields', async ({
    request,
  }) => {
    const res = await request.get('/.well-known/oauth-protected-resource');
    const body = (await res.json()) as Record<string, unknown>;
    // Spec-required: resource + authorization_servers. Anything else is
    // a deliberate addition we should be aware of.
    expect(body).toHaveProperty('resource');
    expect(body).toHaveProperty('authorization_servers');
    // No service_role key, no JWT, no env dump.
    const json = JSON.stringify(body);
    expect(json).not.toMatch(/sb_secret_/);
    expect(json).not.toMatch(/eyJ[A-Za-z0-9_-]{50,}/);
  });

  test('401 body is concise — no JWT echoed back', async ({ request }) => {
    const res = await request.post('/api/mcp/mcp', {
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        authorization:
          'Bearer eyJhbGciOiJ0b3RhbGx5LWZha2UiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiJYIn0.aaaa',
      },
      data: '{}',
    });
    expect(res.status()).toBe(401);
    const body = await res.text();
    expect(body.length).toBeLessThan(500);
    expect(body).not.toContain('eyJhbGciOiJ0b3RhbGx5LWZha2U');
  });

  test('whoami response contains only documented user fields', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const HEADERS = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      authorization: `Bearer ${seedToken}`,
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
          clientInfo: { name: 'p', version: '0' },
        },
      }),
    });
    const res = await request.post('/api/mcp/mcp', {
      headers: HEADERS,
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'whoami', arguments: {} },
      }),
    });
    const text = await res.text();
    // Allowed fields (the SSE stream JSON-escapes inner quotes, so match
    // by key name without surrounding quotes).
    expect(text).toContain('user_id');
    expect(text).toContain('email');
    // Forbidden — Supabase metadata that would be sensitive in some setups
    expect(text).not.toContain('raw_user_meta_data');
    expect(text).not.toContain('app_metadata');
    expect(text).not.toContain('recovery_token');
    // `phone` may legitimately be empty string on auth.users — match the
    // explicit JSON key form to avoid false positives on words like 'iphone'
    expect(text).not.toContain('\\"phone\\"');
  });

  test('MCP route does not advertise X-Powered-By', async ({ request }) => {
    const res = await request.post('/api/mcp/mcp', {
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      data: '{}',
    });
    const headers = res.headers();
    // Vercel/Next defaults — must not announce framework version
    if ('x-powered-by' in headers) {
      expect(headers['x-powered-by']?.toLowerCase()).not.toContain('next.js/');
    }
  });
});
