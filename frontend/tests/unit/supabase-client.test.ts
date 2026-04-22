import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mocks.createBrowserClient,
}));

vi.mock('@/lib/supabase/env', () => ({
  supabaseEnv: {
    url: () => 'https://example.supabase.co',
    publishableKey: () => 'anon-key',
  },
}));

describe('createBrowserSupabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createBrowserClient.mockReset();
    mocks.createBrowserClient.mockReturnValue({ auth: {} });
  });

  it('creates a browser client with env vars', async () => {
    const { createBrowserSupabaseClient } =
      await import('@/lib/supabase/client');
    createBrowserSupabaseClient();
    expect(mocks.createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
    );
  });

  it('returns the same client instance on second call (singleton)', async () => {
    const { createBrowserSupabaseClient } =
      await import('@/lib/supabase/client');
    const c1 = createBrowserSupabaseClient();
    const c2 = createBrowserSupabaseClient();
    expect(c1).toBe(c2);
    expect(mocks.createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
