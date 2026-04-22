import type { Page } from '@playwright/test';

/**
 * Sign in the seed test user via Supabase's password grant, then set the
 * `sb-*` cookies on the Playwright browser context so subsequent
 * navigations see an authenticated session.
 *
 * Uses `supabase.auth.signInWithPassword` from within the browser via
 * `page.evaluate` — this goes through @supabase/ssr and sets cookies
 * identical to what a real OAuth callback would. No test-only bypass
 * endpoint needed.
 *
 * Seed user: `test@example.com` / `password123` (created by
 * `supabase/seed.sql`). The seed is re-applied on every
 * `supabase db reset`.
 */
export async function signInAsSeedUser(page: Page): Promise<void> {
  await page.goto('/auth/login');

  // Drive the browser Supabase client through a dynamic import so the
  // helper works regardless of how the app code is chunked.
  const { error } = await page.evaluate(async () => {
    const mod = (await import(
      '/_next/static/chunks/lib_supabase_client.js' as string
    ).catch(() => null)) as {
      createBrowserSupabaseClient?: () => unknown;
    } | null;
    // Fall back to the fetch-based password grant against the local
    // Supabase auth endpoint — we know the URL/key at this point because
    // the login page has already loaded.
    const url = window.location.origin.includes('localhost')
      ? 'http://127.0.0.1:54321'
      : (document
          .querySelector('meta[name="supabase-url"]')
          ?.getAttribute('content') ?? '');
    const key =
      document
        .querySelector('meta[name="supabase-key"]')
        ?.getAttribute('content') ?? '';
    if (!mod?.createBrowserSupabaseClient) {
      // Last-resort: direct password grant. Used when the app's client
      // module is not directly importable in the test.
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
      if (!res.ok) {
        return { error: `password grant HTTP ${res.status}` };
      }
      return { error: null };
    }
    const supabase = mod.createBrowserSupabaseClient() as {
      auth: {
        signInWithPassword: (c: {
          email: string;
          password: string;
        }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });
    return { error: signInError?.message ?? null };
  });

  if (error) {
    throw new Error(`signInAsSeedUser failed: ${error}`);
  }

  // Nav to /me to confirm the cookie took. If the middleware redirects
  // to /auth/login, the session didn't land and the test should fail.
  await page.goto('/me');
  if (page.url().includes('/auth/login')) {
    throw new Error(
      'signInAsSeedUser: middleware redirected /me back to /auth/login — session cookies did not propagate',
    );
  }
}
