import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('User Story 3 — comments', () => {
  test('happy path: authed user on a post page sees comment composer', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    // Navigate to any public post — list first, then pick one.
    await page.goto('/');
    const firstPost = page.getByRole('link', { name: /./ }).first();
    // If no posts yet (empty feed), skip — seed determines this.
    const feedText = await page.locator('body').innerText();
    test.skip(
      !/post/i.exec(feedText) && !/commentaire/i.exec(feedText),
      'No posts in feed — seed has not populated, composer not reachable',
    );
    await firstPost.click();
    await expect(
      page.getByRole('button', { name: /Commenter|Publier/i }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  // Full end-to-end: enter text → submit → assert new comment node
  // present + row in public.<comment table>. Tracked follow-up: needs
  // a known seed post so the test is deterministic across runs.
  test.fixme('persists a new comment and renders it in-place', async () => {
    // TODO: pick known post, submit comment text, assert render + DB.
  });
});
