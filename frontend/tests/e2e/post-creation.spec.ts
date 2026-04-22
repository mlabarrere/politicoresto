import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('User Story 2 — post creation', () => {
  test('happy path: signed-in user lands on /post/new and sees the composer', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');
    await expect(page.getByRole('tab', { name: /Post/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Sondage/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Enregistrer le brouillon/i }),
    ).toBeVisible();
  });

  test('failure path: anonymous visit to /post/new redirects or refuses', async ({
    page,
  }) => {
    await page.goto('/post/new');
    // Either the middleware gate bounces to login, or the page server
    // component redirects. Both are acceptable auth enforcement.
    await expect(page).not.toHaveURL(/\/post\/new$/);
  });

  // Full end-to-end submission is fixme until the test harness can
  // reliably drive the form fields (markdown body, subject picker) and
  // verify the row landed in public.thread_post. Tracked as E2E
  // follow-up.
  test.fixme('submits and persists a post', async () => {
    // TODO: fill composer, submit, assert presence in feed + DB row.
  });
});
