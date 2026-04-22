import { readFileSync } from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SEED_STORAGE_STATE_PATH } from '../global-setup';

type Cookie = Parameters<BrowserContext['addCookies']>[0][number];

/**
 * Load the seed user's session into the current Playwright context by
 * replaying the cookies that global-setup.ts persisted at the start of
 * the run.
 *
 * The seed session was minted via Supabase's admin magic-link flow
 * (no password, no OAuth provider mock — see global-setup.ts). Reusing
 * it per test avoids single-use-token rate limits and produces a session
 * cookie identical to what a real Google callback would set.
 *
 * For tests that need a FRESH, unauthenticated context, simply don't
 * call this helper — Playwright defaults to an empty context.
 */
export async function signInAsSeedUser(page: Page): Promise<void> {
  let state: { cookies: Cookie[] };
  try {
    state = JSON.parse(readFileSync(SEED_STORAGE_STATE_PATH, 'utf8')) as {
      cookies: Cookie[];
    };
  } catch (err) {
    throw new Error(
      `signInAsSeedUser: could not read ${SEED_STORAGE_STATE_PATH} — did global-setup run? Underlying: ${(err as Error).message}`,
    );
  }

  await page.context().addCookies(state.cookies);

  // Confirm middleware accepts the session.
  await page.goto('/me');
  if (page.url().includes('/auth/login')) {
    throw new Error(
      'signInAsSeedUser: middleware redirected /me back to /auth/login — storage state likely stale (rerun global-setup by restarting the Playwright run)',
    );
  }
}

/**
 * Sign an arbitrary user into the Playwright context via the same
 * admin-magic-link flow `global-setup.ts` uses for the seed user.
 *
 * Useful for tests that need a fresh, unseeded user — e.g. the
 * onboarding flow where the seed user already has a username (and is
 * therefore never bounced to /onboarding).
 *
 * The user MUST already exist in auth.users (create them first via
 * tests/fixtures/supabase-admin.ts `createEphemeralUser` or the admin
 * API).
 */
export async function signInAsUser(page: Page, email: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      'signInAsUser: Supabase env vars missing — playwright.config.ts populates these.',
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(
      `signInAsUser(${email}): generateLink failed: ${linkError?.message ?? 'missing hashed_token'}`,
    );
  }

  const jar = new Map<string, { value: string; options: CookieOptions }>();
  const client = createServerClient(supabaseUrl, publishableKey, {
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

  const { error: verifyError } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError) {
    throw new Error(
      `signInAsUser(${email}): verifyOtp failed: ${verifyError.message}`,
    );
  }

  const cookies: Cookie[] = Array.from(jar.entries()).map(
    ([name, { value }]) => ({
      name,
      value,
      domain: '127.0.0.1',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    }),
  );
  await page.context().addCookies(cookies);
}
