import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Playwright global setup — authenticate the seed user ONCE and persist
 * the browser storage state (cookies) to disk. Every test then loads it
 * via `signInAsSeedUser()` (or project-level `use.storageState`).
 *
 * Why once: magic-link tokens are single-use and subject to a short
 * rate-limit window per user. Minting one per test causes intermittent
 * `"Email link is invalid or has expired"` failures. The session cookie
 * itself has a multi-hour lifetime, so one sign-in per CI job / local
 * run is plenty.
 *
 * No password is ever used. `auth.admin.generateLink({type: 'magiclink'})`
 * proves the seed user exists in auth.users; `auth.verifyOtp()` redeems
 * the token through the same @supabase/ssr machinery the app uses —
 * producing a bit-for-bit-identical session to a real Google callback.
 */
const SEED_EMAIL = 'test@example.com';
export const SEED_STORAGE_STATE_PATH = 'tests/e2e/.auth/seed-user.json';

export default async function globalSetup(): Promise<void> {
  // Staging runs use their own seeded credentials — nothing to do here.
  if (process.env.E2E_BASE_URL) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      'global-setup: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / E2E_SUPABASE_SERVICE_ROLE_KEY must be populated by playwright.config.ts',
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: SEED_EMAIL,
    });
  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(
      `global-setup: generateLink failed: ${linkError?.message ?? 'missing hashed_token'}`,
    );
  }

  const jar = new Map<string, { value: string; options: CookieOptions }>();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
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
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError) {
    throw new Error(`global-setup: verifyOtp failed: ${verifyError.message}`);
  }

  // Write a Playwright storageState JSON. The browser targets 127.0.0.1
  // on the webServer port (see playwright.config.ts baseURL).
  const storageState = {
    cookies: Array.from(jar.entries()).map(([name, { value }]) => ({
      name,
      value,
      domain: '127.0.0.1',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    })),
    origins: [],
  };

  mkdirSync(dirname(SEED_STORAGE_STATE_PATH), { recursive: true });
  writeFileSync(SEED_STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
}
