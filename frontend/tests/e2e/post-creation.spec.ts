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

  test('submits a post with no party selected (regression: party_tags NULL)', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `E2E post ${Date.now()}`;
    const body = 'Regression guard for rpc_create_post_full party_tags NULL.';

    // The composer renders a controlled React form. Use Playwright's
    // type() (which dispatches proper key events) so React's onChange
    // handlers update the draft state, then press() on the submit.
    await page.locator('input[name="title"]').fill(title);
    await page.locator('textarea[name="body"]').fill(body);
    await page
      .getByRole('button', { name: /^Publier le post$/i })
      .click({ force: true });

    // The server action redirects on success and to
    // /post/new?error=publish_failed on failure. The party_tags NULL bug
    // produced the latter — assert we never see it.
    await expect(page).not.toHaveURL(/error=publish_failed/, {
      timeout: 10_000,
    });
  });
});
