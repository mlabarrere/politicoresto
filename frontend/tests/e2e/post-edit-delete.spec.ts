/**
 * User Story 2b — post edit + delete.
 *
 * Backend RPCs rpc_update_thread_post / rpc_delete_thread_post have existed
 * and been tested since baseline (frontend/tests/integration/post-crud.int.test.ts).
 * This spec guards the UI that exposes them:
 *
 *   - Owner sees the "..." menu on their own post; non-owner does not.
 *   - Edit: owner lands on /post/{slug}/edit, changes title, submits, the
 *     updated title shows on the post page and the home feed.
 *   - Delete: owner clicks Delete twice (confirm), the post leaves the feed.
 */
import { expect, test, type Page } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';
import { wipeSeedUserPosts } from './helpers/cleanup';

test.beforeAll(wipeSeedUserPosts);

async function createTextPost(page: Page, title: string, body: string) {
  await page.goto('/post/new');
  await page.locator('input[name="title"]').fill(title);
  await page.locator('textarea[name="body"]').fill(body);
  await page
    .getByRole('button', { name: /^Publier le post$/i })
    .click({ force: true });
  await expect(page).not.toHaveURL(/\/post\/new/, { timeout: 10_000 });
}

test.describe('User Story 2b — post edit + delete', () => {
  test('owner edits title, change persists on post page and home feed', async ({
    page,
  }) => {
    await signInAsSeedUser(page);

    const originalTitle = `E2E edit src ${Date.now()}`;
    const editedTitle = `E2E edit done ${Date.now()}`;
    await createTextPost(page, originalTitle, 'Original body.');

    // Open the post, then open the owner menu.
    await page.goto('/');
    await page.getByText(originalTitle).first().click();
    await expect(page).toHaveURL(/\/post\//);

    await page.getByRole('button', { name: /Actions post/i }).click();
    await page.getByRole('menuitem', { name: /Modifier/i }).click();
    await expect(page).toHaveURL(/\/edit$/);

    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill(editedTitle);
    await page.getByRole('button', { name: /Enregistrer/i }).click();

    // Back on the post page with the new title.
    await expect(page).toHaveURL(/\/post\/[^/]+$/, { timeout: 10_000 });
    await expect(page.getByText(editedTitle).first()).toBeVisible();

    // Home feed must reflect the new title too — rpc_update_thread_post
    // propagates to topic.title on root-article edits.
    await page.goto('/');
    await expect(page.getByText(editedTitle).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('owner deletes: post disappears from feed', async ({ page }) => {
    await signInAsSeedUser(page);

    const title = `E2E delete ${Date.now()}`;
    await createTextPost(page, title, 'Will be deleted.');

    await page.goto('/');
    await page.getByText(title).first().click();
    await expect(page).toHaveURL(/\/post\//);

    // Open the menu, click Supprimer → confirm modal opens. Click Supprimer
    // in the modal to actually delete.
    await page.getByRole('button', { name: /Actions post/i }).click();
    await page.getByRole('menuitem', { name: /^Supprimer/i }).click();
    await expect(
      page.getByRole('heading', { name: /Supprimer ce post/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Supprimer$/i }).click();

    // Server action redirects to '/'. Post must no longer appear.
    await expect(page).toHaveURL('/', { timeout: 10_000 });
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test('non-owner does not see the owner menu', async ({ page }) => {
    // Seed user posts something.
    await signInAsSeedUser(page);
    const title = `E2E visible-to-author-only ${Date.now()}`;
    await createTextPost(page, title, 'Only the author may edit.');

    // Log out + visit anonymously — no owner menu.
    await page.context().clearCookies();
    await page.goto('/');
    await page.getByText(title).first().click();
    await expect(page).toHaveURL(/\/post\//);
    await expect(
      page.getByRole('button', { name: /Actions post/i }),
    ).toHaveCount(0);
  });
});
