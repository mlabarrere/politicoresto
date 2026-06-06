/**
 * User Story 2 — post creation.
 *
 * Core feature: a signed-in user opens the composer, fills it out, submits,
 * and afterwards sees their post in the feed. Supported flows:
 *
 *   (a) text post (body required)
 *   (b) post tagged with a political party
 *
 * The historical failure this suite guards against: the RPC succeeded,
 * the DB row was written, but `redirect()` lived inside a try/catch block
 * so Next's internal NEXT_REDIRECT throw was swallowed. The user landed
 * on `/post/new?error=publish_failed` staring at an "impossible" banner
 * while their post existed in the database. This E2E would have caught it.
 */
import { expect, test, type Page } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';
import { wipeSeedUserPosts } from './helpers/cleanup';

test.beforeAll(wipeSeedUserPosts);

async function fillTitleAndBody(page: Page, title: string, body: string) {
  await page.locator('input[name="title"]').fill(title);
  await page.locator('textarea[name="body"]').fill(body);
}

async function submitAndAssertPublished(page: Page) {
  await page
    .getByRole('button', { name: /^Publier le post$/i })
    .click({ force: true });
  // The action writes the row then redirects to '/' (or redirect_path).
  // Either URL change is acceptance; failure mode is staying on /post/new
  // with ?error=publish_failed (the old redirect-in-try/catch bug).
  await expect(page).not.toHaveURL(/error=publish_failed/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/post\/new/, { timeout: 10_000 });
}

test.describe('User Story 2 — post creation', () => {
  // ── Smoke: composer renders and has all required controls ──────────────
  test('composer renders for signed-in user with all required controls', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="body"]')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Publier le post$/i }),
    ).toBeVisible();
  });

  // ── Happy path (a): text post, no extras — then visible in feed ────────
  test('happy: text post submits, redirects, and appears in the home feed', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `E2E text post ${Date.now()}`;
    const body =
      'Regression guard for redirect-in-try/catch + party_tags NULL.';
    await fillTitleAndBody(page, title, body);
    await submitAndAssertPublished(page);

    // Post must be visible to the user, not just to the database.
    await page.goto('/');
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
  });

  // ── Happy path (b): post tagged with one party ─────────────────────────
  test('happy: text post with a party tag selected submits and is listed', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `E2E party-tagged post ${Date.now()}`;
    await fillTitleAndBody(page, title, 'Tagged with PS.');

    // The composer renders each party as a <button> with the label string;
    // a click toggles it into draft.party_tags (see components/home/post-composer.tsx).
    await page.getByRole('button', { name: '🌹 PS' }).click();

    await submitAndAssertPublished(page);

    await page.goto('/');
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
  });

  // ── Failure: anonymous cannot reach the composer ───────────────────────
  test('failure: anonymous visit to /post/new does not expose the composer', async ({
    page,
  }) => {
    await page.goto('/post/new');
    // Middleware + page-level auth gate combine to keep the composer out of
    // reach. Accept either a redirect to /auth/login or a server-side bounce.
    await expect(page).not.toHaveURL(/\/post\/new$/);
  });

  // ── Draft preservation (already covered by the project, kept here) ─────
  test('localStorage draft survives a full reload of /post/new', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `Draft test ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await page.locator('textarea[name="body"]').fill('Body preserved.');
    await page.waitForTimeout(200); // let auto-save flush

    await page.reload();

    await expect(page.locator('input[name="title"]')).toHaveValue(title);
    await expect(page.locator('textarea[name="body"]')).toHaveValue(
      'Body preserved.',
    );
  });
});
