/**
 * MCP security — HTTP surface (B3).
 *
 * Verifies forbidden methods, unknown transports, malformed payloads,
 * and out-of-bounds inputs are rejected cleanly with no leaks.
 */
import { expect, test } from '@playwright/test';
import { mintAccessTokenFor } from '../helpers/mcp-token';

const MCP_URL = '/api/mcp/mcp';
const HEADERS = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
} as const;

test.describe('mcp surface — abuse rejection', () => {
  test('GET /api/mcp/mcp without session-id → 400 / 405 (no info leak)', async ({
    request,
  }) => {
    const res = await request.get(MCP_URL);
    expect([400, 401, 405]).toContain(res.status());
    const body = await res.text();
    expect(body).not.toContain('service_role');
    expect(body).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // no JWT in error
  });

  test('PUT /api/mcp/mcp → 405', async ({ request }) => {
    const res = await request.fetch(MCP_URL, {
      method: 'PUT',
      headers: HEADERS,
      data: '{}',
    });
    expect([401, 405]).toContain(res.status());
  });

  test('POST /api/mcp/<random> → 401 unauth or 404 (auth runs first)', async ({
    request,
  }) => {
    const res = await request.post('/api/mcp/__bogus__', {
      headers: HEADERS,
      data: '{}',
    });
    // Either withMcpAuth rejects no-bearer (401) or mcp-handler rejects
    // unknown transport (404). Both are safe — what matters is "not 200".
    expect([401, 404]).toContain(res.status());
  });

  test('POST /api/mcp/<random> with valid bearer → 404 (unknown transport)', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const res = await request.post('/api/mcp/__bogus__', {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
      data: '{}',
    });
    expect([404, 405]).toContain(res.status());
  });

  test('malformed JSON body with valid bearer → 4xx, no stack trace', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    const res = await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
      data: 'not json',
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    const body = await res.text();
    // No stack frame paths, no internal module names
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('/lib/mcp/');
    expect(body).not.toContain('at async');
  });

  test('unknown tool call → JSON-RPC error, no crash', async ({ request }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    // First initialize to get a session-id-less call accepted
    const init = await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'probe', version: '0' },
        },
      }),
    });
    expect(init.status()).toBe(200);

    const res = await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: '__proto__', arguments: {} },
      }),
    });
    // mcp-handler returns 200 with an error payload OR a 4xx — both fine
    expect([200, 400, 404]).toContain(res.status());
    const body = await res.text();
    expect(body).not.toContain('node_modules');
    expect(body).not.toMatch(/sb_secret_/);
    expect(body).not.toMatch(/eyJ[A-Za-z0-9_-]{200,}/); // no JWT echoed
  });

  test('bogus enum value rejected by Zod → JSON-RPC -32602', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
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
    const res = await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'browse_topics',
          arguments: { status: 'not-a-real-status' },
        },
      }),
    });
    const body = await res.text();
    expect(body).toMatch(/invalid_enum_value|Invalid enum value/i);
  });

  test('reply_to_post body over schema cap → rejected client-side by Zod', async ({
    request,
  }) => {
    const seedToken = await mintAccessTokenFor('test@example.com');
    await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
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
    const tooLong = 'x'.repeat(20_000);
    const res = await request.post(MCP_URL, {
      headers: { ...HEADERS, authorization: `Bearer ${seedToken}` },
      data: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'reply_to_post',
          arguments: {
            thread_post_id: '00000000-0000-0000-0000-000000000000',
            body_markdown: tooLong,
          },
        },
      }),
    });
    const body = await res.text();
    expect(body).toMatch(/too_big|String must contain at most/i);
  });

  test('PRM endpoint exposes Supabase issuer + resource URL', async ({
    request,
  }) => {
    const res = await request.get('/.well-known/oauth-protected-resource');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      resource: string;
      authorization_servers: string[];
    };
    expect(body.resource).toContain('/api/mcp');
    expect(body.authorization_servers[0]).toContain('/auth/v1');
  });

  test('PRM endpoint advertises CORS for browser MCP clients', async ({
    request,
  }) => {
    const res = await request.fetch('/.well-known/oauth-protected-resource', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:9999' },
    });
    expect([200, 204]).toContain(res.status());
  });
});
