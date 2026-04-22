/**
 * Reference pattern: E2E test.
 *
 * Drives the real browser against `vercel dev` (or `next dev`) + local
 * Supabase. Simulates a real user: navigates, authenticates, clicks,
 * asserts on what is actually rendered.
 *
 * Auth: the app only exposes Google SSO in the UI, but Supabase Auth
 * accepts email/password at the API level for the seeded test user.
 * `signInAsSeedUser` calls that API and transplants the resulting cookies
 * onto the Playwright browser context so middleware sees a real session.
 * NEXT_PUBLIC_SUPABASE_* vars are populated by tests/e2e/global-setup.ts
 * from `supabase status -o env`.
 *
 * Assertions: do NOT assert on implementation details (CSS class names,
 * component internals). Assert on what the user sees — role, name, text.
 */
import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('reference E2E example — authenticated /me loads', () => {
  test('signed-in seed user can reach /me without being bounced to /auth/login', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/me');
    // Assertion proving middleware accepted the session. The exact UI
    // can evolve; the invariant is "we are no longer on the login page".
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });
});
