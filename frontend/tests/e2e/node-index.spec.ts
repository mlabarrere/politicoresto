import { expect, test } from '@playwright/test';

/**
 * E2E — index public du graphe politique (`/n`).
 * Liste les Nœuds amorcés (partis/candidats) et permet de naviguer vers une fiche.
 */
test('index /n liste les acteurs et navigue vers une fiche', async ({
  page,
}) => {
  await page.goto('/n');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Explorer les acteurs' }),
  ).toBeVisible();

  const link = page.getByRole('link', { name: /Parti socialiste/ }).first();
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL('/n/ps');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Parti socialiste' }),
  ).toBeVisible();
});
