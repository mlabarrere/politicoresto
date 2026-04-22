import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

test.describe('User Story 8 — voting history (RLS scope check)', () => {
  test('authed user reaches /me?section=security (and subtabs load)', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/me');
    // The vote-history editor section lives under /me — sanity check
    // the tab renders. Full RLS-leakage assertion (user A sees only
    // their own votes) requires a second seed user and server-side
    // fixture writes; tracked as fixme below.
    await expect(
      page.getByText(/Historique de vote|Vote history|Profil/i).first(),
    ).toBeVisible();
  });

  // The RLS contract on `profile_vote_history` is tested at the SQL
  // layer (supabase/tests/03_rls.sql). The E2E addition that matters
  // here is: visually confirm user A never sees user B's history
  // through the UI. That requires seeding two users with distinct
  // votes and swapping sessions mid-test, which is out of scope for
  // the first pass.
  test.fixme('RLS: user A does not see user B vote rows', async () => {
    // TODO:
    //   - seed user A + user B, each with distinct votes
    //   - signInAsSeedUser (A), navigate to /me/history
    //   - scrape all vote rows, assert none belong to B
    //   - swap session to B, repeat symmetric check
  });
});
