/**
 * User Story 7 — poll response.
 *
 * User visits a poll post, clicks one of the options, and the UI
 * switches from "vote" mode to "results" mode with the sample-count
 * updated. A second visit (or any subsequent render) should show the
 * results view directly because `selected_option_id` is present on the
 * summary.
 *
 * Known product-spec gaps (NOT tested here — these are tracked as
 * product/engineering work, not as UI gaps):
 *   - Weighted / corrected results: view currently returns raw = weighted
 *   - Confidence score: view returns hardcoded 100 or 0
 *   - UI doesn't render either (PollResults shows raw only)
 *   - RPC allows revoting (on conflict do update) despite spec saying no
 */
import { expect, test } from '@playwright/test';
import { adminClient, createTestPoll } from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';

let pollSlug: string;
let pollIds: { threadId: string; postItemId: string; optionIds: string[] };

test.beforeAll(async () => {
  const created = await createTestPoll({
    title: `Poll-response E2E ${Date.now()}`,
    question: 'Pour ou contre la réforme ?',
    optionLabels: ['Pour', 'Contre', 'Sans avis'],
  });
  pollSlug = created.slug;
  pollIds = {
    threadId: created.threadId,
    postItemId: created.postItemId,
    optionIds: created.optionIds,
  };
});

test.afterAll(async () => {
  const admin = adminClient();
  if (pollIds?.postItemId) {
    await admin.from('thread_post').delete().eq('id', pollIds.postItemId);
    await admin.from('topic').delete().eq('id', pollIds.threadId);
  }
});

test.beforeEach(async () => {
  // Clear any prior responses for the seed user so each test starts with
  // a fresh "has not voted" UI state.
  const admin = adminClient();
  await admin
    .from('post_poll_response')
    .delete()
    .eq('post_item_id', pollIds.postItemId);
});

test.describe('User Story 7 — poll response', () => {
  test('anonymous: poll card renders options but buttons are disabled', async ({
    page,
  }) => {
    await page.goto(`/post/${pollSlug}`);
    await expect(
      page.getByRole('heading', { name: /Poll-response E2E/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Pour ou contre la réforme ?')).toBeVisible();

    // All three option buttons render but are disabled for anon.
    const pourBtn = page.getByRole('button', { name: /^Pour$/ });
    await expect(pourBtn).toBeVisible();
    await expect(pourBtn).toBeDisabled();
  });

  test('happy: authed user clicks an option → UI switches to results', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${pollSlug}`);
    await expect(page.getByText('Pour ou contre la réforme ?')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: /^Pour$/ }).click();

    // After the vote, the UI swaps to the results view with a sample count.
    await expect(page.getByText(/^Resultats/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/^1 vote$/)).toBeVisible({ timeout: 5_000 });

    // Vote buttons are gone — option labels should no longer be clickable.
    await expect(page.getByRole('button', { name: /^Pour$/ })).toHaveCount(0);
  });

  test('returning to the poll after voting shows results directly (no vote buttons)', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${pollSlug}`);
    await page.getByRole('button', { name: /^Contre$/ }).click();
    await expect(page.getByText(/^Resultats/i)).toBeVisible({
      timeout: 10_000,
    });

    // Full reload: SSR should now return selected_option_id on the summary,
    // so the UI renders results immediately without a "vote" state flicker.
    await page.reload();
    await expect(page.getByText(/^Resultats/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /^Contre$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Pour$/ })).toHaveCount(0);
  });

  test('two voters on two different options produce sample_size=2', async ({
    browser,
    page,
  }) => {
    // Seed user votes "Pour".
    await signInAsSeedUser(page);
    await page.goto(`/post/${pollSlug}`);
    await page.getByRole('button', { name: /^Pour$/ }).click();
    await expect(page.getByText(/^1 vote$/)).toBeVisible({ timeout: 10_000 });

    // Second voter via a second browser context + a fresh ephemeral user.
    // Simplest: use admin-backed INSERT to add a second response row, then
    // have the seed user reload the page and see the count increment.
    const admin = adminClient();
    const { data: otherUser, error } = await admin.auth.admin.createUser({
      email: `poll-voter-${Date.now()}@example.test`,
      email_confirm: true,
    });
    if (error || !otherUser.user) {
      throw new Error(`failed to create second voter: ${error?.message}`);
    }
    await admin.from('app_profile').upsert(
      {
        user_id: otherUser.user.id,
        username: `pvt-${Date.now()}`,
        display_name: 'pvt',
      },
      { onConflict: 'user_id' },
    );
    await admin.from('post_poll_response').insert({
      post_item_id: pollIds.postItemId,
      option_id: pollIds.optionIds[1], // "Contre"
      user_id: otherUser.user.id,
    });

    await page.reload();
    await expect(page.getByText(/^2 votes$/)).toBeVisible({ timeout: 10_000 });

    // Cleanup the ephemeral user.
    await admin.auth.admin.deleteUser(otherUser.user.id);
    // (avoid unused warning)
    void browser;
  });
});
