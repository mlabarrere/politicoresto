/**
 * User Story — weighting demographics.
 *
 * /me?section=profile now carries an optional "Optionnel — aide au
 * redressement statistique des sondages" fieldset with sex, CSP and
 * education pickers. These feed the calibration pipeline's respondent
 * snapshot (see docs/weighting-architecture.md).
 *
 * This E2E confirms the owner can:
 *   - see the 3 optional pickers
 *   - submit the form with required fields + 2 of 3 optional fields
 *   - the values persist on user_private_political_profile
 *   - an unset optional field does NOT overwrite a previously-set one
 *     (partial updates are additive thanks to the RPC's COALESCE).
 */
import { expect, test } from '@playwright/test';
import { adminClient, SEED_USER } from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';

test.beforeEach(async () => {
  // Start each test with a blank weighting profile for the seed user.
  const admin = adminClient();
  await admin.from('user_private_political_profile').upsert(
    {
      user_id: SEED_USER.userId,
      date_of_birth: null,
      postal_code: null,
      sex: null,
      csp: null,
      education: null,
    },
    { onConflict: 'user_id' },
  );
});

test.describe('User Story — weighting demographics', () => {
  test('owner submits required + optional fields, all persist', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/me?section=profile');

    await expect(
      page.getByRole('heading', { name: /D[eé]mographie \(priv/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Optionnel — aide au redressement/),
    ).toBeVisible();

    // Required.
    await page.locator('input[name="date_of_birth"]').fill('1985-03-10');
    await page.locator('input[name="postal_code"]').fill('69001');
    // Optional.
    await page.locator('select[name="sex"]').selectOption('M');
    await page
      .locator('select[name="csp"]')
      .selectOption('cadres_professions_intellectuelles');
    await page.locator('select[name="education"]').selectOption('bac3_plus');

    const submit = page.getByRole('button', { name: /^Enregistrer$/ }).first();
    await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.status() < 400,
        { timeout: 10_000 },
      ),
      submit.click(),
    ]);

    // DB ground truth.
    const admin = adminClient();
    const { data, error } = await admin
      .from('user_private_political_profile')
      .select('date_of_birth, postal_code, sex, csp, education')
      .eq('user_id', SEED_USER.userId)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      date_of_birth: '1985-03-10',
      postal_code: '69001',
      sex: 'M',
      csp: 'cadres_professions_intellectuelles',
      education: 'bac3_plus',
    });
  });

  test('partial update: leaving an optional field empty does NOT wipe the existing value', async ({
    page,
  }) => {
    // Seed a full profile first.
    const admin = adminClient();
    await admin.from('user_private_political_profile').upsert(
      {
        user_id: SEED_USER.userId,
        date_of_birth: '1990-01-01',
        postal_code: '75001',
        sex: 'F',
        csp: 'employes',
        education: 'bac2',
      },
      { onConflict: 'user_id' },
    );

    await signInAsSeedUser(page);
    await page.goto('/me?section=profile');

    // Resubmit without touching the optional pickers — they default to
    // "— Non renseigné —" (value=''). The RPC's COALESCE should keep the
    // seeded sex/csp/education intact.
    await page.locator('input[name="date_of_birth"]').fill('1990-01-01');
    await page.locator('input[name="postal_code"]').fill('75001');
    // Change only education; leave sex + csp at empty.
    await page.locator('select[name="education"]').selectOption('');

    const submit = page.getByRole('button', { name: /^Enregistrer$/ }).first();
    await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.status() < 400,
        { timeout: 10_000 },
      ),
      submit.click(),
    ]);

    const { data } = await admin
      .from('user_private_political_profile')
      .select('sex, csp, education')
      .eq('user_id', SEED_USER.userId)
      .single();
    // sex + csp + education all unchanged (empty form value → COALESCE keeps existing).
    expect(data).toMatchObject({
      sex: 'F',
      csp: 'employes',
      education: 'bac2',
    });
  });
});
