import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('User Story 6 — poll creation', () => {
  test('authed user can switch the composer to "Sondage" mode', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');
    await page.getByRole('tab', { name: /Sondage/i }).click();
    await expect(page.getByText(/Mode sondage/i)).toBeVisible();
  });

  test('submits a poll without triggering the post body required guard (regression: invalid focus)', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `E2E poll ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await page.getByRole('tab', { name: /Sondage/i }).click();

    await page.locator('input[name="poll_question"]').fill('Oui ou non ?');
    const options = page.locator('input[name="poll_options"]');
    await options.nth(0).fill('Oui');
    await options.nth(1).fill('Non');

    await page
      .getByRole('button', { name: /^Publier le post$/i })
      .click({ force: true });

    // The post body textarea (required in 'post' mode, hidden in 'poll')
    // must not block submission of a Sondage. Before the fix the browser
    // reported "invalid form control name='body' is not focusable".
    await expect(page).not.toHaveURL(/error=publish_failed/, {
      timeout: 10_000,
    });
  });
});
