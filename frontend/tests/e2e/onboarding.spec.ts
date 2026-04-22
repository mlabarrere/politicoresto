/**
 * User Story — onboarding (first-time username claim).
 *
 * When a new user signs in via Google and has no `app_profile.username`,
 * `/auth/callback/route.ts` redirects them to `/onboarding?next=/`. The
 * onboarding form is a single text input that calls `setUsernameAction`
 * which validates format + reserved list, checks uniqueness, and writes
 * to `app_profile`.
 *
 * These tests use a fresh ephemeral user (not the seed user, who already
 * has a profile row — and because our magic-link-based test helper
 * bypasses the callback route, the seed user never naturally hits
 * onboarding in tests).
 */
import { expect, test } from '@playwright/test';
import { adminClient, createEphemeralUser } from '../fixtures/supabase-admin';
import { signInAsUser } from './helpers/auth';

test.describe('User Story — onboarding (username claim)', () => {
  test('anonymous: /onboarding redirects to /auth/login', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('happy: authed user without username can claim one and is redirected', async ({
    page,
  }) => {
    const user = await createEphemeralUser(`onb-${Date.now()}`);
    // createEphemeralUser set a username via app_profile.upsert — undo
    // that so this test exercises the "no username yet" path.
    const admin = adminClient();
    await admin
      .from('app_profile')
      .update({ username: null })
      .eq('user_id', user.userId);

    await signInAsUser(page, user.email);
    await page.goto('/onboarding');

    const username = `onbnew${Date.now()}`.slice(0, 24);
    await page.locator('input[name="username"]').fill(username);
    await page.getByRole('button', { name: /Continuer/i }).click();

    // On success, the server action redirects away from /onboarding
    // (usually to `next`, defaulting to `/`).
    await expect(page).not.toHaveURL(/\/onboarding/, { timeout: 10_000 });

    // Ground truth: the username landed on the profile row.
    const { data: row } = await admin
      .from('app_profile')
      .select('username')
      .eq('user_id', user.userId)
      .single();
    expect(String(row?.username ?? '').toLowerCase()).toBe(
      username.toLowerCase(),
    );

    await admin.auth.admin.deleteUser(user.userId);
  });

  test('failure: reserved username (e.g. "admin") is rejected', async ({
    page,
  }) => {
    const user = await createEphemeralUser(`onb-res-${Date.now()}`);
    const admin = adminClient();
    await admin
      .from('app_profile')
      .update({ username: null })
      .eq('user_id', user.userId);

    await signInAsUser(page, user.email);
    await page.goto('/onboarding');

    await page.locator('input[name="username"]').fill('admin');
    await page.getByRole('button', { name: /Continuer/i }).click();

    // Stays on /onboarding; profile.username remains null.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 5_000 });

    const { data: row } = await admin
      .from('app_profile')
      .select('username')
      .eq('user_id', user.userId)
      .single();
    expect(row?.username).toBeNull();

    await admin.auth.admin.deleteUser(user.userId);
  });

  test('failure: username already taken by someone else is rejected', async ({
    page,
  }) => {
    const admin = adminClient();
    const incumbent = await createEphemeralUser(
      `incumbent-${Date.now()}`.slice(0, 24),
    );
    // createEphemeralUser already claimed `incumbent.username` via upsert.
    const { data: incumbentRow } = await admin
      .from('app_profile')
      .select('username')
      .eq('user_id', incumbent.userId)
      .single();
    expect(incumbentRow?.username).toBeTruthy();
    const taken = String(incumbentRow!.username);

    const challenger = await createEphemeralUser(
      `challenger-${Date.now()}`.slice(0, 24),
    );
    await admin
      .from('app_profile')
      .update({ username: null })
      .eq('user_id', challenger.userId);

    await signInAsUser(page, challenger.email);
    await page.goto('/onboarding');
    await page.locator('input[name="username"]').fill(taken.toUpperCase()); // case-insensitive via citext
    await page.getByRole('button', { name: /Continuer/i }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 5_000 });

    const { data: row } = await admin
      .from('app_profile')
      .select('username')
      .eq('user_id', challenger.userId)
      .single();
    expect(row?.username).toBeNull();

    await admin.auth.admin.deleteUser(incumbent.userId);
    await admin.auth.admin.deleteUser(challenger.userId);
  });
});
