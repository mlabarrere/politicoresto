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

  test('submits a post with no party selected (regression: party_tags NULL + redirect-in-try)', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `E2E post ${Date.now()}`;
    const body = 'Regression guard for rpc_create_post_full party_tags NULL.';

    await page.locator('input[name="title"]').fill(title);
    await page.locator('textarea[name="body"]').fill(body);
    await page
      .getByRole('button', { name: /^Publier le post$/i })
      .click({ force: true });

    await expect(page).not.toHaveURL(/error=publish_failed/, {
      timeout: 10_000,
    });
    // Leaves /post/new on success — the server action redirects to '/'.
    await expect(page).not.toHaveURL(/\/post\/new/, { timeout: 10_000 });
  });

  test('localStorage draft survives a full reload of /post/new', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `Draft test ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await page
      .locator('textarea[name="body"]')
      .fill('Body preserved in draft.');

    // Auto-save runs on every state change (see DRAFT_KEY in
    // post-composer.tsx). Give it a tick to flush.
    await page.waitForTimeout(200);

    await page.reload();

    await expect(page.locator('input[name="title"]')).toHaveValue(title);
    await expect(page.locator('textarea[name="body"]')).toHaveValue(
      'Body preserved in draft.',
    );
  });

  test('manual "Enregistrer le brouillon" does not navigate away and keeps draft', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `Manual draft ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await page.locator('textarea[name="body"]').fill('Explicit save.');

    await page
      .getByRole('button', { name: /Enregistrer le brouillon/i })
      .click();

    // Button is a no-op navigation-wise. Same URL + title still in the
    // input, draft still in localStorage after a reload.
    await expect(page).toHaveURL(/\/post\/new$/);
    await page.reload();
    await expect(page.locator('input[name="title"]')).toHaveValue(title);
  });
});
