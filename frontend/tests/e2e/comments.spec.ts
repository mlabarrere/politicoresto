import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('User Story 3 — comments', () => {
  test('happy path: authed user on a post page sees comment composer', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/');
    const postLinks = page
      .locator('a[href^="/post/"]:not([href="/post/new"])')
      .locator('visible=true');
    const count = await postLinks.count();
    test.skip(count === 0, 'No posts in seeded feed');
    await postLinks.first().click();
    await expect(page).toHaveURL(/\/post\//);
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
