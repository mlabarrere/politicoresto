import { expect, test } from '@playwright/test';
import { signInAsSeedUser } from './helpers/auth';

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
  // Compas 2D (FR-40) : la restitution multi-axes s'affiche.
  await expect(page.getByText(/Ton compas politique/)).toBeVisible();
  await expect(page.getByTestId('boussole-compass-chart')).toBeVisible();
  // Anonyme : invitation à se connecter, pas de bouton d'enregistrement.
  await expect(page.getByText(/Connecte-toi pour suivre/)).toBeVisible();
});

test('boussole : un membre connecté enregistre sa position et la voit sur /me', async ({
  page,
}) => {
  await signInAsSeedUser(page);
  await page.goto('/boussole');

  await page
    .getByRole('button', { name: /^D.accord/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Voir mon résultat/ }).click();

  const save = page.getByRole('button', { name: /Enregistrer ma position/ });
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByText(/Position enregistrée/)).toBeVisible();

  // La trajectoire apparaît dans la section Boussole du profil.
  await page.goto('/me?section=boussole');
  await expect(
    page.getByRole('heading', { name: /Ta position dans le temps/ }),
  ).toBeVisible();
  await expect(page.getByTestId('boussole-trajectory-chart')).toBeVisible();
});
