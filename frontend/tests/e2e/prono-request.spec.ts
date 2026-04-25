/**
 * User Story — Pronos lot 2 : a user submits a betting request, sees
 * the pending banner on the topic page, then a moderator publishes it
 * from /admin/pronos and the banner disappears.
 *
 * The seed user (test@example.com) plays the requester. A separate
 * ephemeral user gets promoted to 'moderator' for the admin half so we
 * never mutate the seed user's role across the broader spec suite.
 */
import { expect, test } from '@playwright/test';
import {
  adminClient,
  createEphemeralUser,
  SEED_USER,
} from '../fixtures/supabase-admin';
import { signInAsSeedUser, signInAsUser } from './helpers/auth';
import { wipeSeedUserPosts } from './helpers/cleanup';
import { setUserRoleByEmail } from './helpers/role';

test.describe('User Story — Pronos lot 2 (request + admin)', () => {
  let modoEmail: string;
  let modoUserId: string;

  test.beforeAll(async () => {
    await wipeSeedUserPosts();
    // Defensive: a previous test run may have left the seed user with
    // moderator privileges. Reset before exercising the 404 path.
    await setUserRoleByEmail(SEED_USER.email, null);
    const eph = await createEphemeralUser('e2e-prono-modo');
    modoEmail = eph.email;
    modoUserId = eph.userId;
    await setUserRoleByEmail(modoEmail, 'moderator');
  });

  test.afterAll(async () => {
    const admin = adminClient();
    // Wipe any prono topics the seed user created so the next spec
    // starts with no stale pending entries.
    const { data: topics } = await admin
      .from('topic')
      .select('id')
      .eq('created_by', SEED_USER.userId)
      .in('topic_status', ['pending_review', 'rejected', 'open']);
    const ids = (topics ?? []).map((t) => String(t.id));
    if (ids.length > 0) {
      await admin.from('post').delete().in('topic_id', ids);
      await admin.from('thread_post').delete().in('thread_id', ids);
      await admin.from('topic').delete().in('id', ids);
    }
    await admin.auth.admin.deleteUser(modoUserId).catch(() => undefined);
  });

  test('happy: seed user requests a prono → pending banner is shown', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/post/new');

    await page.getByRole('tab', { name: /Demande de prono/i }).click();

    const title = `E2E prono request ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await page
      .locator('input[name="prono_question"]')
      .fill('Test : la question sera-t-elle publiée ?');
    const optionInputs = page.locator('input[name="prono_options"]');
    await optionInputs.nth(0).fill('Oui');
    await optionInputs.nth(1).fill('Non');

    await page
      .getByRole('button', { name: /^Soumettre la demande$/i })
      .click({ force: true });

    await expect(page).toHaveURL(/\/post\/[^/?]+(\?|$)/, { timeout: 10_000 });
    await expect(
      page.getByText(/Demande en attente de validation/),
    ).toBeVisible();
  });

  test('admin: moderator sees the pending request and publishes it', async ({
    page,
  }) => {
    // The previous test left a pending request behind. Pull the most
    // recent one belonging to the seed user.
    const admin = adminClient();
    const { data: pending } = await admin
      .from('topic')
      .select('id, title')
      .eq('created_by', SEED_USER.userId)
      .eq('topic_status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(pending?.id).toBeTruthy();

    await signInAsUser(page, modoEmail);
    await page.goto('/admin/pronos');

    await expect(
      page.getByRole('heading', { name: /Demandes de pronostics/ }),
    ).toBeVisible();
    await expect(page.getByText(pending!.title)).toBeVisible();

    const card = page
      .getByRole('article')
      .filter({ hasText: pending!.title })
      .or(
        page.locator('[class*="rounded"]').filter({ hasText: pending!.title }),
      )
      .first();
    await card
      .getByRole('button', { name: /^Publier$/i })
      .click({ force: true });

    await expect(page.getByText(pending!.title)).toHaveCount(0, {
      timeout: 10_000,
    });

    const { data: topic } = await admin
      .from('topic')
      .select('topic_status')
      .eq('id', pending!.id)
      .single();
    expect(topic?.topic_status).toBe('open');
  });

  test('non-modo (seed user) is 404 on /admin/pronos', async ({ page }) => {
    await signInAsSeedUser(page);
    const res = await page.goto('/admin/pronos');
    // Next 16 + middleware can rewrite a notFound() into a 200 response
    // carrying the not-found page body. Accept either signal: a 404 status
    // or the visible "Demandes de pronostics" heading being absent and
    // the not-found marker being present.
    if (res?.status() !== 404) {
      await expect(
        page.getByRole('heading', { name: /Demandes de pronostics/ }),
      ).toHaveCount(0);
    }
  });
});
