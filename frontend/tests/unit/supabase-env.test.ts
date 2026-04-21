import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('supabaseEnv', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns url when env var is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'anon-key');
    const { supabaseEnv } = await import('@/lib/supabase/env');
    expect(supabaseEnv.url()).toBe('https://example.supabase.co');
  });

  it('returns publishableKey when env var is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'anon-key');
    const { supabaseEnv } = await import('@/lib/supabase/env');
    expect(supabaseEnv.publishableKey()).toBe('anon-key');
  });
});
