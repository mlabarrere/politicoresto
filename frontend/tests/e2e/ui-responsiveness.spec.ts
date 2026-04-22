import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

/**
 * User Story 9 — UI responsiveness.
 *
 * Perf budgets rather than functional correctness. Failures here do
 * NOT block CI today — they're captured in the test output for team
 * calibration. Once the measurements have stabilised across a few runs
 * we promote the expectations from `.soft` to hard. The starting
 * budgets below are generous by design; tighten as calibration data
 * accumulates.
 *
 * Budgets (ms, first load, local dev server on GitHub Actions):
 *   - home route: 3000
 *   - /auth/login: 1500
 *   - /me (authed): 3500
 *   - /post/new (authed): 3500
 */
test.describe('User Story 9 — UI responsiveness', () => {
  test('home route domcontentloaded under budget', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - t0;
    console.info(`[ui-resp] home DOMContentLoaded: ${elapsed}ms`);
    expect.soft(elapsed).toBeLessThan(3000);
  });

  test('/auth/login domcontentloaded under budget', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - t0;
    console.info(`[ui-resp] /auth/login DOMContentLoaded: ${elapsed}ms`);
    expect.soft(elapsed).toBeLessThan(1500);
  });

  test('/me (authed) domcontentloaded under budget', async ({ page }) => {
    await signInAsSeedUser(page);
    const t0 = Date.now();
    await page.goto('/me', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - t0;
    console.info(`[ui-resp] /me DOMContentLoaded: ${elapsed}ms`);
    expect.soft(elapsed).toBeLessThan(3500);
  });

  test('/post/new (authed) domcontentloaded under budget', async ({ page }) => {
    await signInAsSeedUser(page);
    const t0 = Date.now();
    await page.goto('/post/new', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - t0;
    console.info(`[ui-resp] /post/new DOMContentLoaded: ${elapsed}ms`);
    expect.soft(elapsed).toBeLessThan(3500);
  });
});
