import { expect, test } from '@playwright/test';

/**
 * E2E — Boussole (VAA). Page publique, single-player, sans auth.
 * Données seedées par la migration boussole (5 thèses + positions de partis).
 */
test('boussole : répondre à une thèse et obtenir un résultat', async ({
  page,
}) => {
  await page.goto('/boussole');

  await expect(
    page.getByRole('heading', { level: 1, name: /Quel parti me ressemble/ }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: /^D.accord/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Voir mon résultat/ }).click();

  await expect(page.getByText(/Le plus proche/)).toBeVisible();
});
