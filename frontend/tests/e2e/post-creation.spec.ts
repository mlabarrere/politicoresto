/**
 * User Story 2 — post creation.
 *
 * Core feature: a signed-in user opens the composer, fills it out, submits,
 * and afterwards sees their post in the feed. Three supported modes must
 * all work end-to-end:
 *
 *   (a) text post (mode='post', body required)
 *   (b) poll post (mode='poll', question + ≥2 options)
 *   (c) post tagged with a political party (applies to either mode)
 *
 * The historical failure this suite guards against: the RPC succeeded,
 * the DB row was written, but `redirect()` lived inside a try/catch block
 * so Next's internal NEXT_REDIRECT throw was swallowed. The user landed
 * on `/post/new?error=publish_failed` staring at an "impossible" banner
 * while their post existed in the database. This E2E would have caught it.
 */
import { expect, test, type Page } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

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
    await expect(page.getByRole('tab', { name: /^Post$/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Sondage$/i })).toBeVisible();
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

  // ── Happy path (b): poll post with question + 2 options ─────────────────
  test('happy: poll post submits (question + options + deadline) and appears in feed', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    const title = `E2E poll ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);

    // Switch to poll tab. Clicking the tab trigger is the user-visible path.
    await page.getByRole('tab', { name: /^Sondage$/i }).click();

    await page.locator('input[name="poll_question"]').fill('Pour ou contre ?');
    const optionInputs = page.locator('input[name="poll_options"]');
    await optionInputs.nth(0).fill('Pour');
    await optionInputs.nth(1).fill('Contre');
    await page.locator('select[name="poll_deadline_hours"]').selectOption('24');

    await submitAndAssertPublished(page);

    await page.goto('/');
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
  });

  // ── Happy path (c): post tagged with one party ─────────────────────────
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

  // ── Failure: poll mode with only one option is rejected client-side ────
  test('failure: poll with <2 options is blocked by HTML required-attribute', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    await page.locator('input[name="title"]').fill(`Bad poll ${Date.now()}`);
    await page.getByRole('tab', { name: /^Sondage$/i }).click();
    await page.locator('input[name="poll_question"]').fill('Q?');
    // Fill ONLY option 1, leave option 2 empty. The HTML `required` on the
    // first two option inputs means the submit never reaches the server.
    await page.locator('input[name="poll_options"]').nth(0).fill('Only one');

    await page
      .getByRole('button', { name: /^Publier le post$/i })
      .click({ force: true });

    // Still on /post/new; browser refused to submit. Nothing created.
    await expect(page).toHaveURL(/\/post\/new$/);
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
