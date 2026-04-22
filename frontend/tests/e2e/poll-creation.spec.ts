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

  // Full submission requires driving the poll-option inputs, date
  // pickers (deadline_at), and asserting the structure landed in
  // public.post_poll + public.post_poll_option. Fixme until the
  // composer selectors stabilise (they rely on runtime tab state).
  test.fixme('submits and persists a poll with 4 options', async () => {
    // TODO:
    //   - fill title + question
    //   - add 4 options
    //   - set deadline
    //   - submit
    //   - assert post_poll row + 4 post_poll_option rows with
    //     correct sort_order.
  });
});
