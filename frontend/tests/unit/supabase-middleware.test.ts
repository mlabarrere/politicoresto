import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock('@/lib/supabase/env', () => ({
  supabaseEnv: {
    url: () => 'https://example.supabase.co',
    publishableKey: () => 'anon-key',
  },
}));

import { updateSession } from '@/lib/supabase/middleware';

function makeRequest(
  pathname: string,
  init?: { method?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${pathname}`, init);
}

function makeClient(claims: unknown = null) {
  return {
    auth: {
      getClaims: mocks.getClaims.mockResolvedValue({ data: { claims } }),
    },
  };
}

describe('updateSession', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      // invoke getAll/setAll so the branch is covered
      if (options?.cookies?.getAll) options.cookies.getAll();
      return makeClient(null);
    });
  });

  it('redirects unauthenticated requests to /me to login', async () => {
    const request = makeRequest('/me');
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/login');
    expect(location).toContain('next=%2Fme');
  });

  it('allows authenticated requests to /me through', async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      if (options?.cookies?.getAll) options.cookies.getAll();
      return {
        auth: {
          getClaims: mocks.getClaims.mockResolvedValue({
            data: { claims: { sub: 'user-1' } },
          }),
        },
      };
    });
    const request = makeRequest('/me');
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it('passes through public routes without redirect', async () => {
    const request = makeRequest('/');
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it('passes through /auth routes without redirect', async () => {
    const request = makeRequest('/auth/login');
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it('redirects unauthenticated /me/settings to login with correct next', async () => {
    const request = makeRequest('/me/settings');
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain(encodeURIComponent('/me/settings'));
  });

  it('skips auth.getClaims() on server action POSTs (next-action header)', async () => {
    const request = makeRequest('/me', {
      method: 'POST',
      headers: { 'next-action': 'some-action-id' },
    });
    const response = await updateSession(request);
    expect(response.status).toBe(200);
    // Le seul but du middleware etant de rediriger les GET non-auth, il ne doit
    // pas consommer un round-trip Supabase Auth sur les server actions.
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it('always calls auth.getClaims() on GET navigations to refresh expired JWT (anti-regression)', async () => {
    // Sans ce call, le access_token expire après ~1h et l'app pense que
    // l'utilisateur est anonyme, même si le refresh_token est toujours valide.
    // Pattern officiel Supabase SSR (getClaims : validation JWT locale via JWKS,
    // fallback interne sur getUser si signature échoue).
    const request = makeRequest('/post/some-slug');
    const response = await updateSession(request);
    expect(response.status).toBe(200);
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
  });
});
