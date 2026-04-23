/**
 * User Story — account settings.
 *
 * Tests the full user-facing lifecycle of `/me`:
 *   - section=profile: change display_name + bio + submit → persisted
 *   - section=security: deactivate modal → enter DESACTIVER → profile_status='limited'
 *   - section=security: delete modal → enter SUPPRIMER → profile_status='deleted'
 *
 * All tests use ephemeral users (created + deleted per-test) so the
 * destructive operations never touch the seed user. The seed user is
 * shared across every other E2E suite — trashing it would cascade into
 * failures everywhere.
 */
import { expect, test } from '@playwright/test';
import { adminClient, createEphemeralUser } from '../fixtures/supabase-admin';
import { signInAsUser } from './helpers/auth';

test.describe('User Story — account settings', () => {
  test('profile: user updates display_name and bio, change is persisted', async ({
    page,
  }) => {
    const user = await createEphemeralUser(`acc_prof_${Date.now()}`);
    await signInAsUser(page, user.email);
    await page.goto('/me?section=profile');

    const newName = `Renamed ${Date.now()}`;
    const newBio = 'New bio line';
    await page.locator('input[name="display_name"]').fill(newName);
    await page.locator('textarea[name="bio"]').fill(newBio);
    // Wait for the POST response from the server action so the DB read
    // below doesn't race the redirect.
    const [, ,] = await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.status() < 400,
        { timeout: 10_000 },
      ),
      page.getByRole('button', { name: /Enregistrer le profil/i }).click(),
      expect(page).toHaveURL(/\/me\?section=profile/, { timeout: 10_000 }),
    ]);

    // Poll the DB briefly — revalidation can lag behind the response.
    const admin = adminClient();
    let attempt = 0;
    let row: { display_name: string | null; bio: string | null } | null = null;
    while (attempt < 10) {
      const result = await admin
        .from('app_profile')
        .select('display_name, bio')
        .eq('user_id', user.userId)
        .single();
      row = result.data;
      if (row?.display_name === newName && row?.bio === newBio) break;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 200);
      });
      attempt += 1;
    }
    expect(row?.display_name).toBe(newName);
    expect(row?.bio).toBe(newBio);

    await admin.auth.admin.deleteUser(user.userId);
  });

  test('security: deactivation flow sets profile_status=limited', async ({
    page,
  }) => {
    const user = await createEphemeralUser(`acc_deact_${Date.now()}`);
    await signInAsUser(page, user.email);
    await page.goto('/me?section=security');

    // Open the "Desactiver" modal, type the confirmation, submit.
    await page
      .getByRole('button', { name: /^Desactiver$/ })
      .first()
      .click();
    await page.locator('input[name="confirm_deactivate"]').fill('DESACTIVER');
    await page.getByRole('button', { name: /^Confirmer$/ }).click();

    // Verify DB state — this is the ground truth; URL changes are an
    // implementation detail of the action's redirect.
    const admin = adminClient();
    await expect(async () => {
      const { data: row } = await admin
        .from('app_profile')
        .select('profile_status, is_public_profile_enabled')
        .eq('user_id', user.userId)
        .single();
      expect(row?.profile_status).toBe('limited');
      expect(row?.is_public_profile_enabled).toBe(false);
    }).toPass({ timeout: 10_000 });

    await admin.auth.admin.deleteUser(user.userId);
  });

  test('security: deletion flow sets profile_status=deleted and clears bio', async ({
    page,
  }) => {
    const user = await createEphemeralUser(`acc_del_${Date.now()}`);
    // Set a bio via admin so we can verify it's cleared.
    const admin = adminClient();
    await admin
      .from('app_profile')
      .update({ bio: 'will be cleared' })
      .eq('user_id', user.userId);

    await signInAsUser(page, user.email);
    await page.goto('/me?section=security');

    await page
      .getByRole('button', { name: /^Supprimer$/ })
      .first()
      .click();
    await page.locator('input[name="confirm_delete"]').fill('SUPPRIMER');
    await page
      .getByRole('button', { name: /Supprimer definitivement/i })
      .click();

    await expect(async () => {
      const { data: row } = await admin
        .from('app_profile')
        .select('profile_status, bio, is_public_profile_enabled')
        .eq('user_id', user.userId)
        .single();
      expect(row?.profile_status).toBe('deleted');
      expect(row?.bio).toBeNull();
      expect(row?.is_public_profile_enabled).toBe(false);
    }).toPass({ timeout: 10_000 });

    await admin.auth.admin.deleteUser(user.userId);
  });

  test('security: deactivation requires exactly "DESACTIVER" (typo is rejected)', async ({
    page,
  }) => {
    const user = await createEphemeralUser(`acc_typo_${Date.now()}`);
    await signInAsUser(page, user.email);
    await page.goto('/me?section=security');

    await page
      .getByRole('button', { name: /^Desactiver$/ })
      .first()
      .click();
    await page.locator('input[name="confirm_deactivate"]').fill('DESACTIVE'); // missing final R
    await page.getByRole('button', { name: /^Confirmer$/ }).click();

    // Ground truth: profile remains active.
    const admin = adminClient();
    await page.waitForTimeout(500);
    const { data: row } = await admin
      .from('app_profile')
      .select('profile_status')
      .eq('user_id', user.userId)
      .single();
    expect(row?.profile_status).toBe('active');

    await admin.auth.admin.deleteUser(user.userId);
  });
});
