import type { Page } from '@playwright/test';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';

  // Use @supabase/ssr in Node with an in-memory cookie jar so the session
  // cookies are written in the exact format middleware + server client
  // expect (chunked `sb-<ref>-auth-token.{0,1,...}`). We then transplant
  // those cookies onto the Playwright browser context.
  const jar = new Map<string, { value: string; options: CookieOptions }>();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () =>
        Array.from(jar.entries()).map(([name, { value }]) => ({ name, value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          jar.set(name, { value, options: options ?? {} });
        }
      },
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123',
  });
  if (signInError) {
    throw new Error(`signInAsSeedUser failed: ${signInError.message}`);
  }

  // The E2E webServer binds 127.0.0.1:3001 (see playwright.config.ts).
  await page.context().addCookies(
    Array.from(jar.entries()).map(([name, { value }]) => ({
      name,
      value,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    })),
  );

  // Confirm middleware accepts the session.
  await page.goto('/me');
  if (page.url().includes('/auth/login')) {
    throw new Error(
      'signInAsSeedUser: middleware redirected /me back to /auth/login — session cookies did not propagate',
    );
  }
}
