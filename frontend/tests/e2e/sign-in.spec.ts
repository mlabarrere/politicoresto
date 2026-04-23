import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('User Story 1 — sign-in', () => {
  test('happy path: seed user signs in via admin magic-link, reaches /me', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    // After helper completes, we should already be on /me (it navigates there
    // and asserts we're not bounced to /auth/login).
    await expect(page).toHaveURL(/\/me(\?|$)/);
    await expect(
      page.getByRole('heading', { name: 'Profil', exact: true }),
    ).toBeVisible();
  });

  test('failure path: anonymous visit to /me redirects to /auth/login', async ({
    page,
  }) => {
    await page.goto('/me');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(
      page.getByRole('button', { name: /Continuer avec Google/i }),
    ).toBeVisible();
  });
});
